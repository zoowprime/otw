// src/commands/session.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

// Configuration des options de vote
const VOTE_OPTIONS = [
  { id: 'present', label: 'Oui',       emoji: '✅', category: 'présents'   },
  { id: 'late',    label: 'En retard', emoji: '🕦', category: 'en retard'   },
  { id: 'maybe',   label: 'Je ne sais pas', emoji: '🤷', category: 'indécis' },
  { id: 'absent',  label: 'Absent',    emoji: '❌', category: 'absents'    }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setDescription('Crée une session de RP et collecte les présences.')
    .addStringOption(opt =>
      opt.setName('date')
         .setDescription('Date (ex: vendredi 07 mars 2025)')
         .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('horaire')
         .setDescription('Horaire (ex: 19h30)')
         .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('psn')
         .setDescription('PSN du lanceur')
         .setRequired(true)
    ),

  async execute(interaction) {
    // Récup des options
    const date    = interaction.options.getString('date');
    const horaire = interaction.options.getString('horaire');
    const psn     = interaction.options.getString('psn');

    // Mention du rôle Citoyen
    const CITIZEN_ROLE_ID = '1308118795285565530';
    const mention = `<@&${CITIZEN_ROLE_ID}>`;

    // Embed initial
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('📅 Session RP Old Town Western')
      .setDescription(
        `**Date :** ${date}\n` +
        `**Horaire :** ${horaire}\n` +
        `**PSN du lanceur :** ${psn}\n\n` +
        VOTE_OPTIONS.map(o => `${o.emoji} = ${o.label}`).join('\n') + '\n\n' +
        `Merci de cliquer pour indiquer votre présence.`
      )
      .addFields(
        VOTE_OPTIONS.map(o => ({
          name: `Membres ${o.category} (0) :`,
          value: 'Aucun'
        }))
      );

    // Boutons de vote
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

    // Envoi du message et création du collector
    const message = await interaction.reply({
      content: mention,
      embeds: [embed],
      components: [row],
      fetchReply: true
    });

    // Collector sans limite de temps
    const collector = message.createMessageComponentCollector();

    // Structure pour stocker les votes
    const votes = {};
    for (const o of VOTE_OPTIONS) votes[o.id] = new Set();

    collector.on('collect', async btnInt => {
      const uid = btnInt.user.id;
      // On retire l'utilisateur de toutes les catégories
      for (const key of Object.keys(votes)) {
        votes[key].delete(uid);
      }
      // On ajoute dans sa nouvelle catégorie
      votes[btnInt.customId].add(uid);

      // Recréer les champs mis à jour
      const fields = VOTE_OPTIONS.map(o => {
        const users = Array.from(votes[o.id]);
        return {
          name: `Membres ${o.category} (${users.length}) :`,
          value: users.length ? users.map(id => `<@${id}>`).join(' ') : 'Aucun'
        };
      });

      // Mettre à jour l'embed
      const updated = EmbedBuilder.from(embed).setFields(fields);

      // Répondre et mettre à jour le message
      await btnInt.update({ embeds: [updated], components: [row] });
    });
  }
};
