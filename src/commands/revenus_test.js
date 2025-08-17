// src/commands/revenus_test.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { _internal } = require('../events/passiveRevenue');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('revenus_test')
    .setDescription('Génère immédiatement les revenus passifs (test, n’affecte pas le timer).'),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await _internal.generateRevenues(interaction.client, { markRun: false }); // n’écrit pas le “lastRun”
      await interaction.editReply('⚡ Revenus générés (test).');
    } catch (e) {
      console.error('revenus_test:', e);
      if (interaction.deferred) {
        await interaction.editReply('❌ Erreur lors de la génération.');
      } else {
        await interaction.reply({ content: '❌ Erreur lors de la génération.', flags: MessageFlags.Ephemeral });
      }
    }
  }
};
