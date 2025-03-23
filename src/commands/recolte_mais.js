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
    if (harvestSessions.has(userId)) {
      return interaction.reply({ content: "Vous avez déjà une session de récolte en cours.", ephemeral: false });
    }
    
    const totalDuration = 20 * 60 * 1000; // 20 minutes
    const intervalDuration = 2 * 60 * 1000; // 2 minutes
    let progress = 0;
    const channel = interaction.channel;
    
    await interaction.reply({ content: "Session de récolte de maïs lancée !", ephemeral: false });
    
    const interval = setInterval(() => {
      progress += 5;
      const embed = new EmbedBuilder()
        .setColor(0xffff00) // jaune
        .setDescription("Vous arrachez des épis de maïs à la sueur de votre front. +5 unités récoltées.");
      channel.send({ embeds: [embed] });
    }, intervalDuration);
    
    const timeout = setTimeout(() => {
      clearInterval(interval);
      // Rendement final aléatoire entre 40 et 60
      const finalYield = Math.floor(Math.random() * (60 - 40 + 1)) + 40;
      const embed = new EmbedBuilder()
        .setColor(0xffff00)
        .setDescription(`Session terminée ! Vous obtenez ${finalYield} unités de maïs.`);
      channel.send({ embeds: [embed] });
      
      // Mise à jour du stock de l'utilisateur
      const warehouse = getUserWarehouse(userId);
      warehouse.maisBrut += finalYield;
      
      harvestSessions.delete(userId);
    }, totalDuration);
    
    // Stocker la session
    harvestSessions.set(userId, {
      type: 'mais',
      interval,
      timeout,
      progress,
      channel
    });
  }
};
