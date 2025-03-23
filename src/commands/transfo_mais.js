// src/commands/transfo_mais.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { transformSessions } = require('../transformSessions');
const { getUserWarehouse } = require('../warehouseData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transfo_mais')
    .setDescription('Transforme 40 unités de maïs brut en 20 unités de maïs transformé sur 10 minutes.'),
  async execute(interaction) {
    const userId = interaction.user.id;

    // Vérifier qu’il n’y a pas déjà une transformation en cours pour cet utilisateur
    if (transformSessions.has(userId)) {
      return interaction.reply({ content: "Vous avez déjà une session de transformation en cours.", ephemeral: false });
    }

    // Vérifier que l’utilisateur est dans le bon lieu (entrepôt, par exemple)
    if (!interaction.channel.name.toLowerCase().includes("entrepot")) {
      return interaction.reply({ content: "Vous devez être dans l'entrepôt pour transformer le maïs.", ephemeral: false });
    }

    // Vérifier les ressources
    const warehouse = getUserWarehouse(userId);
    if (warehouse.maisBrut < 40) {
      return interaction.reply({ content: "Vous n'avez pas assez de maïs brut (40 requis).", ephemeral: false });
    }

    // Retirer immédiatement les 40 maïs brut pour éviter les incohérences
    warehouse.maisBrut -= 40;

    // Préparer la session
    const totalIntervals = 5;           // 10 minutes / 2 minutes = 5 intervalles
    let currentInterval = 0;           // Combien d'intervalles déjà effectués
    const intervalDuration = 2 * 60 * 1000; // 2 minutes
    const channel = interaction.channel;

    // On crée un objet de session
    const sessionData = {
      type: 'transfo_mais',
      userId,
      currentInterval,
      totalIntervals,
      interval: null,
      timeout: null,
      channel
    };

    // Premier message en embed jaune
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffff00)
          .setDescription("Transformation du maïs lancée ! (10 minutes)")
      ],
      ephemeral: false
    });

    // Déclenchement toutes les 2 minutes
    sessionData.interval = setInterval(() => {
      sessionData.currentInterval++;
      // On ajoute +4 maïs transformés à chaque interval
      warehouse.maisTrans += 4;

      const embed = new EmbedBuilder()
        .setColor(0xffff00)
        .setDescription(
          `Le maïs est broyé puis séché... +4 unités de maïs transformé. ` +
          `(${sessionData.currentInterval}/${totalIntervals} intervalle(s) complété(s))`
        );
      channel.send({ embeds: [embed] });

      // Si on a atteint le nombre total d'intervalles (5), on arrête
      if (sessionData.currentInterval >= totalIntervals) {
        clearInterval(sessionData.interval);
        transformSessions.delete(userId);

        const endEmbed = new EmbedBuilder()
          .setColor(0xffff00)
          .setDescription("Transformation terminée ! Vous avez obtenu 20 unités de maïs transformé au total.");
        channel.send({ embeds: [endEmbed] });
      }
    }, intervalDuration);

    // Sécurité : si jamais on veut forcer l'arrêt au bout de 10 minutes + 1 seconde
    sessionData.timeout = setTimeout(() => {
      clearInterval(sessionData.interval);
      transformSessions.delete(userId);
    }, (totalIntervals * intervalDuration) + 10000);

    // Stocker la session
    transformSessions.set(userId, sessionData);
  }
};
