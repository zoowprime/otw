// src/commands/session.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');

const COLOR_RED = 0xff0000;
const DISABLE_AFTER_MS = 24 * 60 * 60 * 1000; // 24h

// État en mémoire : messageId -> { yes:Set, late:Set, maybe:Set, no:Set, expiresAt:number }
const sessionsState = new Map();

/** Formate une liste de mentions à partir d'un Set d'IDs */
function formatMentions(set) {
  if (!set || set.size === 0) return '—';
  return Array.from(set).map(id => `<@${id}>`).join('  ');
}

/** Construit l'embed à partir de l'état */
function buildEmbed({ title, date, horaire, psn, guild }, state) {
  const yes = state.yes?.size || 0;
  const late = state.late?.size || 0;
  const maybe = state.maybe?.size || 0;
  const no = state.no?.size || 0;

  const description =
    `**Date :** ${date}\n` +
    `**Horaire :** ${horaire}\n` +
    `**PSN du lanceur :** ${psn}\n\n` +
    `✅ = Oui\n` +
    `⏱️ = En retard\n` +
    `🤔 = Je ne sais pas\n` +
    `❌ = Absent\n\n` +
    `Merci de cliquer pour indiquer votre présence.`;

  const embed = new EmbedBuilder()
    .setColor(COLOR_RED)
    .setTitle(`📅 ${title}`)
    .setDescription(description)
    .addFields(
      { name: `Membres présents (${yes}) :`, value: formatMentions(state.yes), inline: false },
      { name: `Membres en retard (${late}) :`, value: formatMentions(state.late), inline: false },
      { name: `Membres indécis (${maybe}) :`, value: formatMentions(state.maybe), inline: false },
      { name: `Membres absents (${no}) :`, value: formatMentions(state.no), inline: false },
    );

  const left = Math.max(0, (state.expiresAt ?? 0) - Date.now());
  if (left > 0) {
    const hoursLeft = Math.ceil(left / (60 * 60 * 1000));
    embed.setFooter({ text: `Réponses ouvertes encore ~${hoursLeft}h` });
  } else {
    embed.setFooter({ text: `Réponses closes` });
  }

  return embed;
}

/** Rangée de boutons (éventuellement désactivés) */
function buildButtons(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('session_yes').setEmoji('✅').setLabel('Oui').setStyle(ButtonStyle.Success).setDisabled(disabled),
    new ButtonBuilder().setCustomId('session_late').setEmoji('⏱️').setLabel('En retard').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId('session_maybe').setEmoji('🤔').setLabel('Je ne sais pas').setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId('session_no').setEmoji('❌').setLabel('Absent').setStyle(ButtonStyle.Danger).setDisabled(disabled),
  );
}

/** Déplace un utilisateur d'un set vers un autre */
function moveBetweenSets(state, userId, targetKey) {
  const keys = ['yes', 'late', 'maybe', 'no'];
  for (const k of keys) {
    if (!state[k]) state[k] = new Set();
    state[k].delete(userId);
  }
  state[targetKey].add(userId);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setDescription('Créer une session RP avec présences en direct (Oui / En retard / Je ne sais pas / Absent).')
    .addStringOption(opt =>
      opt.setName('titre')
        .setDescription("Titre de la session (ex: Session RP Old Town Western)")
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('date')
        .setDescription("Date affichée (ex: Vendredi 25 juillet)")
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('horaire')
        .setDescription("Horaire affiché (ex: 18h30)")
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('psn')
        .setDescription("PSN du lanceur")
        .setRequired(true))
    // Optionnel : ping d’un rôle ou d’un @everyone via texte libre, si tu veux
    .addStringOption(opt =>
      opt.setName('ping')
        .setDescription("Texte/mention à ping avant l'embed (optionnel, ex: @Citoyen [OS])")
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', flags: MessageFlags.Ephemeral });
    }

    const title = interaction.options.getString('titre', true);
    const date = interaction.options.getString('date', true);
    const horaire = interaction.options.getString('horaire', true);
    const psn = interaction.options.getString('psn', true);
    const ping = interaction.options.getString('ping', false);

    // Initialise l'état
    const state = {
      yes: new Set(),
      late: new Set(),
      maybe: new Set(),
      no: new Set(),
      expiresAt: Date.now() + DISABLE_AFTER_MS,
    };

    // Compose le message
    const embed = buildEmbed({ title, date, horaire, psn, guild: interaction.guild }, state);
    const components = [buildButtons(false)];

    // Envoi (avec ping si fourni)
    const content = ping ? `${ping}` : undefined;
    const sent = await interaction.reply({
      content,
      embeds: [embed],
      components,
      fetchReply: true,
    });

    // Enregistre l'état
    sessionsState.set(sent.id, {
      ...state,
      title,
      date,
      horaire,
      psn,
      channelId: sent.channelId,
      messageId: sent.id,
      guildId: interaction.guildId,
    });

    // Planifie la désactivation des boutons après 24h
    setTimeout(async () => {
      const s = sessionsState.get(sent.id);
      if (!s) return; // déjà nettoyé
      try {
        const expiredEmbed = buildEmbed({ title, date, horaire, psn, guild: interaction.guild }, s);
        await sent.edit({ embeds: [expiredEmbed], components: [buildButtons(true)] });
      } catch (e) {
        // ignore
      }
    }, DISABLE_AFTER_MS);
  },
};

/**
 * Gestionnaire global des interactions bouton pour la commande /session
 * À mettre dans votre setup d'événements, si ce n'est pas déjà le cas dans votre bot :
 * client.on('interactionCreate', handlerDeBoutonsSession);
 *
 * Si votre bot a déjà un multiplexeur d'interactions, intégrez la logique ci-dessous.
 */
module.exports.handleSessionButtons = async function handleSessionButtons(interaction) {
  if (!interaction.isButton()) return;
  const ids = new Set(['session_yes', 'session_late', 'session_maybe', 'session_no']);
  if (!ids.has(interaction.customId)) return;

  const msgId = interaction.message.id;
  const state = sessionsState.get(msgId);
  if (!state) {
    return interaction.reply({ content: 'Cette session n’est plus active.', ephemeral: true });
  }

  // Expiré ?
  if (Date.now() > state.expiresAt) {
    try {
      const embed = buildEmbed(
        { title: state.title, date: state.date, horaire: state.horaire, psn: state.psn, guild: interaction.guild },
        state
      );
      await interaction.update({ embeds: [embed], components: [buildButtons(true)] });
    } catch {
      await interaction.reply({ content: 'Les réponses sont closes depuis 24h.', ephemeral: true });
    }
    return;
  }

  // Détermine le set cible
  const target =
    interaction.customId === 'session_yes' ? 'yes' :
    interaction.customId === 'session_late' ? 'late' :
    interaction.customId === 'session_maybe' ? 'maybe' :
    'no';

  // Met à jour l'état
  moveBetweenSets(state, interaction.user.id, target);

  // Reconstruit et édite
  const embed = buildEmbed(
    { title: state.title, date: state.date, horaire: state.horaire, psn: state.psn, guild: interaction.guild },
    state
  );

  await interaction.update({ embeds: [embed], components: [buildButtons(false)] });
};
