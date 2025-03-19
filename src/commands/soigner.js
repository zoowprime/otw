const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('soigner')
    .setDescription('Soigne un patient')
    .addUserOption(option =>
      option.setName('joueur')
        .setDescription('Le patient à soigner')
        .setRequired(true)
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('joueur');
    const embed = new EmbedBuilder()
      .setColor(0x006400) // Vert foncé
      .setDescription(`💉 Vous êtes en train de soigner <@${target.id}>.`);
    await interaction.reply({ embeds: [embed] });
  },
};
