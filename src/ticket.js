// src/ticket.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

require('dotenv').config({ path: './id.env' });

const {
  OPEN_TICKET_CATEGORY_ID,
  CLOSED_TICKET_CATEGORY_ID,
  STAFF_ROLE_ID,
  LOG_TICKET_CHANNEL_ID,   // optionnel : salon logs
  TICKET_BANNER_URL,       // optionnel : bannière du panel
  TICKET_FOOTER_TEXT,      // optionnel : texte footer
} = process.env;

/* ────────────────────────────────────────────────────────────
 * Raisons (labels + emojis + valeurs stables)
 * ──────────────────────────────────────────────────────────── */
const REASONS = [
  { label: 'Demande particulière',   value: 'demande_particuliere', emoji: '📝' },
  { label: 'Création de projet',     value: 'creation_projet',      emoji: '📦' },
  { label: 'Dépôt dossier illégal',  value: 'depot_dossier',        emoji: '🕵️' },
  { label: 'Wipe / mort RP',         value: 'wipe_mort_rp',         emoji: '⚰️' },
  { label: 'Demande scène staff',    value: 'demande_scene_staff',  emoji: '🎭' },
  { label: 'Problème groupe/joueur', value: 'probleme_groupe',      emoji: '👥' },
  { label: 'Question pertinente',    value: 'question_pertinente',  emoji: '❓' },
];
const reasonByValue = (v) => REASONS.find(r => r.value === v) || { label: v, emoji: '📌', value: v };

/* ────────────────────────────────────────────────────────────
 * UI helpers
 * ──────────────────────────────────────────────────────────── */
function panelEmbed() {
  return new EmbedBuilder()
    .setColor(0x0ea5e9) // bleu moderne
    .setAuthor({ name: 'OTW • Support', iconURL: 'https://emoji.discadia.com/emojis/52a43e3c-c3f7-4d3d-8c3d-9a9e06fc1f3f.png' })
    .setTitle('🎫 Ouvrir un ticket')
    .setDescription([
      'Bienvenue sur le centre d’aide **OTW**. Sélectionne ci-dessous la **raison** de ton ticket.',
      '',
      '• Réponse **rapide** par un membre du **STAFF**',
      '• Merci d’être **précis** et **courtois**',
      '• Les tickets **inactifs** peuvent être fermés automatiquement',
    ].join('\n'))
    .addFields(
      { name: '📌 Comment ça marche ?', value: 'Choisis une catégorie → un salon privé s’ouvre → explique ta demande.' },
      { name: '⏱️ Disponibilité', value: 'Le staff traite les tickets dès que possible. Merci de patienter calmement.' }
    )
    .setImage(TICKET_BANNER_URL || 'https://i.imgur.com/8H1w8jS.png')
    .setFooter({ text: TICKET_FOOTER_TEXT || 'OTW — Centre de support' })
    .setTimestamp();
}

function selectMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('ticket_reason_select')
      .setPlaceholder('Choisis une raison…')
      .addOptions(REASONS.map(r => ({
        label: r.label,
        value: r.value,
        emoji: r.emoji,
        description: 'Créer un ticket pour cette raison',
      })))
  );
}

function ticketWelcomeEmbed(userTag, reason) {
  return new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle(`${reason.emoji} Ticket — ${userTag}`)
    .setDescription([
      `**Raison :** ${reason.label}`,
      '',
      'Explique ton besoin en **un ou deux messages clairs** (captures bienvenues).',
      'Un membre de l’équipe **STAFF** va te répondre au plus vite. 🙌',
    ].join('\n'))
    .setFooter({ text: 'OTW — Support' })
    .setTimestamp();
}

function closedEmbed() {
  return new EmbedBuilder()
    .setColor(0x94a3b8)
    .setTitle('🔒 Ticket fermé')
    .setDescription('Ce ticket est fermé. Tu peux **réouvrir** si nécessaire ou **supprimer**.')
    .setTimestamp();
}

function reopenedEmbed() {
  return new EmbedBuilder()
    .setColor(0x60a5fa)
    .setTitle('🔓 Ticket réouvert')
    .setDescription('Le ticket a été réouvert. Explique ton besoin pour relancer la prise en charge.')
    .setTimestamp();
}

const closeButtonRow = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('close_ticket').setLabel('Fermer').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
);

const closedButtonsRow = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('reopen_ticket').setLabel('Réouvrir').setEmoji('🔓').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId('delete_ticket').setLabel('Supprimer').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
);

/* ────────────────────────────────────────────────────────────
 * Utils
 * ──────────────────────────────────────────────────────────── */
async function getCategory(guild, categoryId) {
  if (!categoryId) return null;
  try {
    const cat = await guild.channels.fetch(categoryId).catch(() => null);
    return (cat && cat.type === 4) ? cat : null; // 4 = Category
  } catch { return null; }
}

async function logIfPossible(guild, payload) {
  if (!LOG_TICKET_CHANNEL_ID) return;
  try {
    const ch = await guild.channels.fetch(LOG_TICKET_CHANNEL_ID).catch(() => null);
    if (!ch || !ch.isTextBased()) return;
    await ch.send(payload).catch(() => {});
  } catch {}
}

async function findExistingOpenTicket(guild, userId) {
  const openCat = await getCategory(guild, OPEN_TICKET_CATEGORY_ID);
  if (!openCat) return null;
  try {
    const children = [...openCat.children.cache.values()];
    for (const ch of children) {
      if (!ch || ch.type !== 0) continue; // 0 = text
      if (ch.topic?.includes(`UID:${userId}`) || ch.name.includes(userId)) return ch;
    }
  } catch {}
  return null;
}

