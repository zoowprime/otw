const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reparer')
    .setDescription('Permet aux armuriers de réparer des objets cassés (armes, outils).')
    .addStringOption(option =>
      option.setName('objet')
        .setDescription('Objet à réparer')
        .setRequired(true)
    ),
  async execute(interaction) {
    const objet = interaction.options.getString('objet');
    const embed = new EmbedBuilder()
      .setColor(0xff0000) // Rouge
      .setTitle("Réparation en cours")
      .setDescription(`Vous êtes en train de réparer **${objet}** pour votre client.`);
    await interaction.reply({ embeds: [embed] });
  },
};
