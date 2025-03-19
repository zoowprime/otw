const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('livraison')
    .setDescription('Permet aux transporteurs de livrer des ressources entre les villes.')
    .addStringOption(option =>
      option.setName('produit')
        .setDescription('Le produit à livrer')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('destination')
        .setDescription('La destination de la livraison')
        .setRequired(true)
    ),
  async execute(interaction) {
    const produit = interaction.options.getString('produit');
    const destination = interaction.options.getString('destination');
    const embed = new EmbedBuilder()
      .setColor(0xCC9900) // Jaune foncé
      .setTitle("Livraison en cours")
      .setDescription(`Vous effectuez une livraison de **${produit}** vers **${destination}**. Dépêchez-vous de livrer les ressources le plus vite possible !`);
    await interaction.reply({ embeds: [embed] });
  },
};
