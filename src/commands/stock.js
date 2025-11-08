const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getShopIdFromMember, getShopStock, getAllPrices } = require("../data/shopsData");

function renderStock(stock, prices) {
  const lines = [];
  for (const cat of Object.keys(stock || {})) {
    lines.push(`**${cat.toUpperCase()}**`);
    const items = Object.entries(stock[cat] || {});
    if (!items.length) lines.push("_Vide_");
    else for (const [name, qty] of items)
      lines.push(`• ${name} — **x${qty}** — 💲${prices?.[cat]?.[name] ?? "?"}`);
    lines.push("");
  }
  return lines.join("\n");
}

module.exports = {
  data: new SlashCommandBuilder().setName("stock").setDescription("Voir le stock de ton commerce"),
  async execute(interaction) {
    const shopId = getShopIdFromMember(interaction.member);
    if (!shopId)
      return interaction.reply({ content: "⛔ Tu n’as pas de boutique.", ephemeral: true });

    const stock = getShopStock(shopId);
    const prices = getAllPrices(shopId);

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle(`📦 Stock — ${shopId}`)
      .setDescription(renderStock(stock, prices))
      .setFooter({ text: "OTW Économie" });

    return interaction.reply({ embeds: [embed], ephemeral: false });
  }
};
