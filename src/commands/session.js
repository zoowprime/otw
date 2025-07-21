const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const fs   = require('fs');
const path = require('path');

const SESSIONS_FILE = path.join(__dirname, '../data/sessions.json');
const CITIZEN_ROLE_ID = process.env.CITIZEN_ROLE_ID || '1308118795285565530';

// Options de vote
const OPTIONS = [
  { id: 'present', label: 'Oui',          emoji: '✅', category: 'présents' },
  { id: 'late',    label: 'En retard',    emoji: '🕦', category: 'en retard' },
  { id: 'maybe',   label: 'Je ne sais pas', emoji: '🤷', category: 'indécis' },
  { id: 'absent',  label: 'Absent',       emoji: '❌', category: 'absents' }
];

// Charge ou initialise le JSON
function loadSessions() {
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE,'[]');
  return JSON.parse(fs.readFileSync(SESSIONS_FILE,'utf-8'));
}
function saveSessions(sessions) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setDescription('Crée une session de RP et collecte les présences.')
    .addStringOption(o => o.setName('date').setDescription('Date (ex: vendredi 07 mars)').setRequired(true))
    .addStringOption(o => o.setName('horaire').setDescription('Horaire (ex: 19h30)').setRequired(true))
    .addStringOption(o => o.setName('psn').setDescription('PSN du lanceur').setRequired(true)),

  async execute(interaction) {
    const date    = interaction.options.getString('date');
    const horaire = interaction.options.getString('horaire');
    const psn     = interaction.options.getString('psn');

    const mention = `<@&${CITIZEN_ROLE_ID}>`;

    // construit l’embed initial
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('📅 Session RP Old Town Western')
      .setDescription(
        `**Date :** ${date}\n` +
        `**Horaire :** ${horaire}\n` +
        `**PSN du lanceur :** ${psn}\n\n` +
        OPTIONS.map(o => `${o.emoji} = ${o.label}`).join('\n') +
        `\n\nMerci de cliquer pour indiquer votre présence.`
      )
      .addFields(
        OPTIONS.map(o => ({
          name: `Membres ${o.category} (0) :`,
          value: 'Aucun'
        }))
      );

    // crée les boutons
    const row = new ActionRowBuilder().addComponents(
      OPTIONS.map(o =>
        new ButtonBuilder()
          .setCustomId(o.id)
          .setEmoji(o.emoji)
          .setLabel(o.label)
          .setStyle(
            o.id === 'present' ? ButtonStyle.Success :
            o.id === 'late'    ? ButtonStyle.Secondary :
            o.id === 'maybe'   ? ButtonStyle.Primary :
                                 ButtonStyle.Danger
          )
      )
    );

    // envoie
    const msg = await interaction.reply({
      content: mention,
      embeds: [embed],
      components: [row],
      fetchReply: true
    });

    // charge l’existant, ajoute la nouvelle session, sauvegarde
    const sessions = loadSessions();
    sessions.push({
      messageId: msg.id,
      channelId: msg.channelId,
      votes: OPTIONS.reduce((acc,o) => { acc[o.id]=[]; return acc }, {}),
      meta: { date, horaire, psn }
    });
    saveSessions(sessions);
  }
};
