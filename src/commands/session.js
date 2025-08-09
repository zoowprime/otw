// src/commands/session.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const COLOR_RED = 0xff0000;
const DISABLE_AFTER_MS = 24 * 60 * 60 * 1000; // 24h

// ---------- Persistence ----------
const dataDir = process.env.DATA_DIR || '/data';
const SESSIONS_PATH = path.join(dataDir, 'sessions.json');

function ensureDataDir() {
  try { if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true }); }
  catch (_) {}
}
ensureDataDir();

function loadSessionsFromDisk() {
  try {
    if (!fs.existsSync(SESSIONS_PATH)) return {};
    const raw = fs.readFileSync(SESSIONS_PATH, 'utf8');
    const json = JSON.parse(raw || '{}');
    // hydrate Sets
    for (const k of Object.keys(json)) {
      const s = json[k];
      s.yes   = new Set(s.yes   || []);
      s.late  = new Set(s.late  || []);
      s.maybe = new Set(s.maybe || []);
      s.no    = new Set(s.no    || []);
    }
    return json;
  } catch {
    return {};
  }
}

function saveSessionsToDisk(obj) {
  try {
    const serial = {};
    for (const k of Object.keys(obj)) {
      const s = obj[k];
      serial[k] = {
        ...s,
        yes:   Array.from(s.yes || []),
        late:  Array.from(s.late || []),
        maybe: Array.from(s.maybe || []),
        no:    Array.from(s.no || []),
      };
    }
    fs.writeFileSync(SESSIONS_PATH, JSON.stringify(serial, null, 2), 'utf8');
  } catch {
    // ignore
  }
}

// État mémoire (messageId -> state)
const sessionsState = new Map();
// Préload
const preload = loadSessionsFromDisk();
for (const id of Object.keys(preload)) sessionsState.set(id, preload[id]);

// Nettoyage des expirés au démarrage
(function cleanupAtStart() {
  let changed = false;
  for (const [id, s] of sessionsState) {
    if (!s.expiresAt || Date.now() > s.expiresAt) {
      sessionsState.delete(id);
      changed = true;
    }
  }
  if (changed) saveSessionsToDisk(Object.fromEntries(sessionsState));
})();

// ---------- UI helpers ----------
function formatMentions(set) {
  if (!set || set.size === 0) return '—';
  return Array.from(set).map(id => `<@${id}>`).join('  ');
}

function buildEmbed({ title, date, horaire, psn }, state) {
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
  embed.setFooter({ text: left > 0
    ? `Réponses ouvertes encore ~${Math.ceil(left / (60 * 60 * 1000))}h`
    : `Réponses closes`
  });

  return embed;
}

function buildButtons(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('session_yes').setEmoji('✅').setLabel('Oui').setStyle(ButtonStyle.Success).setDisabled(disabled),
    new ButtonBuilder().setCustomId('session_late').setEmoji('⏱️').setLabel('En retard').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId('session_maybe').setEmoji('🤔').setLabel('Je ne sais pas').setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId('session_no').setEmoji('❌').setLabel('Absent').setStyle(ButtonStyle.Danger).setDisabled(disabled),
  );
}

function moveBetweenSets(state, userId, targetKey) {
  const keys = ['yes', 'late', 'maybe', 'no'];
  for (const k of keys) {
    if (!state[k]) state[k] = new Set();
    state[k].delete(userId);
  }
  state[targetKey].add(userId);
}

// ---------- Command ----------
module.exports = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setDescription('Créer une session RP avec présences en direct (Oui / En retard / Je ne sais pas / Absent).')
    .addStringOption(opt =>
      opt.setName('titre').setDescription("Titre (ex: Session RP Old Town Western)").setRequired(true))
    .addStringOption(opt =>
      opt.setName('date').setDescription("Date affichée (ex: Vendredi 25 juillet)").setRequired(true))
    .addStringOption(opt =>
      opt.setName('horaire').setDescription("Horaire affiché (ex: 18h30)").setRequired(true))
    .addStringOption(opt =>
      opt.setName('psn').setDescription("PSN du lanceur").setRequired(true))
    .addStringOption(opt =>
      opt.setName('ping').setDescription("Mention avant l'embed (optionnel)").setRequired(false)),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', flags: MessageFlags.Ephemeral });
    }

    const title   = interaction.options.getString('titre', true);
    const date    = interaction.options.getString('date', true);
    const horaire = interaction.options.getString('horaire', true);
    const psn     = interaction.options.getString('psn', true);
    const ping    = interaction.options.getString('ping', false) || undefined;

    const state = {
      yes: new Set(),
      late: new Set(),
      maybe: new Set(),
      no: new Set(),
      expiresAt: Date.now() + DISABLE_AFTER_MS,
      title, date, horaire, psn,
      guildId: interaction.guildId,
    };

    const embed = buildEmbed({ title, date, horaire, psn }, state);
    const components = [buildButtons(false)];

    const sent = await interaction.reply({
      content: ping,
      embeds: [embed],
      components,
      fetchReply: true,
    });

    // Sauvegarde mémoire + disque
    state.channelId = sent.channelId;
    state.messageId = sent.id;
    sessionsState.set(sent.id, state);
    saveSessionsToDisk(Object.fromEntries(sessionsState));

    // Désactivation auto après 24h
    setTimeout(async () => {
      const s = sessionsState.get(sent.id);
      if (!s) return;
      try {
        const expiredEmbed = buildEmbed({ title, date, horaire, psn }, s);
        await sent.edit({ embeds: [expiredEmbed], components: [buildButtons(true)] });
      } catch {}
    }, DISABLE_AFTER_MS);
  },
};

// ---------- Boutons ----------
module.exports.handleSessionButtons = async function handleSessionButtons(interaction) {
  if (!interaction.isButton()) return;
  if (!['session_yes','session_late','session_maybe','session_no'].includes(interaction.customId)) return;

  const msgId = interaction.message.id;
  let state = sessionsState.get(msgId);

  // Fallback : recharger depuis disque si le process a redémarré
  if (!state) {
    const fromDisk = loadSessionsFromDisk();
    if (fromDisk[msgId]) {
      state = fromDisk[msgId];
      // re-hydrate sets (au cas où)
      state.yes   = new Set(state.yes);
      state.late  = new Set(state.late);
      state.maybe = new Set(state.maybe);
      state.no    = new Set(state.no);
      sessionsState.set(msgId, state);
    }
  }

  if (!state) {
    return interaction.reply({ content: 'Cette session n’est plus active.', ephemeral: true });
  }

  if (Date.now() > state.expiresAt) {
    const embed = buildEmbed({ title: state.title, date: state.date, horaire: state.horaire, psn: state.psn }, state);
    return interaction.update({ embeds: [embed], components: [buildButtons(true)] });
  }

  const target =
    interaction.customId === 'session_yes'   ? 'yes'   :
    interaction.customId === 'session_late'  ? 'late'  :
    interaction.customId === 'session_maybe' ? 'maybe' : 'no';

  moveBetweenSets(state, interaction.user.id, target);

  const embed = buildEmbed(
    { title: state.title, date: state.date, horaire: state.horaire, psn: state.psn },
    state
  );

  // Sauvegarde
  sessionsState.set(msgId, state);
  saveSessionsToDisk(Object.fromEntries(sessionsState));

  await interaction.update({ embeds: [embed], components: [buildButtons(false)] });
};