/* ────────────────────────────────────────────────────────────
 * Panel
 * ──────────────────────────────────────────────────────────── */
async function sendTicketPanel(channel) {
  // évite les doublons récents
  const fetched = await channel.messages.fetch({ limit: 30 }).catch(() => null);
  const already = fetched && [...fetched.values()].some(m =>
    m.embeds?.[0]?.title?.includes('Ouvrir un ticket') ||
    m.components?.[0]?.components?.[0]?.customId === 'ticket_reason_select'
  );
  if (already) return;

  await channel.send({ embeds: [panelEmbed()], components: [selectMenu()] });
}

/* ────────────────────────────────────────────────────────────
 * Interactions
 * ──────────────────────────────────────────────────────────── */
async function handleTicketInteraction(interaction) {
  const guild = interaction.guild;
  if (!guild) return;

  // Sélecteur → création
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_reason_select') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const openCat  = await getCategory(guild, OPEN_TICKET_CATEGORY_ID);
    const closedCat = await getCategory(guild, CLOSED_TICKET_CATEGORY_ID);
    if (!openCat || !closedCat) {
      return interaction.editReply('❌ Système de tickets non configuré (catégories manquantes).');
    }

    const existing = await findExistingOpenTicket(guild, interaction.user.id);
    if (existing) {
      return interaction.editReply(`ℹ️ Tu as déjà un ticket ouvert : ${existing}`);
    }

    const choice = interaction.values[0];
    const reason = reasonByValue(choice);

    try {
      const ch = await guild.channels.create({
        name: `ticket-${interaction.user.username}`.toLowerCase().slice(0, 90),
        type: 0, // text
        parent: openCat.id,
        topic: `Ticket de ${interaction.user.tag} — ${reason.label} • UID:${interaction.user.id}`,
        permissionOverwrites: [
          { id: guild.id,            deny: ['ViewChannel'] },
          { id: interaction.user.id, allow: ['ViewChannel','SendMessages','ReadMessageHistory','AttachFiles','EmbedLinks'] },
          { id: STAFF_ROLE_ID,        allow: ['ViewChannel','SendMessages','ReadMessageHistory','ManageMessages'] },
        ],
      });

      await ch.send({
        content: `${interaction.user}`,
        embeds: [ticketWelcomeEmbed(interaction.user.tag, reason)],
        components: [closeButtonRow()],
        allowedMentions: { users: [interaction.user.id] },
      });

      await logIfPossible(guild, `🆕 Ticket ouvert par ${interaction.user} — **${reason.label}** → ${ch}`);

      return interaction.editReply({ content: `✅ Ticket créé : ${ch}`, flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error('Erreur création ticket :', err);
      return interaction.editReply({ content: '❌ Impossible de créer le ticket.', flags: MessageFlags.Ephemeral });
    }
  }

  // Fermer
  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: '❌ Permission refusée.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const closedCat = await getCategory(interaction.guild, CLOSED_TICKET_CATEGORY_ID);
    if (!closedCat) return interaction.editReply('❌ Catégorie « tickets fermés » introuvable.');

    try {
      await interaction.channel.setParent(closedCat.id, { lockPermissions: false });
      await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false }).catch(()=>{});
      await interaction.channel.send({ embeds: [closedEmbed()], components: [closedButtonsRow()] });

      await logIfPossible(interaction.guild, `🔒 Ticket fermé : ${interaction.channel} par ${interaction.user}`);
      return interaction.editReply({ content: '🔒 Ticket fermé.', flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error('Erreur fermeture ticket :', err);
      return interaction.editReply({ content: '❌ Impossible de fermer ce ticket.', flags: MessageFlags.Ephemeral });
    }
  }

  // Réouvrir
  if (interaction.isButton() && interaction.customId === 'reopen_ticket') {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: '❌ Permission refusée.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const openCat = await getCategory(interaction.guild, OPEN_TICKET_CATEGORY_ID);
    if (!openCat) return interaction.editReply('❌ Catégorie « tickets ouverts » introuvable.');

    try {
      await interaction.channel.setParent(openCat.id, { lockPermissions: false });
      await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false }).catch(()=>{});
      await interaction.channel.send({ embeds: [reopenedEmbed()], components: [closeButtonRow()] });

      await logIfPossible(interaction.guild, `🔓 Ticket réouvert : ${interaction.channel} par ${interaction.user}`);
      return interaction.editReply({ content: '🔓 Ticket réouvert.', flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error('Erreur réouverture ticket :', err);
      return interaction.editReply({ content: '❌ Impossible de réouvrir ce ticket.', flags: MessageFlags.Ephemeral });
    }
  }

  // Supprimer
  if (interaction.isButton() && interaction.customId === 'delete_ticket') {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: '❌ Permission refusée.', flags: MessageFlags.Ephemeral });
    }
    await interaction.reply({ content: '🗑️ Suppression du ticket…', flags: MessageFlags.Ephemeral });
    await logIfPossible(interaction.guild, `🗑️ Ticket supprimé : ${interaction.channel} par ${interaction.user}`);
    setTimeout(() => interaction.channel.delete().catch(() => {}), 1200);
  }
}

module.exports = {
  sendTicketPanel,
  handleTicketInteraction,
};
