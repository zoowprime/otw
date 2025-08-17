// src/commands/fin_livraison.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { clearAll } = require('../interaction/trainStock');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fin_livraison')
    .setDescription('Terminer la livraison et vider le stock du train'),

  async execute(interaction) {
    clearAll();
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Livraison terminée')
      .setDescription(`**${interaction.user}** a validé la fin de livraison. Le stock du train est remis à **0**.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
