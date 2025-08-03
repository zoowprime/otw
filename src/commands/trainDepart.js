// src/commands/trainDepart.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('train_depart')
    .setDescription('Annonce le départ d’un train de marchandises ou de passagers.')
    .addStringOption(opt =>
      opt
        .setName('ville')
        .setDescription('Ville de départ')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('destination')
        .setDescription('Ville d’arrivée')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('marchandises')
        .setDescription('Liste des marchandises à bord')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt
        .setName('eta')
        .setDescription("Heure estimée d'arrivée (ex : 18h30)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const depart   = interaction.options.getString('ville');
    const arrivee  = interaction.options.getString('destination');
    const goods    = interaction.options.getString('marchandises') || 'Caisse d’armes, minerais, provisions';
    const eta      = interaction.options.getString('eta')         || 'XXhXX';
    const pilote   = interaction.user; // responsable à bord = l’auteur de la commande

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🚂 Départ de train en cours')
      .setDescription(
        `Le train **Tetsuryū Freight** quitte la gare de **${depart}** à destination de **${arrivee}**.`
      )
      .addFields(
        { name: '📦 Marchandises',          value: goods, inline: false },
        { name: '👤 Responsable à bord',    value: pilote.toString(), inline: true },
        { name: '⏱️ ETA',                   value: eta, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};