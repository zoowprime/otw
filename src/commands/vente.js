const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");
const {
  getShopIdFromMember,
  getShopStock,
  decrementStock,
  getPrice,
  creditOwnerEnterpriseBank
} = require("../data/shopsData");
const { getOrCreateAccount, updateAccount } = require("../economyData");
const { addItem } = require("../data/inventoryData");

function debitPlayer(userId, amount) {
  const acc = getOrCreateAccount(userId);
  const c = acc.courant || { banque: 0, liquide: 0 };
  const total = c.banque + c.liquide;
  if (total < amount) return false;
  if (c.banque >= amount) c.banque -= amount;
  else {
    amount -= c.banque;
    c.banque = 0;
    c.liquide -= amount;
  }
  acc.courant = c;
  updateAccount(userId, acc);
  return true;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vente")
    .setDescription("Vendre un cheval ou une arme à un joueur")
    .addUserOption(o => o.setName("target").setDescription("Acheteur").setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser("target");
    if (target.bot)
      return interaction.reply({ content: "🤖 Impossible de vendre à un bot.", ephemeral: true });

    const shopId = getShopIdFromMember(interaction.member);
    if (!shopId)
      return interaction.reply({ content: "⛔ Tu n’as pas de boutique.", ephemeral: true });

    const isArmurerie = shopId.startsWith("armurerie_");
    const cat = isArmurerie ? "armes" : "chevaux";

    const stock = getShopStock(shopId);
    const items = Object.entries(stock[cat] || {});
    if (!items.length)
      return interaction.reply({ content: "📦 Stock vide.", ephemeral: true });

    const menu = new StringSelectMenuBuilder()
      .setCustomId("vente_item")
      .setPlaceholder("Choisis un article")
      .addOptions(items.slice(0, 25).map(([n, q]) => ({
        label: n,
        value: n,
        description: `Stock : ${q}`,
        emoji: isArmurerie ? "🔫" : "🐎"
      })));

    const msg = await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x16a085).setTitle(`🧾 Vente — ${shopId}`).setDescription(`Choisis un article à vendre à ${target.username}.`).setFooter({ text: "OTW Économie" })],
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true
    });

    const sel = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 60000 }).catch(() => null);
    if (!sel) return;

    const itemName = sel.values[0];
    const unitPrice = getPrice(shopId, cat, itemName);
    if (!unitPrice)
      return sel.update({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("⛔ Pas de prix défini").setDescription(`Définis un prix pour **${itemName}** avec /prix définir`).setFooter({ text: "OTW Économie" })], components: [] });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("vente_accept").setLabel("Accepter").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("vente_refuse").setLabel("Refuser").setStyle(ButtonStyle.Danger)
    );

    const buyerEmbed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle("🧾 Proposition de vente")
      .setDescription(`**${interaction.user.username}** te propose **${itemName}** pour **$${unitPrice.toFixed(2)}**.\nAccepter ?`)
      .setFooter({ text: "OTW Économie" });

    const buyer = await interaction.client.users.fetch(target.id).catch(() => null);
    await buyer?.send({ embeds: [buyerEmbed], components: [row] }).catch(() => {});

    await sel.update({ embeds: [new EmbedBuilder().setColor(0xf39c12).setTitle("Attente du client...").setFooter({ text: "OTW Économie" })], components: [] });

    const collector = interaction.client.on("interactionCreate", async i => {
      if (!["vente_accept", "vente_refuse"].includes(i.customId)) return;
      if (i.user.id !== target.id) return;

      if (i.customId === "vente_refuse") {
        await i.update({ embeds: [new EmbedBuilder().setColor(0x95a5a6).setTitle("❌ Vente refusée").setFooter({ text: "OTW Économie" })], components: [] });
        interaction.followUp({ content: `❌ Vente refusée par ${target.username}.`, ephemeral: false });
        collector.stop();
        return;
      }

      if (!debitPlayer(target.id, unitPrice)) {
        await i.update({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("⛔ Fonds insuffisants").setFooter({ text: "OTW Économie" })], components: [] });
        return;
      }

      creditOwnerEnterpriseBank(shopId, unitPrice);
      decrementStock(shopId, cat, itemName, 1);
      addItem(target.id, cat, itemName, 1);

      await i.update({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("✅ Achat validé").setDescription(`Tu as reçu **${itemName}**.`).setFooter({ text: "OTW Économie" })], components: [] });
      interaction.followUp({ content: `💰 ${interaction.user.username} a vendu **${itemName}** à ${target.username} pour **$${unitPrice.toFixed(2)}**.`, ephemeral: false });
    });
  }
};
