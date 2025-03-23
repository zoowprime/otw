// src/commands/transfo_coton.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserWarehouse } = require('../warehouseData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transfo_coton')
    .setDescription('Transforme le coton brut en coton utilisable (10 minutes).'),
  async execute(interaction) {
    if (!interaction.channel.name.toLowerCase().includes("entrepot") &&
        !interaction.channel.name.toLowerCase().includes("textile")) {
      return interaction.reply({ content: "Vous devez être dans l'entrepôt ou dans un bâtiment textile pour transformer le coton.", ephemeral: false });
    }
    
    const userId = interaction.user.id;
    const warehouse = getUserWarehouse(userId);
    
    if (warehouse.cotonBrut < 30) {
      return interaction.reply({ content: "Vous n'avez pas assez de coton brut pour la transformation (30 requis).", ephemeral: false });
    }
    
    await interaction.reply({ content: "Transformation du coton lancée !", ephemeral: false });
    const channel = interaction.channel;
    const totalDuration = 10 * 60 * 1000; // 10 minutes
    const intervalDuration = 2 * 60 * 1000; // 2 minutes
    
    const interval = setInterval(() => {
      const embed = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription("Vous nettoyez, filez et emballez le coton. Travail pénible mais productif.");
      channel.send({ embeds: [embed] });
    }, intervalDuration);
    
    setTimeout(() => {
      clearInterval(interval);
      // Transformation : 30 coton brut → 15 coton utilisable
      warehouse.cotonBrut -= 30;
      warehouse.cotonTrans += 15;
      const embed = new EmbedBuilder()
        .setColor(0xffffff)
        .setDescription("Transformation terminée ! 30 unités de coton brut ont été transformées en 15 unités de coton utilisable.");
      channel.send({ embeds: [embed] });
    }, totalDuration);
  }
};
