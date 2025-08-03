// src/commands/repriseBien.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reprise_bien')
    .setDescription('Annonce la reprise d’un bien immobilier.')
    .addStringOption(opt =>
      opt
        .setName('client')
        .setDescription('Nom du client dont le bien est repris')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('raison')
        .setDescription('Raison de la reprise (ex : non-paiement)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('lieu')
        .setDescription('Localisation du bien')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('agent')
        .setDescription('Nom de l’agent immobilier')
        .setRequired(true)
    ),

  async execute(interaction) {
    const clientName = interaction.options.getString('client');
    const raison     = interaction.options.getString('raison');
    const lieu       = interaction.options.getString('lieu');
    const agent      = interaction.options.getString('agent');
    const entreprise = 'Shinsei Properties';

    const embed = new EmbedBuilder()
      .setColor(0xFF3333)
      .setTitle('🏠 Reprise de bien effectuée')
      .setDescription(
        `⚠️ Suite à **${raison}**, le bien situé à **${lieu}** a été repris par **${entreprise}**.`
      )
      .addFields(
        { name: '• Client concerné',      value: clientName, inline: true },
        { name: '• Agent immobilier',     value: agent,      inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};