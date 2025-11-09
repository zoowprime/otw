// src/commands/inventaire.js
const {
  SlashCommandBuilder, EmbedBuilder, AttachmentBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, UserSelectMenuBuilder,
  ComponentType, MessageFlags
} = require("discord.js");

const { renderInventoryGrid } = require("../utils/inventoryRenderer");
const { bar } = require("../utils/progressBars");
const {
  getUser, totalWeight, transferItem, consumeItem, removeItem
} = require("../data/inventoryStore");
const catalog = require("../data/itemCatalog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inventaire")
    .setDescription("Ouvre ta sacoche : visuel + faim/soif + Donner / Utiliser / Jeter"),

  async execute(interaction) {
    const uid = interaction.user.id;
    const state = getUser(uid);
    const weight = totalWeight(state.items);

    const buffer = await renderInventoryGrid(state.items);
    const file = new AttachmentBuilder(buffer, { name: "sacoche_render.png" });

    const hungerLine = `🍖 **Faim**  : ${bar(state.hunger, 20)}`;
    const thirstLine = `💧 **Soif** : ${bar(state.thirst, 20)}`;
    const weightLine = `**Weight:** ${weight.toFixed(2)} / 60.00`;

    const emb = new EmbedBuilder()
      .setColor(0x2b1c10)
      .setTitle(`Sacoche de <@${uid}>`)
      .setDescription(`${weightLine}\n\n${hungerLine}\n${thirstLine}`)
      .setImage("attachment://sacoche_render.png")
      .setFooter({ text: "OTW • Inventaire" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`inv_give:${uid}`).setStyle(ButtonStyle.Success).setLabel("Donner").setEmoji("🟩"),
      new ButtonBuilder().setCustomId(`inv_use:${uid}`).setStyle(ButtonStyle.Primary).setLabel("Utiliser").setEmoji("🟦"),
      new ButtonBuilder().setCustomId(`inv_drop:${uid}`).setStyle(ButtonStyle.Danger).setLabel("Jeter").setEmoji("🟥"),
    );

    await interaction.reply({ embeds:[emb], files:[file], components:[row] });

    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ time: 60_000 });

    collector.on("collect", async (i) => {
      const ownerId = i.customId.split(":")[1];
      if (ownerId !== uid) {
        return i.reply({ content:"Ce panneau ne t'appartient pas.", flags: MessageFlags.Ephemeral });
      }

      // Donner
      if (i.customId.startsWith("inv_give:")) {
        const st = getUser(uid);
        if (!st.items.length) return i.reply({ content:"Ta sacoche est vide.", flags: MessageFlags.Ephemeral });

        const options = st.items.map(it => ({
          label: (catalog[it.name]?.label || it.name).slice(0, 100),
          value: it.name,
          description: `x${it.quantity ?? 1} • ${(catalog[it.name]?.weight ?? it.weight ?? 0)}kg`
        })).slice(0, 25);

        const rowSel = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`give_select:${uid}`)
            .setPlaceholder("Sélectionne un item à donner")
            .addOptions(options)
        );
        await i.reply({ content:"Choisis l’item à donner :", components:[rowSel], flags: MessageFlags.Ephemeral });

        const menuInt = await i.fetchReply();
        const sel = await menuInt.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 30_000 }).catch(()=>null);
        if (!sel) return;
        const itemName = sel.values[0];

        const userRow = new ActionRowBuilder().addComponents(
          new UserSelectMenuBuilder().setCustomId(`give_user:${uid}:${itemName}`).setPlaceholder("Choisir le joueur cible").setMaxValues(1)
        );
        await sel.update({ content:`Item: **${catalog[itemName]?.label || itemName}**. Choisis le joueur cible :`, components:[userRow] });

        const sel2 = await menuInt.awaitMessageComponent({ componentType: ComponentType.UserSelect, time: 30_000 }).catch(()=>null);
        if (!sel2) return;
        const targetId = sel2.values[0];

        const it = getUser(uid).items.find(x => x.name === itemName);
        const qMax = it?.quantity ?? 1;

        let qty = 1;
        if ((catalog[itemName]?.stackable ?? true) && qMax > 1) {
          const qtyOpts = Array.from({length: Math.min(qMax, 25)}, (_,k)=>({ label:`x${k+1}`, value:String(k+1) }));
          const rowQ = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId(`give_qty:${uid}:${itemName}:${targetId}`).setPlaceholder("Quantité à donner").addOptions(qtyOpts)
          );
          await sel2.update({ content:`Combien donner ? (max ${qMax})`, components:[rowQ] });
          const selQ = await menuInt.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 30_000 }).catch(()=>null);
          if (!selQ) return;
          qty = parseInt(selQ.values[0], 10);
          await selQ.update({ content:`Transfert en cours…`, components:[] });
        } else {
          await sel2.update({ content:`Transfert en cours…`, components:[] });
        }

        const res = transferItem(uid, targetId, itemName, qty);
        if (!res.ok) return i.followUp({ content:`❌ ${res.reason}`, flags: MessageFlags.Ephemeral });
        return i.followUp({ content:`✅ Donné **x${res.qty} ${catalog[itemName]?.label || itemName}** à <@${targetId}>.`, flags: MessageFlags.Ephemeral });
      }

      // Utiliser
      if (i.customId.startsWith("inv_use:")) {
        const st = getUser(uid);
        const consumables = st.items.filter(it => catalog[it.name]?.consumable);
        if (!consumables.length) return i.reply({ content:"Tu n’as aucun consommable.", flags: MessageFlags.Ephemeral });

        const options = consumables.map(it => {
          const meta = catalog[it.name];
          return { label: `${meta.emoji || ""} ${(meta.label || it.name)}`.trim().slice(0, 100), value: it.name, description: `x${it.quantity ?? 1}` };
        }).slice(0,25);

        const rowSel = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder().setCustomId(`use_select:${uid}`).setPlaceholder("Choisis ce que tu veux consommer").addOptions(options)
        );
        await i.reply({ content:"Choisis un consommable :", components:[rowSel], flags: MessageFlags.Ephemeral });

        const menuInt = await i.fetchReply();
        const sel = await menuInt.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 30_000 }).catch(()=>null);
        if (!sel) return;
        const itemName = sel.values[0];

        const res = consumeItem(uid, itemName, 1);
        if (!res.ok) return sel.update({ content:`❌ ${res.reason}`, components:[] });

        const meta = catalog[itemName];
        const emb = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle(`${meta.emoji || "✅"} ${meta.label || itemName}`)
          .setDescription(
            meta.effect?.thirstDelta ? "Vous prenez une gorgée de votre bouteille. La gorge se réchauffe, l’esprit s’éclaircit." :
            meta.effect?.hungerDelta ? "Vous ouvrez la conserve et mangez calmement. L’estomac se remplit." :
            "Vous utilisez l’objet avec soin."
          );
        return sel.update({ content:"", embeds:[emb], components:[] });
      }

      // Jeter
      if (i.customId.startsWith("inv_drop:")) {
        const st = getUser(uid);
        if (!st.items.length) return i.reply({ content:"Ta sacoche est vide.", flags: MessageFlags.Ephemeral });

        const options = st.items.map(it => ({
          label: (catalog[it.name]?.label || it.name).slice(0, 100),
          value: it.name,
          description: `x${it.quantity ?? 1}`
        })).slice(0, 25);

        const rowSel = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder().setCustomId(`drop_select:${uid}`).setPlaceholder("Quel objet jeter ?").addOptions(options)
        );
        await i.reply({ content:"Sélectionne l’objet à jeter :", components:[rowSel], flags: MessageFlags.Ephemeral });

        const menuInt = await i.fetchReply();
        const sel = await menuInt.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 30_000 }).catch(()=>null);
        if (!sel) return;
        const itemName = sel.values[0];
        const it = getUser(uid).items.find(x => x.name === itemName);
        const qMax = it?.quantity ?? 1;

        let qty = 1;
        if ((catalog[itemName]?.stackable ?? true) && qMax > 1) {
          const qtyOpts = Array.from({length: Math.min(qMax, 25)}, (_,k)=>({ label:`x${k+1}`, value:String(k+1) }));
          const rowQ = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId(`drop_qty:${uid}:${itemName}`).setPlaceholder("Quantité à jeter").addOptions(qtyOpts)
          );
          await sel.update({ content:`Combien jeter ? (max ${qMax})`, components:[rowQ] });
          const selQ = await menuInt.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 30_000 }).catch(()=>null);
          if (!selQ) return;
          qty = parseInt(selQ.values[0], 10);
          await selQ.update({ content:`…`, components:[] });
        } else {
          await sel.update({ content:`…`, components:[] });
        }

        const r = removeItem(uid, itemName, qty);
        if (!r.ok) return i.followUp({ content:`❌ ${r.reason}`, flags: MessageFlags.Ephemeral });
        const label = catalog[itemName]?.label || itemName;
        return i.followUp({ content:`🗑️ Vous avez jeté **x${qty} ${label}** au sol.`, flags: MessageFlags.Ephemeral });
      }
    });
  }
};
