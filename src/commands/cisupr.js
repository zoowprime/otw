// src/commands/cisupr.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { deleteRecensement } = require('../recensementData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cisupr')
    .setDescription('Supprime le recensement civil d’un utilisateur')
    .addUserOption(option =>
      option.setName('target')
        .setDescription("L'utilisateur dont supprimer le recensement")
        .setRequired(true)
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const success = deleteRecensement(target.id);
    if (!success) {
      return interaction.reply({ content: "Aucun recensement trouvé pour cet utilisateur.", ephemeral: true });
    }
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("Recensement supprimé")
      .setDescription(`Le recensement de ${target.username} a été supprimé.`);
    return interaction.reply({ embeds: [embed] });
  },
};
