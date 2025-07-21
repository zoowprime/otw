// src/commands/session.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

// Configuration des options de vote
const VOTE_OPTIONS = [
  { id: 'present', label: 'Oui',           emoji: '✅', category: 'présents' },
  { id: 'late',    label: 'En retard',     emoji: '🕦', category: 'en retard' },
  { id: 'maybe',   label: 'Je ne sais pas',emoji: '🤷', category: 'indécis'  },
  { id: 'absent',  label: 'Absent',        emoji: '❌', category: 'absents'   }
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
    const date    = interaction.options.getString('date');
    const horaire = interaction.options.getString('horaire');
    const psn     = interaction.options.getString('psn');

    // Mention du rôle Citoyen
    const CITIZEN_ROLE_ID = '1308118795285565530';
    const mention = `<@&${CITIZEN_ROLE_ID}>`;

    // Construction de l'embed
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
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

    // Les boutons de vote
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

    // Envoi du message et récupération
    const message = await interaction.reply({
      content: mention,
      embeds: [embed],
      components: [row],
      fetchReply: true
    });

    // Chaque message a SON collector SUR SES BOUTONS (jamais expiré)
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button
      // PAS de time => ne périme jamais
    });

    // Structure pour suivre les votes par message
    const votes = {};
    for (const o of VOTE_OPTIONS) votes[o.id] = new Set();

    collector.on('collect', async btnInt => {
      // Garde l'interaction publique (update) et unique par utilisateur/message
      const uid = btnInt.user.id;

      // Retirer l'utilisateur de toutes les catégories
      for (const key of Object.keys(votes)) {
        votes[key].delete(uid);
      }

      // Ajouter l'utilisateur dans la catégorie cliquée
      votes[btnInt.customId].add(uid);

      // Regénère les champs FIELDS
      const updatedFields = VOTE_OPTIONS.map(o => {
        const ids = Array.from(votes[o.id]);
        return {
          name: `Membres ${o.category} (${ids.length}) :`,
          value: ids.length ? ids.map(id => `<@${id}>`).join(' ') : 'Aucun'
        };
      });

      // Met à jour l'embed
      const updatedEmbed = EmbedBuilder.from(embed).setFields(updatedFields);

      // Met à jour le message où le bouton a été cliqué
      await btnInt.update({
        embeds: [updatedEmbed],
        components: [row]
      });
    });
  }
};
