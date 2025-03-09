// src/commands/ciafficher.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRecensement } = require('../recensementData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ciafficher')
    .setDescription('Affiche le recensement civil d’un utilisateur')
    .addUserOption(option =>
      option.setName('target')
        .setDescription("L'utilisateur dont afficher le recensement")
        .setRequired(true)
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const recensement = getRecensement(target.id);
    if (!recensement) {
      return interaction.reply({ content: "Aucun recensement trouvé pour cet utilisateur.", ephemeral: true });
    }
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("Recensement civil de l'état de Belleshore")
      .setDescription(
        `**Nom :** ${recensement.nom}\n` +
        `**Prénom :** ${recensement.prenom}\n` +
        `**Télégramme :** <@${recensement.telegramme}>\n` +
        `**Sexe :** ${recensement.sexe}\n` +
        `**Date de naissance :** ${recensement.datenaissance}\n` +
        `**Lieu de naissance :** ${recensement.lieunais}\n` +
        `**Nationalité :** ${recensement.nationalite}`
      )
      .setImage(recensement.photo);
    return interaction.reply({ embeds: [embed] });
  },
};
