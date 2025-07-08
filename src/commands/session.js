// src/commands/session.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

// Dictionnaire des emojis et de leurs catégories
const STATUS = {
  '✅': 'présents',
  '🕦': 'en retard',
  '🤷': 'indécis',
  '❌': 'absents'
};

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
        .setDescription("L'horaire de la session (ex. 19h30)")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('psn')
        .setDescription('Le PSN du lanceur')
        .setRequired(true)
    ),
  async execute(interaction) {
    const sessionDate    = interaction.options.getString('date');
    const sessionHoraire = interaction.options.getString('horaire');
    const sessionPsn     = interaction.options.getString('psn');

    const citizenRoleId = '1308118795285565530';
    const mention       = `<@&${citizenRoleId}>`;

    // Création de l'embed initial
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('Session Roleplay Old Town Western')
      .setDescription(
        `${sessionDate}\n\n` +
        `**Horaire :** ${sessionHoraire}\n` +
        `**Psn du lanceur :** ${sessionPsn}\n\n` +
        `✅ = oui\n` +
        `🕦 = en retard\n` +
        `🤷 = je ne sais pas\n` +
        `❌ = absent\n\n` +
        `Merci de voter afin de nous indiquer votre présence, l’abstention est autorisée mais a une limite, si elle n’est pas respectée vous redevrez passer votre candidature.`
      )
      .addFields(
        { name: 'Membres présents (0) :',     value: 'Aucun' },
        { name: 'Membres en retard (0) :',    value: 'Aucun' },
        { name: 'Membres indécis (0) :',     value: 'Aucun' },
        { name: 'Membres absents (0) :',     value: 'Aucun' }
      );

    // Création des boutons de vote
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('✅').setLabel('Oui').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('🕦').setLabel('En retard').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('🤷').setLabel('Je ne sais pas').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('❌').setLabel('Absent').setStyle(ButtonStyle.Danger)
    );

    // Envoi du message et récupération pour créer le collector
    const message = await interaction.reply({
      content: mention,
      embeds: [embed],
      components: [row],
      fetchReply: true
    });

    // Collector sans limite de temps, un par message
    const collector = message.createMessageComponentCollector();

    // Structure pour stocker les votes
    const votes = {
      '✅': new Set(),
      '🕦': new Set(),
      '🤷': new Set(),
      '❌': new Set()
    };

    collector.on('collect', async i => {
      // Retirer l'utilisateur de toutes les catégories
      for (const key of Object.keys(votes)) {
        votes[key].delete(i.user.id);
      }
      // L'ajouter à la catégorie choisie
      votes[i.customId].add(i.user.id);

      // Recalcul des champs
      const fields = Object.entries(STATUS).map(([emoji, label]) => {
        const userIds = Array.from(votes[emoji]);
        const mentions = userIds.length
          ? userIds.map(id => `<@${id}>`).join(' ')
          : 'Aucun';
        return {
          name: `Membres ${label} (${userIds.length}) :`,
          value: mentions
        };
      });

      // Mise à jour de l'embed
      const updatedEmbed = EmbedBuilder.from(embed).setFields(fields);

      // Envoi de la mise à jour
      await i.update({ embeds: [updatedEmbed], components: [row] });
    });
  }
};
