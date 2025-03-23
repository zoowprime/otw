// src/commands/arreter_transfo.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { transformSessions } = require('../transformSessions');
const { getUserWarehouse } = require('../warehouseData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('arreter_transfo')
    .setDescription("Arrête votre session de transformation en cours."),
  async execute(interaction) {
    const userId = interaction.user.id;

    if (!transformSessions.has(userId)) {
      return interaction.reply({ content: "Vous n'avez pas de session de transformation en cours.", ephemeral: false });
    }

    const session = transformSessions.get(userId);
    clearInterval(session.interval);
    clearTimeout(session.timeout);
    transformSessions.delete(userId);

    // Selon le type de transformation
    const warehouse = getUserWarehouse(userId);
    let embedMsg = "";
    if (session.type === 'transfo_mais') {
      // Le joueur a déjà reçu 4 maïs transformés par intervalle
      // On calcule combien d'intervalles ont été complétés
      const intervalsDone = session.currentInterval;
      const totalTrans = intervalsDone * 4; // déjà ajoutés au fur et à mesure
      embedMsg = `Transformation de maïs arrêtée après ${intervalsDone} intervalle(s). Vous avez obtenu ${totalTrans} unités de maïs transformé.`;
    } else if (session.type === 'transfo_coton') {
      const intervalsDone = session.currentInterval;
      const totalTrans = intervalsDone * 3; // déjà ajoutés
      embedMsg = `Transformation de coton arrêtée après ${intervalsDone} intervalle(s). Vous avez obtenu ${totalTrans} unités de coton utilisable.`;
    }

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setDescription(embedMsg);

    session.channel.send({ embeds: [embed] });
    return interaction.reply({ content: "Votre session de transformation a été arrêtée.", ephemeral: false });
  }
};
