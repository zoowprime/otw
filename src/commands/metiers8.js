// src/commands/metiers8.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('metiers8')
    .setDescription('Affiche la liste des métiers RP disponibles avec leurs rémunérations.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📜 Liste des métiers')
      .setColor(0xFFFFFF)
