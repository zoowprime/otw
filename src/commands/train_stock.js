// src/commands/train_stock.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getSummaryLines } = require('../interaction/trainStock');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('train_stock')
    .setDescription('Voir le stock actuel du train (Tetsuryu Freight Co.)'),

  async execute(interaction) {
    const { chev, arm } = getSummaryLines();

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🚂 Stock du Train — Tetsuryu Freight Co.')
      .addFields(
        { name: '🐎 Chevaux', value: chev, inline: false },
        { name: '🔫 Armes',   value: arm,  inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
