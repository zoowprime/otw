// src/commands/pot-de-vin.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pot-de-vin')
    .setDescription('Offrez un pot-de-vin à un fonctionnaire ou un juge pour éviter une condamnation ou favoriser une décision.')
    .addUserOption(option =>
      option.setName('joueur')
        .setDescription('Le fonctionnaire ou le juge à qui offrir le pot-de-vin')
        .setRequired(true)
    )
    .addNumberOption(option =>
      option.setName('montant')
        .setDescription('Le montant du pot-de-vin')
        .setRequired(true)
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('joueur');
    const montant = interaction.options.getNumber('montant');
    
    const embed = new EmbedBuilder()
      .setColor(0x8B4513) // Couleur marron
      .setDescription(`Vous venez de faire un pot-de-vin à <@${target.id}> de $${montant.toFixed(2)}.`);
      
    await interaction.reply({ embeds: [embed] });
  },
};
