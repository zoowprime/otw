const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const VOTE_OPTIONS = [
  { id: 'present', label: 'Oui',           emoji: '✅', category: 'présents' },
  { id: 'late',    label: 'En retard',     emoji: '🕦', category: 'en retard' },
  { id: 'maybe',   label: 'Je ne sais pas',emoji: '🤷', category: 'indécis' },
  { id: 'absent',  label: 'Absent',        emoji: '❌', category: 'absents' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setDescription('Crée une session de RP et collecte les présences.')
    .addStringOption(opt =>
      opt.setName('date').setDescription('Date (ex: vendredi 07 mars 2025)').setRequired(true))
    .addStringOption(opt =>
      opt.setName('horaire').setDescription('Horaire (ex: 19h30)').setRequired(true))
    .addStringOption(opt =>
      opt.setName('psn').setDescription('PSN du lanceur').setRequired(true)),

  async execute(interaction) {
    const date    = interaction.options.getString('date');
    const horaire = interaction.options.getString('horaire');
    const psn     = interaction.options.getString('psn');
    const CITIZEN_ROLE_ID = '1308118795285565530';
    const mention = `<@&${CITIZEN_ROLE_ID}>`;

    // 1️⃣ construit l'embed
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('📅 Session RP Old Town Western')
      .setDescription(
        `**Date :** ${date}\n` +
        `**Horaire :** ${horaire}\n` +
        `**PSN du lanceur :** ${psn}\n\n` +
        VOTE_OPTIONS.map(o => `${o.emoji} = ${o.label}`).join('\n') +
        `\n\nMerci de cliquer pour indiquer votre présence.`
      )
      .addFields(
        VOTE_OPTIONS.map(o => ({
          name: `Membres ${o.category} (0) :`,
          value: 'Aucun'
        }))
      );

    // 2️⃣ prépare les boutons
    const row = new ActionRowBuilder().addComponents(
      VOTE_OPTIONS.map(o =>
        new ButtonBuilder()
          .setCustomId(o.id)
          .setLabel(o.label)
          .setEmoji(o.emoji)
          .setStyle(
            o.id === 'present' ? ButtonStyle.Success :
            o.id === 'late'    ? ButtonStyle.Secondary :
            o.id === 'maybe'   ? ButtonStyle.Primary :
                                 ButtonStyle.Danger
          )
      )
    );

    // 3️⃣ envoie le message
    const message = await interaction.reply({
      content: mention,
      embeds: [embed],
      components: [row],
      fetchReply: true
    });

    // 4️⃣ initialise le suivi
    const votes = {
      present: new Set(),
      late:    new Set(),
      maybe:   new Set(),
      absent:  new Set()
    };

    // 5️⃣ stocke dans la map
    interaction.client.sessionVotes.set(message.id, { embed, row, votes });
  }
};
