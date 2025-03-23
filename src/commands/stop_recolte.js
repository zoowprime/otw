// src/commands/stop_recolte.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { harvestSessions } = require('../harvestSessions');
const { getUserWarehouse } = require('../warehouseData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop_recolte')
    .setDescription('Stoppe votre session de récolte en cours.'),
  async execute(interaction) {
    const userId = interaction.user.id;
    if (!harvestSessions.has(userId)) {
      return interaction.reply({ content: "Vous n'avez pas de session de récolte en cours.", ephemeral: false });
    }
    
    const session = harvestSessions.get(userId);
    clearInterval(session.interval);
    clearTimeout(session.timeout);
    
    let finalYield;
    if (session.type === 'mais') {
      finalYield = session.progress;
      const embed = new EmbedBuilder()
        .setColor(0xffff00)
        .setDescription(`Session de récolte de maïs stoppée. Vous obtenez ${finalYield} unités de maïs.`);
      session.channel.send({ embeds: [embed] });
      
      const warehouse = getUserWarehouse(userId);
      warehouse.maisBrut += finalYield;
    } else if (session.type === 'coton') {
      finalYield = session.progress;
      const embed = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription(`Session de récolte de coton stoppée. Vous obtenez ${finalYield} unités de coton brut.`);
      session.channel.send({ embeds: [embed] });
      
      const warehouse = getUserWarehouse(userId);
      warehouse.cotonBrut += finalYield;
    }
    
    harvestSessions.delete(userId);
    return interaction.reply({ content: "Votre session de récolte a été arrêtée.", ephemeral: false });
  }
};
