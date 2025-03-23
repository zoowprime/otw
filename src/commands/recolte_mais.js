// src/commands/recolte_mais.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { harvestSessions } = require('../harvestSessions');
const { getUserWarehouse } = require('../warehouseData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recolte_mais')
    .setDescription('Lance une session de récolte de maïs (20 minutes).'),
  async execute(interaction) {
    const userId = interaction.user.id;

    // Empêcher plusieurs récoltes simultanées
    if (harvestSessions.has(userId)) {
      return interaction.reply({ content: "Vous avez déjà une session de récolte en cours.", ephemeral: false });
    }

    // Configuration des durées
    const totalDuration = 20 * 60 * 1000;   // 20 minutes
    const intervalDuration = 2 * 60 * 1000; // 2 minutes

    // On crée un objet session partagé
    const sessionData = {
      type: 'mais',
      progress: 0,       // quantités déjà récoltées
      interval: null,    // ID du setInterval
      timeout: null,     // ID du setTimeout
      channel: interaction.channel
    };

    // Premier message en embed jaune
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffff00)
          .setDescription("Session de récolte de maïs lancée !")
      ],
      ephemeral: false
    });

    // Incrémentation toutes les 2 minutes
    sessionData.interval = setInterval(() => {
      sessionData.progress += 5;
      const embed = new EmbedBuilder()
        .setColor(0xffff00)
        .setDescription("Vous arrachez des épis de maïs à la sueur de votre front. +5 unités récoltées.");
      sessionData.channel.send({ embeds: [embed] });
    }, intervalDuration);

    // Fin automatique au bout de 20 minutes
    sessionData.timeout = setTimeout(() => {
      clearInterval(sessionData.interval);

      // Rendement final aléatoire (entre 40 et 60 unités)
      const finalYield = Math.floor(Math.random() * (60 - 40 + 1)) + 40;
      const embed = new EmbedBuilder()
        .setColor(0xffff00)
        .setDescription(`Session terminée ! Vous obtenez ${finalYield} unités de maïs.`);
      sessionData.channel.send({ embeds: [embed] });

      // Mise à jour du stock utilisateur
      const warehouse = getUserWarehouse(userId);
      warehouse.maisBrut += finalYield;

      harvestSessions.delete(userId);
    }, totalDuration);

    // On enregistre la session dans la Map
    harvestSessions.set(userId, sessionData);
  }
};
