// src/commands/transfo_mais.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserWarehouse } = require('../warehouseData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transfo_mais')
    .setDescription('Transforme le maïs brut en maïs transformé (10 minutes).'),
  async execute(interaction) {
    // Vérifier que l'utilisateur est dans l'entrepôt (exemple avec le nom du canal)
    if (!interaction.channel.name.toLowerCase().includes("entrepot")) {
      return interaction.reply({ content: "Vous devez être dans l'entrepôt pour transformer le maïs.", ephemeral: false });
    }
    
    const userId = interaction.user.id;
    const warehouse = getUserWarehouse(userId);
    
    if (warehouse.maisBrut < 40) {
      return interaction.reply({ content: "Vous n'avez pas assez de maïs brut pour la transformation (40 requis).", ephemeral: false });
    }
    
    await interaction.reply({ content: "Transformation du maïs lancée !", ephemeral: false });
    const channel = interaction.channel;
    const totalDuration = 10 * 60 * 1000; // 10 minutes
    const intervalDuration = 2 * 60 * 1000; // 2 minutes
    
    const interval = setInterval(() => {
      const embed = new EmbedBuilder()
        .setColor(0xffff00)
        .setDescription("Le maïs est broyé puis séché... Le produit devient utilisable.");
      channel.send({ embeds: [embed] });
    }, intervalDuration);
    
    setTimeout(() => {
      clearInterval(interval);
      // Transformation : 40 maïs brut → 20 maïs transformé
      warehouse.maisBrut -= 40;
      warehouse.maisTrans += 20;
      const embed = new EmbedBuilder()
        .setColor(0xffff00)
        .setDescription("Transformation terminée ! 40 unités de maïs brut ont été transformées en 20 unités de maïs transformé.");
      channel.send({ embeds: [embed] });
    }, totalDuration);
  }
};
