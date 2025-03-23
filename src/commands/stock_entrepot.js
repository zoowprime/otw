// src/commands/stock_entrepot.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserWarehouse } = require('../warehouseData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stock_entrepot')
    .setDescription("Affiche vos ressources stockées à l'entrepôt."),
  async execute(interaction) {
    const userId = interaction.user.id;
    const warehouse = getUserWarehouse(userId);
    
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle("Stock de l'entrepôt")
      .setDescription(
        `**Maïs brut :** ${warehouse.maisBrut}\n` +
        `**Maïs transformé :** ${warehouse.maisTrans}\n` +
        `**Coton brut :** ${warehouse.cotonBrut}\n` +
        `**Coton transformé :** ${warehouse.cotonTrans}`
      );
    
    await interaction.reply({ embeds: [embed] });
  }
};
