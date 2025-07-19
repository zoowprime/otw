// src/commands/stopbraquage.js
const {
  SlashCommandBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stopbraquage')
    .setDescription('Interrompt votre braquage en cours'),

  async execute(interaction) {
    const client = interaction.client;
    const sess   = client.heistSessions.get(interaction.user.id);
    if (!sess) {
      return interaction.reply({
        content: '❌ Vous n’avez pas de braquage actif.',
        ephemeral: true
      });
    }
    clearInterval(sess.intervalId);
    clearTimeout(sess.timeoutId);
    client.heistSessions.delete(interaction.user.id);

    await interaction.reply({
      content: '⏹️ Votre braquage a bien été arrêté.',
      ephemeral: false
    });
  }
};
