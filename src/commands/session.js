const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

const COLOR_RED = 0xff0000;
const DISABLE_AFTER_MS = 24 * 60 * 60 * 1000; // 24h

// -------- Helpers d'affichage --------
function formatMentions(arr) {
  if (!arr || arr.length === 0) return '—';
  return arr.map(id => `<@${id}>`).join('  ');
}

// Parse un champ "Membres présents (X) :" -> renvoie array d'IDs
function parseMentionsField(fieldValue) {
  if (!fieldValue || fieldValue.trim() === '—') return [];
  const ids = [];
  const regex = /<@(\d{5,})>/g;
  let m;
  while ((m = regex.exec(fieldValue)) !== null) {
    ids.push(m[1]);
  }
  return ids;
}

// Reconstruit l'état (yes/late/maybe/no) à partir de l'embed actuel
function stateFromEmbed(embed) {
  // On trouve les 4 champs par leur nom (tolérant à la langue/ordre)
  const pick = (labelStartsWith) =>
    embed.fields.find(f => (f.name || '').toLowerCase().startsWith(labelStartsWith))?.value || '—';

  const yesV   = pick('membres présents');
  const lateV  = pick('membres en retard');
  const maybeV = pick('membres indécis');
  const noV    = pick('membres absents');

  return {
    yes:   new Set(parseMentionsField(yesV)),
    late:  new Set(parseMentionsField(lateV)),
    maybe: new Set(parseMentionsField(maybeV)),
    no:    new Set(parseMentionsField(noV)),
  };
}

function buildEmbedContent({ title, date, horaire, psn }, state, createdTs) {
  const yes   = state.yes.size;
  const late  = state.late.size;
  const maybe = state.maybe.size;
  const no    = state.no.size;

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
      { name: `Membres présents (${yes}) :`, value: formatMentions([...state.yes]) },
      { name: `Membres en retard (${late}) :`, value: formatMentions([...state.late]) },
      { name: `Membres indécis (${maybe}) :`, value: formatMentions([...state.maybe]) },
      { name: `Membres absents (${no}) :`, value: formatMentions([...state.no]) },
    );

  const left = Math.max(0, (createdTs + DISABLE_AFTER_MS) - Date.now());
  embed.setFooter({ text: left > 0
    ? `Réponses ouvertes encore ~${Math.ceil(left / (60 * 60 * 1000))}h`
    : `Réponses closes`
  });

  return embed;
}

function buttons(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('session_yes').setEmoji('✅').setLabel('Oui').setStyle(ButtonStyle.Success).setDisabled(disabled),
    new ButtonBuilder().setCustomId('session_late').setEmoji('⏱️').setLabel('En retard').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId('session_maybe').setEmoji('🤔').setLabel('Je ne sais pas').setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId('session_no').setEmoji('❌').setLabel('Absent').setStyle(ButtonStyle.Danger).setDisabled(disabled),
  );
}

