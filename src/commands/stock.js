// src/commands/stock.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getShopIdFromMember, getShopStock } = require('../data/shopsData');

function renderStock(stock){
  const sec = ['armes','chevaux','charrettes'];
  const lines = [];
  for (const s of sec) {
    const entries = Object.entries(stock[s]||{});
    lines.push(`**${s.toUpperCase()}**`);
    if (!entries.length) lines.push('_Vide_');
    else for (const [name, qty] of entries) lines.push(`• ${name} — **x${qty}**`);
    lines.push('');
  }
  return lines.join('\n');
}

module.exports = {
  data: new SlashCommandBuilder().setName('stock').setDescription('Voir le stock de votre boutique'),
  async execute(interaction){
    const shopId = getShopIdFromMember(interaction.member);
    if (!shopId) return interaction.reply({ content: '⛔ Tu ne fais partie d’aucune boutique.', ephemeral: true });
    const stock = getShopStock(shopId);
    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle(`📦 Stock — ${shopId}`)
      .setDescription(renderStock(stock))
      .setFooter({ text: 'OTW Économie' });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
