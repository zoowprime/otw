// src/commands/recolte_plantes.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { harvestSessions } = require('../harvestSessions');
const { getUserWarehouse } = require('../warehouseData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recolte_plantes')
    .setDescription('Lance une session de récolte de plantes (Vanille, Menthe, Mûre, Pommes, Framboises, Pêche, Blé) (20 minutes).'),
  async execute(interaction) {
    const userId = interaction.user.id;
    if (harvestSessions.has(userId)) {
      return interaction.reply({ content: "Vous avez déjà une session de récolte en cours.", ephemeral: false });
    }
    const totalDuration = 20 * 60 * 1000; // 20 minutes
    const intervalDuration = 2 * 60 * 1000; // 2 minutes
    const channel = interaction.channel;
    
    // Liste des ingrédients à récolter
    const ingredients = ["Vanille", "Menthe", "Mûre", "Pommes", "Framboises", "Pêche", "Blé"];
    // Initialisation de la progression pour chaque ingrédient
    const progress = {};
    ingredients.forEach(ing => progress[ing] = 0);
    
    const sessionData = {
      type: 'plantes',
      progress, // Objet contenant la progression pour chaque ingrédient
      interval: null,
      timeout: null,
      channel
    };

    // Message initial dans un embed couleur "blé"
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xF5DEB3)
          .setDescription("Session de récolte de plantes lancée ! Récoltez : Vanille, Menthe, Mûre, Pommes, Framboises, Pêche et Blé.")
      ],
      ephemeral: false
    });

    // À chaque intervalle (2 minutes), on ajoute +2 unités à chaque ingrédient
    sessionData.interval = setInterval(() => {
      ingredients.forEach(ing => {
        sessionData.progress[ing] += 2;
      });
      let msg = "Vous récoltez vos plantes :\n";
      ingredients.forEach(ing => {
        msg += `${ing} +2 unités (Total: ${sessionData.progress[ing]})\n`;
      });
      const embed = new EmbedBuilder()
        .setColor(0xF5DEB3)
        .setDescription(msg);
      channel.send({ embeds: [embed] });
    }, intervalDuration);

    // À la fin de la session, on ajoute la progression totale au stock du joueur
    sessionData.timeout = setTimeout(() => {
      clearInterval(sessionData.interval);
      const warehouse = getUserWarehouse(userId);
      // Si la catégorie "plantes" n'existe pas, on l'initialise
      if (!warehouse.plantes) {
        warehouse.plantes = {};
      }
      ingredients.forEach(ing => {
        if (!warehouse.plantes[ing]) warehouse.plantes[ing] = 0;
        warehouse.plantes[ing] += sessionData.progress[ing];
      });
      let msg = "Session terminée ! Vous avez récolté :\n";
      ingredients.forEach(ing => {
        msg += `${ing}: ${sessionData.progress[ing]} unités\n`;
      });
      const embed = new EmbedBuilder()
        .setColor(0xF5DEB3)
        .setDescription(msg);
      channel.send({ embeds: [embed] });
      harvestSessions.delete(userId);
    }, totalDuration);

    harvestSessions.set(userId, sessionData);
  }
};
