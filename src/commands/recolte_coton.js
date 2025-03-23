// src/commands/recolte_coton.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { harvestSessions } = require('../harvestSessions');
const { getUserWarehouse } = require('../warehouseData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recolte_coton')
    .setDescription('Lance une session de récolte de coton (20 minutes).'),
  async execute(interaction) {
    const userId = interaction.user.id;

    if (harvestSessions.has(userId)) {
      return interaction.reply({ content: "Vous avez déjà une session de récolte en cours.", ephemeral: false });
    }

    // Durées (20 minutes totales, message toutes les 2 minutes)
    const totalDuration = 20 * 60 * 1000;    // 20 minutes
    const intervalDuration = 2 * 60 * 1000;  // 2 minutes

    // On crée un objet session, stocké dans harvestSessions
    const sessionData = {
      type: 'coton',
      progress: 0,
      interval: null,
      timeout: null,
      channel: interaction.channel
    };

    // Réponse en embed blanc pour signaler le début
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffffff)
          .setDescription("Session de récolte de coton lancée !")
      ],
      ephemeral: false
    });

    // Incrémentation toutes les 2 minutes
    sessionData.interval = setInterval(() => {
      sessionData.progress += 3;
      const embed = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription("Vos doigts s’accrochent aux fibres rêches du coton... +3 unités récoltées.");
      interaction.channel.send({ embeds: [embed] });
    }, intervalDuration);

    // Fin automatique après 20 minutes (exemple avec rendement aléatoire)
    sessionData.timeout = setTimeout(() => {
      clearInterval(sessionData.interval);
      const finalYield = Math.floor(Math.random() * (40 - 25 + 1)) + 25;
      const embed = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription(`Session terminée ! Vous obtenez ${finalYield} unités de coton brut.`);
      interaction.channel.send({ embeds: [embed] });

      // Mise à jour du stock
      const warehouse = getUserWarehouse(userId);
      warehouse.cotonBrut += finalYield;

      harvestSessions.delete(userId);
    }, totalDuration);

    // On enregistre la session dans la Map
    harvestSessions.set(userId, sessionData);
  }
};
