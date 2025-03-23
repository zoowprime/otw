// src/commands/fin_cuve_marcel.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fin_cuve_marcel')
    .setDescription('Marcel confirme que tout a été récolté.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0xffc0cb)
      .setTitle("Message de Marcel")
      .setDescription("Parfait mon ami, tu as récolté absolument tout !");
      
    await interaction.reply({ embeds: [embed] });
  }
};
