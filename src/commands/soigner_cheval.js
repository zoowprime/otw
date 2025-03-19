const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('soigner_cheval')
    .setDescription('Permet aux maréchaux-ferrants et vétérinaires de soigner les chevaux blessés.')
    .addUserOption(option =>
      option.setName('joueur')
        .setDescription('Le propriétaire du cheval à soigner')
        .setRequired(true)
    ),
  async execute(interaction) {
    const joueur = interaction.options.getUser('joueur');
    const embed = new EmbedBuilder()
      .setColor(0x8B4513) // Marron
      .setTitle("Soins en cours")
      .setDescription(`Vous êtes en train de soigner le cheval de <@${joueur.id}>.`);
    await interaction.reply({ embeds: [embed] });
  },
};
