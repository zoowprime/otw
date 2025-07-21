// src/commands/session.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

// même table de votes
const VOTE_OPTIONS = [
  { id: 'present', label: 'Oui',           emoji: '✅', category: 'présents' },
  { id: 'late',    label: 'En retard',     emoji: '🕦', category: 'en retard' },
  { id: 'maybe',   label: 'Je ne sais pas',emoji: '🤷', category: 'indécis'   },
  { id: 'absent',  label: 'Absent',        emoji: '❌', category: 'absents'   },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setDescription('Crée une session de RP et collecte les présences.')
    .addStringOption(o => o.setName('date').setDescription('Date ex: vendredi 07 mars').setRequired(true))
    .addStringOption(o => o.setName('horaire').setDescription('Horaire ex: 19h30').setRequired(true))
    .addStringOption(o => o.setName('psn').setDescription('PSN du lanceur').setRequired(true)),

  async execute(interaction) {
    // prépare l’embed
    const date    = interaction.options.getString('date');
    const horaire = interaction.options.getString('horaire');
    const psn     = interaction.options.getString('psn');
    const mention = `<@&${process.env.CITIZEN_ROLE_ID}>`;

    const baseEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('📅 Session RP Old Town Western')
      .setDescription(
        `**Date :** ${date}\n` +
        `**Horaire :** ${horaire}\n` +
        `**PSN du lanceur :** ${psn}\n\n` +
        VOTE_OPTIONS.map(o => `${o.emoji} = ${o.label}`).join('\n') +
        '\n\nMerci de cliquer pour indiquer votre présence.'
      )
      .addFields(
        VOTE_OPTIONS.map(o => ({
          name: `Membres ${o.category} (0) :`,
          value: 'Aucun'
        }))
      );

    // prépare les boutons
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

    // envoi du message
    const msg = await interaction.reply({
      content: mention,
      embeds: [baseEmbed],
      components: [row],
      fetchReply: true
    });

    // initialise le vote dans la Map globale
    const votes = {};
    for (const o of VOTE_OPTIONS) votes[o.id] = new Set();
    // on stocke le embed original et le votes set
    interaction.client.sessionVotes.set(msg.id, {
      embed: baseEmbed,
      votes
    });
  }
};
