const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType
} = require("discord.js");
const { getShopStock } = require("../data/shopsData");

const SHOPS = [
  { label: "Armurerie Saint-Denis", value: "armurerie_sd", emoji: "🏛️" },
  { label: "Armurerie Rhodes", value: "armurerie_rhodes", emoji: "🏛️" },
  { label: "Armurerie Annesburg", value: "armurerie_ab", emoji: "🏭" },
  { label: "Écurie Saint-Denis", value: "ecurie_sd", emoji: "🐎" },
  { label: "Écurie Rhodes", value: "ecurie_rhodes", emoji: "🐎" },
  { label: "Écurie Van Horn", value: "ecurie_vh", emoji: "🐎" }
];

function renderStock(stock) {
  const lines = [];
  for (const [cat, data] of Object.entries(stock || {})) {
    lines.push(`**${cat.toUpperCase()}**`);
    const items = Object.entries(data);
    if (!items.length) lines.push("_Rien en vitrine._");
    else for (const [name, qty] of items)
      lines.push(`• ${name} — **x${qty}**`);
    lines.push("");
  }
  return lines.join("\n");
}

module.exports = {
  data: new SlashCommandBuilder().setName("catalogue").setDescription("Voir les stocks publics des commerces"),
  async execute(interaction) {
    const menu = new StringSelectMenuBuilder().setCustomId("catalog_shop").setPlaceholder("Choisis une boutique").addOptions(SHOPS);
    const msg = await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x1abc9c).setTitle("🗂️ Catalogue Public").setDescription("Choisis une boutique pour voir son stock.").setFooter({ text: "OTW Économie" })],
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true
    });

    const sel = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 60000 }).catch(() => null);
    if (!sel) return;
    const stock = getShopStock(sel.values[0]);

    await sel.update({
      embeds: [new EmbedBuilder().setColor(0x1abc9c).setTitle(`🗂️ Catalogue — ${sel.values[0]}`).setDescription(renderStock(stock)).setFooter({ text: "OTW Économie" })],
      components: []
    });
  }
};
