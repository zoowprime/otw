const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('candidature')
    .setDescription('Gérer une candidature : accepter ou refuser.')
    .addStringOption(option =>
      option
        .setName('action')
        .setDescription('Choisissez "Accepter" ou "Refuser".')
        .setRequired(true)
        .addChoices(
          { name: 'Accepter', value: 'accepter' },
          { name: 'Refuser', value: 'refuser' }
        )
    )
    .addStringOption(option =>
      option
        .setName('raison')
        .setDescription('Indiquez la raison de la décision.')
        .setRequired(true)
    )
    .addUserOption(option =>
      option
        .setName('candidat')
        .setDescription('Mentionnez le joueur candidat.')
        .setRequired(true)
    ),
  async execute(interaction) {
    const action = interaction.options.getString('action');
    const raison = interaction.options.getString('raison');
    const candidat = interaction.options.getUser('candidat');

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('Résultat de la candidature')
      .setDescription(`La candidature de ${candidat.username} a été **${action}**.\nRaison : ${raison}`);

    await interaction.reply({ embeds: [embed] });
  }
};
