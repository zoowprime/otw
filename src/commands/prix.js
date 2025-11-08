const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType
} = require("discord.js");
const { WEAPONS } = require("../data/catalogWeapons");
const { HORSE_GROUPS } = require("../data/catalogHorses");
const {
  getShopIdFromMember,
  setPrice,
  getAllPrices,
  resetPrices
} = require("../data/shopsData");

const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;

function listAllHorses() {
  const out = [];
  for (const g of HORSE_GROUPS)
    for (const [n, _] of g.items) out.push({ name: n, cat: "chevaux", emoji: "🐎" });
  return out;
}

function formatPrices(p) {
  let out = "";
  for (const [cat, obj] of Object.entries(p || {})) {
    out += `**${cat.toUpperCase()}**\n`;
    for (const [name, price] of Object.entries(obj || {}))
      out += `• ${name} — **$${price.toFixed(2)}**\n`;
    out += "\n";
  }
  return out || "_Aucun prix défini._";
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("prix")
    .setDescription("Gérer les prix de ton commerce")
    .addSubcommand(sc =>
      sc.setName("definir").setDescription("Définir le prix d’un item"))
    .addSubcommand(sc =>
      sc.setName("modifier").setDescription("Modifier un prix déjà défini"))
    .addSubcommand(sc =>
      sc.setName("voir").setDescription("Voir les prix de ton commerce"))
    .addSubcommand(sc =>
      sc
        .setName("reset")
        .setDescription("Réinitialiser les prix d’un commerce (STAFF)")
        .addStringOption(o =>
          o.setName("commerce").setDescription("ID du commerce").setRequired(true)
        )
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "reset") {
      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
        return interaction.reply({ content: "⛔ Réservé au staff.", ephemeral: true });
      const shopId = interaction.options.getString("commerce");
      resetPrices(shopId);
      return interaction.reply({
        content: `✅ Prix réinitialisés pour **${shopId}**.`,
        ephemeral: true
      });
    }

    const shopId = getShopIdFromMember(interaction.member);
    if (!shopId)
      return interaction.reply({
        content: "⛔ Tu ne fais partie d’aucune boutique.",
        ephemeral: true
      });

    if (sub === "voir") {
      const prices = getAllPrices(shopId);
      const embed = new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle(`🏷️ Prix — ${shopId}`)
        .setDescription(formatPrices(prices))
        .setFooter({ text: "OTW Économie" });
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // Définir / Modifier
    const armes = WEAPONS.map(w => ({ name: w.name, cat: "armes", emoji: "🔫" }));
    const chevaux = listAllHorses();

    const catMenu = new StringSelectMenuBuilder()
      .setCustomId("prix_cat")
      .setPlaceholder("Choisis une catégorie")
      .addOptions([
        { label: "Armes", value: "armes", emoji: "🔫" },
        { label: "Chevaux", value: "chevaux", emoji: "🐎" }
      ]);

    const msg = await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2980b9)
          .setTitle(`🏷️ ${sub === "definir" ? "Définir" : "Modifier"} un prix`)
          .setDescription("Choisis une **catégorie**, puis un **item**, puis indique le prix.")
          .setFooter({ text: "OTW Économie" })
      ],
      components: [new ActionRowBuilder().addComponents(catMenu)],
      ephemeral: true
    });

    const selCat = await msg.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      time: 60000
    }).catch(() => null);
    if (!selCat) return;
    const cat = selCat.values[0];
    const list = cat === "armes" ? armes : chevaux;

    const itemMenu = new StringSelectMenuBuilder()
      .setCustomId("prix_item")
      .setPlaceholder("Choisis un item")
      .addOptions(list.map(i => ({
        label: i.name,
        value: JSON.stringify({ cat, name: i.name }),
        emoji: i.emoji
      })));

    const msg2 = await selCat.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle("Choisis un item")
          .setFooter({ text: "OTW Économie" })
      ],
      components: [new ActionRowBuilder().addComponents(itemMenu)]
    });

    const selItem = await msg2.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      time: 60000
    }).catch(() => null);
    if (!selItem) return;

    const { cat: catKey, name } = JSON.parse(selItem.values[0]);

    await selItem.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf39c12)
          .setTitle(`💰 Prix pour ${name}`)
          .setDescription("Tape le prix en dollars (ex: 25 ou 25.5)")
          .setFooter({ text: "OTW Économie" })
      ],
      components: []
    });

    const collected = await interaction.channel.awaitMessages({
      filter: m => m.author.id === interaction.user.id,
      max: 1,
      time: 60000
    }).catch(() => null);
    const input = collected?.first()?.content?.replace("$", "").replace(",", ".");
    const val = parseFloat(input);
    if (!val || val <= 0)
      return interaction.followUp({ content: "❌ Prix invalide.", ephemeral: true });

    setPrice(shopId, catKey, name, val);
    return interaction.followUp({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("✅ Prix enregistré")
          .setDescription(`**${name}** → **$${val.toFixed(2)}**`)
          .setFooter({ text: "OTW Économie" })
      ],
      ephemeral: false
    });
  }
};
