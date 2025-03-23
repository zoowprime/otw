// src/commands/arreter_recolte.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { harvestSessions } = require('../harvestSessions');
const { getUserWarehouse } = require('../warehouseData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('arreter_recolte')
    .setDescription('Arrête votre session de récolte en cours.'),
  async execute(interaction) {
    const userId = interaction.user.id;
    if (!harvestSessions.has(userId)) {
      return interaction.reply({ content: "Vous n'avez pas de session de récolte en cours.", ephemeral: false });
    }

    const session = harvestSessions.get(userId);
    clearInterval(session.interval);
    clearTimeout(session.timeout);

    // On récupère la progression cumulée
    const finalYield = session.progress || 0;

    if (session.type === 'mais') {
      const embed = new EmbedBuilder()
        .setColor(0xffff00)
        .setDescription(`Session de récolte de maïs arrêtée. Vous obtenez ${finalYield} unités de maïs.`);
      session.channel.send({ embeds: [embed] });

      const warehouse = getUserWarehouse(userId);
      warehouse.maisBrut += finalYield;
    } else if (session.type === 'coton') {
      const embed = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription(`Session de récolte de coton arrêtée. Vous obtenez ${finalYield} unités de coton brut.`);
      session.channel.send({ embeds: [embed] });

      const warehouse = getUserWarehouse(userId);
      warehouse.cotonBrut += finalYield;
    }

    harvestSessions.delete(userId);

    return interaction.reply({ content: "Votre session de récolte a été arrêtée.", ephemeral: false });
  }
};
