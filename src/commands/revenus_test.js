// src/commands/revenus_test.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { _internal } = require('../events/passiveRevenue');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('revenus_test')
    .setDescription('Génère immédiatement les revenus passifs (test).'),

  async execute(interaction) {
    try {
      // IMPORTANT : markRun = false => n’impacte PAS le calendrier 18:00
      await _internal.generateRevenues(interaction.client, { markRun: false });
      await interaction.reply({ content: '⚡ Revenus générés (test).', flags: MessageFlags.Ephemeral });
    } catch (e) {
      console.error('revenus_test:', e);
      await interaction.reply({ content: '❌ Erreur lors de la génération.', flags: MessageFlags.Ephemeral });
    }
  }
};
