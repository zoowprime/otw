const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pot-de-vin')
    .setDescription('Offrez un pot-de-vin à un fonctionnaire ou juge.')
    .addUserOption(option =>
      option.setName('cible')
        .setDescription('Le fonctionnaire ou le juge à qui offrir le pot-de-vin.')
        .setRequired(true)
    )
    .addNumberOption(option =>
      option.setName('montant')
        .setDescription('Le montant du pot-de-vin.')
        .setRequired(true)
    ),
  async execute(interaction) {
    const cible = interaction.options.getUser('cible');
    const montant = interaction.options.getNumber('montant');

    // Créer un embed détaillé avec le texte complet
    const embed = new EmbedBuilder()
      .setColor(0x8B4513) // Marron
      .setTitle('Pot-de-vin offert')
      .setDescription(`Vous venez de faire un pot-de-vin à <@${cible.id}> de $${montant.toFixed(2)} pour influencer une décision ou éviter une condamnation.`)
      .setFooter({ text: "C'est votre geste RP qui fait la différence !" });

    await interaction.reply({ embeds: [embed] });
  },
};