// -------- Commande --------
module.exports = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setDescription('Créer une session RP avec présences en direct (Oui / En retard / Je ne sais pas / Absent).')
    .addStringOption(opt => opt.setName('titre').setDescription("Titre (ex: SESSION OTW)").setRequired(true))
    .addStringOption(opt => opt.setName('date').setDescription("Date affichée (ex: 09 Juillet)").setRequired(true))
    .addStringOption(opt => opt.setName('horaire').setDescription("Horaire (ex: 20h00)").setRequired(true))
    .addStringOption(opt => opt.setName('psn').setDescription("PSN du lanceur (ex: nzxow)").setRequired(true))
    .addStringOption(opt => opt.setName('ping').setDescription("Mention avant l'embed (optionnel)").setRequired(false)),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', flags: MessageFlags.Ephemeral });
    }

    const title   = interaction.options.getString('titre', true);
    const date    = interaction.options.getString('date', true);
    const horaire = interaction.options.getString('horaire', true);
    const psn     = interaction.options.getString('psn', true);
    const ping    = interaction.options.getString('ping') || undefined;

    const createdTs = Date.now(); // timestamp de référence pour l’embed initial
    const state = { yes: new Set(), late: new Set(), maybe: new Set(), no: new Set() };
    const embed = buildEmbedContent({ title, date, horaire, psn }, state, createdTs);

    // ⚠️ fetchReply déprécié → on répond puis on fetch la réponse
    await interaction.reply({
      content: ping,
      embeds: [embed],
      components: [buttons(false)],
    });
    const sent = await interaction.fetchReply();

    // Plan de désactivation auto (si le process tient)
    setTimeout(async () => {
      try {
        const msg = await interaction.channel.messages.fetch(sent.id).catch(() => null);
        if (!msg) return;
        const expired = (msg.createdTimestamp + DISABLE_AFTER_MS) <= Date.now();
        if (!expired) return; // déjà rafraîchi par clics etc.
        const emb = msg.embeds[0];
        if (!emb) return;
        // reconstruit état depuis embed pour footer cohérent
        const parsed = stateFromEmbed(emb.data || emb);
        const edited = buildEmbedContent({ title, date, horaire, psn }, parsed, msg.createdTimestamp);
        await msg.edit({ embeds: [edited], components: [buttons(true)] });
      } catch {}
    }, DISABLE_AFTER_MS);
  },
};

// -------- Handler de boutons (STATELESS) --------
module.exports.handleSessionButtons = async function handleSessionButtons(interaction) {
  if (!interaction.isButton()) return;
  if (!['session_yes','session_late','session_maybe','session_no'].includes(interaction.customId)) return;

  const msg = interaction.message;
  const emb = msg.embeds?.[0];
  if (!emb) {
    return interaction.reply({ content: 'Impossible de lire la session.', flags: MessageFlags.Ephemeral });
  }

  // Reconstitue l’état actuel
  const s = stateFromEmbed(emb.data || emb);

  // Expiration basée sur la date du message
  const expired = (msg.createdTimestamp + DISABLE_AFTER_MS) <= Date.now();
  if (expired) {
    const details = {
      title: emb.title?.replace(/^📅\s*/, '') || 'SESSION',
      date: (emb.description?.match(/\*\*Date :\*\*\s*(.+)/)?.[1] || '').split('\n')[0],
      horaire: (emb.description?.match(/\*\*Horaire :\*\*\s*(.+)/)?.[1] || '').split('\n')[0],
      psn: (emb.description?.match(/\*\*PSN du lanceur :\*\*\s*(.+)/)?.[1] || '').split('\n')[0],
    };
    const edited = buildEmbedContent(details, s, msg.createdTimestamp);
    return interaction.update({ embeds: [edited], components: [buttons(true)] });
  }

  // Détermine le set cible
  const userId = interaction.user.id;
  for (const key of ['yes','late','maybe','no']) s[key].delete(userId);
  const target =
    interaction.customId === 'session_yes'   ? 'yes'   :
    interaction.customId === 'session_late'  ? 'late'  :
    interaction.customId === 'session_maybe' ? 'maybe' : 'no';
  s[target].add(userId);

  // Récupère les infos fixes depuis l’embed
  const details = {
    title: emb.title?.replace(/^📅\s*/, '') || 'SESSION',
    date: (emb.description?.match(/\*\*Date :\*\*\s*(.+)/)?.[1] || '').split('\n')[0],
    horaire: (emb.description?.match(/\*\*Horaire :\*\*\s*(.+)/)?.[1] || '').split('\n')[0],
    psn: (emb.description?.match(/\*\*PSN du lanceur :\*\*\s*(.+)/)?.[1] || '').split('\n')[0],
  };

  const newEmbed = buildEmbedContent(details, s, msg.createdTimestamp);
  await interaction.update({ embeds: [newEmbed], components: [buttons(false)] });
};
