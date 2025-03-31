// src/commands/arreter_recolte_plantes.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { harvestSessions } = require('../harvestSessions');
const { getUserWarehouse } = require('../warehouseData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('arreter_recolte_plantes')
    .setDescription('Arrête votre session de récolte de plantes en cours.'),
  async execute(interaction) {
    const userId = interaction.user.id;
    if (!harvestSessions.has(userId)) {
      return interaction.reply({ content: "Vous n'avez pas de session de récolte de plantes en cours.", ephemeral: false });
    }
    
    const session = harvestSessions.get(userId);
    clearInterval(session.interval);
    clearTimeout(session.timeout);
    
    const ingredients = ["Vanille", "Menthe", "Mûre", "Pommes", "Framboises", "Pêche", "Blé"];
    const warehouse = getUserWarehouse(userId);
    if (!warehouse.plantes) warehouse.plantes = {};
    let msg = "Session de récolte de plantes arrêtée. Vous avez récolté :\n";
    ingredients.forEach(ing => {
      if (!warehouse.plantes[ing]) warehouse.plantes[ing] = 0;
      warehouse.plantes[ing] += session.progress[ing];
      msg += `${ing}: ${session.progress[ing]} unités\n`;
    });
    const embed = new EmbedBuilder()
      .setColor(0xF5DEB3)
      .setDescription(msg);
    session.channel.send({ embeds: [embed] });
    harvestSessions.delete(userId);
    
    return interaction.reply({ content: "Votre session de récolte de plantes a été arrêtée.", ephemeral: false });
  }
};
