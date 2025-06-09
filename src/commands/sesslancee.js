const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const roleIDEnVille = '1378037596566978561';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sesslancee')
    .setDescription('Lance une session en indiquant que vous êtes en ville ou déconnecté')
    .addStringOption(option =>
      option.setName('horaire')
        .setDescription('Horaire de lancement de la session')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('psn')
        .setDescription('PSN du lanceur')
        .setRequired(true)
    ),
  async execute(interaction) {
    const horaire = interaction.options.getString('horaire');
    const psn = interaction.options.getString('psn');

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🚨 Session RP lancée !')
      .setDescription(`**Horaire :** ${horaire}\n**PSN du lanceur :** ${psn}\n\nMerci de cliquer sur le bouton ✔️ En Ville lorsque vous êtes en session et de cliquer sur ❌ Déconnecté lorsque vous vous êtes déconnecté.`);

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('en_ville')
          .setLabel('✔️ En Ville')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('deconnecte')
          .setLabel('❌ Déconnecté')
          .setStyle(ButtonStyle.Danger),
      );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
