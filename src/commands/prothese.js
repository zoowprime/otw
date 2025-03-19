const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prothese')
    .setDescription('Pose une prothèse sur un membre coupé')
    .addStringOption(option =>
      option.setName('membre')
        .setDescription('Le membre à traiter (bras, main, jambe)')
        .setRequired(true)
        .addChoices(
          { name: 'bras', value: 'bras' },
          { name: 'main', value: 'main' },
          { name: 'jambe', value: 'jambe' }
        )
    ),
  async execute(interaction) {
    const membre = interaction.options.getString('membre');
    const embed = new EmbedBuilder()
      .setColor(0x006400) // Vert foncé
      .setDescription(`🦿 Vous êtes en train de poser une prothèse sur votre patient(e) pour le/la ${membre}.`);
    await interaction.reply({ embeds: [embed] });
  },
};
