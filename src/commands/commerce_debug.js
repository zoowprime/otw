// src/commands/commerce_debug.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getShopIdFromMember, envVarForShop, getOwnerId } = require('../data/shopsData');

function mask(v) {
  if (!v) return '(vide / non défini)';
  const s = String(v);
  if (s.length <= 6) return '*'.repeat(s.length);
  return s.slice(0, 3) + '***' + s.slice(-3);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('commerce_debug')
    .setDescription('Debug: montre le shop détecté et la variable PATRON_* lue'),
  async execute(interaction) {
    const shopId = getShopIdFromMember(interaction.member);
    const varName = shopId ? envVarForShop(shopId) : null;
    const ownerId = shopId ? getOwnerId(shopId) : null;

    const emb = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🧪 Commerce Debug')
      .setDescription(
        [
          `• **Utilisateur**: <@${interaction.user.id}>`,
          `• **Shop détecté**: ${shopId || '(aucun)'}`,
          `• **Variable attendue**: ${varName || '(n/a)'}`,
          `• **Valeur lue**: ${ownerId ? mask(ownerId) : '(vide / non défini)'}`,
        ].join('\n')
      )
      .setFooter({ text: 'OTW Économie' });

    await interaction.reply({ embeds: [emb], ephemeral: true });
  }
};
