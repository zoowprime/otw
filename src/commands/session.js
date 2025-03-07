// src/commands/session.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setDescription('Crée une session de RP avec les informations de date, horaire et psn du lanceur.')
    .addStringOption(option =>
      option
        .setName('date')
        .setDescription('La date de la session (ex. vendredi 07 mars 2025)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('horaire')
        .setDescription('L\'horaire de la session (ex. 19h30)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('psn')
        .setDescription('Le PSN du lanceur')
        .setRequired(true)
    ),
  async execute(interaction) {
    const sessionDate = interaction.options.getString('date');
    const sessionHoraire = interaction.options.getString('horaire');
    const sessionPsn = interaction.options.getString('psn');

    const embed = new EmbedBuilder()
      .setColor(0xff0000) // rouge
      .setTitle('Session Roleplay Old Town Western')
      .setDescription(`${sessionDate}\n\n**Horaire :** ${sessionHoraire}\n**Psn du lanceur :** ${sessionPsn}\n\n✅ = oui\n🕦 = en retard\n🤷 = je ne sais pas\n❌ = non plus\n\nMerci de voter afin de nous indiquer votre présence, l’abstention est autorisée mais a une limite, si elle n’est pas respectée vous redevrez passer votre candidature.`);

    // Mentionner le rôle citoyen
    const citizenRoleId = process.env.CITIZEN_ROLE_ID;
    const mention = citizenRoleId ? `<@&${citizenRoleId}>` : '';

    await interaction.reply({ content: mention, embeds: [embed] });
  },
};
