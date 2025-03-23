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
    
    const totalDuration = 20 * 60 * 1000; // 20 minutes
    const intervalDuration = 2 * 60 * 1000; // 2 minutes
    let progress = 0;
    const channel = interaction.channel;
    
    await interaction.reply({ content: "Session de récolte de coton lancée !", ephemeral: false });
    
    const interval = setInterval(() => {
      progress += 3;
      const embed = new EmbedBuilder()
        .setColor(0xffffff) // blanc
        .setDescription("Vos doigts s’accrochent aux fibres rêches du coton... +3 unités récoltées.");
      channel.send({ embeds: [embed] });
    }, intervalDuration);
    
    const timeout = setTimeout(() => {
      clearInterval(interval);
      // Rendement final aléatoire entre 25 et 40
      const finalYield = Math.floor(Math.random() * (40 - 25 + 1)) + 25;
      const embed = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription(`Session terminée ! Vous obtenez ${finalYield} unités de coton brut.`);
      channel.send({ embeds: [embed] });
      
      const warehouse = getUserWarehouse(userId);
      warehouse.cotonBrut += finalYield;
      
      harvestSessions.delete(userId);
    }, totalDuration);
    
    harvestSessions.set(userId, {
      type: 'coton',
      interval,
      timeout,
      progress,
      channel
    });
  }
};
