// src/commands/livraison.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getSummaryLines } = require('../interaction/trainStock');

const GARES = [
  'Gare de Rhodes',
  'Gare de Valentine',
  'Gare de Saint-Denis',
  'Docks de Saint-Denis',
  'Saloon de Valentine',
  'Saloon de Rhodes',
  'Emerald Ranch'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('livraison')
    .setDescription('Annoncer une livraison du train vers une gare')
    .addStringOption(o =>
      o.setName('gare')
        .setDescription('Gare de livraison')
        .setRequired(true)
        .addChoices(...GARES.map(g => ({ name: g, value: g })))
    ),

  async execute(interaction) {
    const gare = interaction.options.getString('gare', true);
    const { chev, arm } = getSummaryLines();
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🚂 Livraison en cours')
      .setDescription(`**${interaction.user}** effectue une livraison à **${gare}**.`)
      .addFields(
        { name: '🐎 Chevaux', value: chev, inline: false },
        { name: '🔫 Armes',   value: arm,  inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
