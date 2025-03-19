const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('diagnostic')
    .setDescription('Effectue un diagnostic sur un patient')
    .addUserOption(option =>
      option.setName('joueur')
        .setDescription('Le patient à diagnostiquer')
        .setRequired(true)
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('joueur');
    const embed = new EmbedBuilder()
      .setColor(0x006400) // Vert foncé
      .setDescription(`🏥 Vous êtes en train de faire un diagnostic à <@${target.id}>.`);
    await interaction.reply({ embeds: [embed] });
  },
};
