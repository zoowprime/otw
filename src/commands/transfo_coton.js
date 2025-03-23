// src/commands/transfo_coton.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { transformSessions } = require('../transformSessions');
const { getUserWarehouse } = require('../warehouseData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transfo_coton')
    .setDescription('Transforme 30 unités de coton brut en 15 unités de coton utilisable sur 10 minutes.'),
  async execute(interaction) {
    const userId = interaction.user.id;

    if (transformSessions.has(userId)) {
      return interaction.reply({ content: "Vous avez déjà une session de transformation en cours.", ephemeral: false });
    }

    // Vérifier que l'utilisateur est dans l'entrepôt ou le bâtiment textile
    const channelName = interaction.channel.name.toLowerCase();
    if (!channelName.includes("entrepot") && !channelName.includes("textile")) {
      return interaction.reply({ content: "Vous devez être dans l'entrepôt ou un bâtiment textile pour transformer le coton.", ephemeral: false });
    }

    // Vérifier les ressources
    const warehouse = getUserWarehouse(userId);
    if (warehouse.cotonBrut < 30) {
      return interaction.reply({ content: "Vous n'avez pas assez de coton brut (30 requis).", ephemeral: false });
    }

    // Retirer immédiatement les 30 coton brut
    warehouse.cotonBrut -= 30;

    // Configurer la session
    const totalIntervals = 5;             // 10 minutes / 2 minutes = 5 intervalles
    let currentInterval = 0;
    const intervalDuration = 2 * 60 * 1000; // 2 minutes
    const channel = interaction.channel;

    const sessionData = {
      type: 'transfo_coton',
      userId,
      currentInterval,
      totalIntervals,
      interval: null,
      timeout: null,
      channel
    };

    // Message initial en embed blanc
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffffff)
          .setDescription("Transformation du coton lancée ! (10 minutes)")
      ],
      ephemeral: false
    });

    // Interval toutes les 2 minutes
    sessionData.interval = setInterval(() => {
      sessionData.currentInterval++;
      // Chaque interval, +3 coton transformés
      warehouse.cotonTrans += 3;

      const embed = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription(
          `Vous nettoyez, filez et emballez le coton... +3 unités de coton utilisable. ` +
          `(${sessionData.currentInterval}/${totalIntervals} intervalle(s))`
        );
      channel.send({ embeds: [embed] });

      // Fin si on atteint 5 intervalles
      if (sessionData.currentInterval >= totalIntervals) {
        clearInterval(sessionData.interval);
        transformSessions.delete(userId);

        const endEmbed = new EmbedBuilder()
          .setColor(0xffffff)
          .setDescription("Transformation terminée ! Vous avez obtenu 15 unités de coton utilisable au total.");
        channel.send({ embeds: [endEmbed] });
      }
    }, intervalDuration);

    // Sécurité : on arrête tout après la durée max + 10 secondes
    sessionData.timeout = setTimeout(() => {
      clearInterval(sessionData.interval);
      transformSessions.delete(userId);
    }, (totalIntervals * intervalDuration) + 10000);

    transformSessions.set(userId, sessionData);
  }
};
