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
  LOG_TICKET_CHANNEL_ID, // optionnel: salon logs
} = process.env;

/* ──────────────────────────────────────────────────────────────────────────
 *  Raisons (UX) — labels + emojis + valeurs stables
 * ────────────────────────────────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────────────────────────────────
 *  Embeds & UI
 * ────────────────────────────────────────────────────────────────────────── */
function panelEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎫 Ouvrir un ticket')
    .setDescription([
      'Bienvenue ! Sélectionne ci-dessous la raison de ton ticket.',
      'Un membre du **STAFF** te répondra au plus vite.',
      '',
      '⚠️ *Tout ticket inactif pourra être fermé.*'
    ].join('\n'))
    .setFooter({ text: 'OTW — Support' })
    .setTimestamp();
}

function selectMenu() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_reason_select')
    .setPlaceholder('Choisis une raison…')
    .addOptions(REASONS.map(r => ({
      label: r.label,
      value: r.value,
      emoji: r.emoji,
      description: 'Ouvrir un ticket pour cette raison',
    })));

  return new ActionRowBuilder().addComponents(menu);
}

function ticketWelcomeEmbed(userTag, reason) {
  return new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`🎫 Ticket — ${userTag}`)
    .setDescription([
      `**Raison:** ${reason.emoji} ${reason.label}`,
      '',
      'Merci de détailler ton souci / ta demande.',
      'Un membre du **STAFF** va prendre le ticket en charge. 🙌'
    ].join('\n'))
    .setFooter({ text: 'OTW — Support' })
    .setTimestamp();
}

function closedEmbed() {
  return new EmbedBuilder()
    .setColor(0x95A5A6)
    .setTitle('🔒 Ticket fermé')
    .setDescription('Ce ticket est maintenant fermé. Tu peux le réouvrir si nécessaire, ou le supprimer.')
    .setTimestamp();
}

function reopenedEmbed() {
  return new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle('🔓 Ticket réouvert')
    .setDescription('Le ticket a été réouvert. Explique ton besoin pour que l’équipe puisse t’aider.')
    .setTimestamp();
}

const closeButtonRow = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('close_ticket').setLabel('Fermer').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
  );

const closedButtonsRow = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('reopen_ticket').setLabel('Réouvrir').setEmoji('🔓').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('delete_ticket').setLabel('Supprimer').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
  );

/* ──────────────────────────────────────────────────────────────────────────
 *  Utils
 * ────────────────────────────────────────────────────────────────────────── */
async function getCategory(guild, categoryId) {
  if (!categoryId) return null;
  try {
    const cat = await guild.channels.fetch(categoryId).catch(() => null);
    return (cat && cat.type === 4) ? cat : null; // 4 = GuildCategory
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
  // Cherche un canal dans la catégorie "open" qui contient l'id user dans le topic ou le nom
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

/* ──────────────────────────────────────────────────────────────────────────
 *  Panel d’ouverture
 * ────────────────────────────────────────────────────────────────────────── */
async function sendTicketPanel(channel) {
  // Vérifie la présence d’un panel récent pour éviter le spam
  const fetched = await channel.messages.fetch({ limit: 30 }).catch(() => null);
  if (fetched && [...fetched.values()].some(m => m.components?.[0]?.components?.[0]?.customId === 'ticket_reason_select')) {
    return;
  }

  await channel.send({
    embeds: [panelEmbed()],
    components: [selectMenu()],
  });
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Interactions
 * ────────────────────────────────────────────────────────────────────────── */
async function handleTicketInteraction(interaction) {
  const guild = interaction.guild;
  if (!guild) return;

  // 1) Sélecteur → créer ticket
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_reason_select') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Vérifs catégories
    const openCat  = await getCategory(guild, OPEN_TICKET_CATEGORY_ID);
    const closedCat = await getCategory(guild, CLOSED_TICKET_CATEGORY_ID);
    if (!openCat || !closedCat) {
      return interaction.editReply('❌ Le système de tickets n’est pas configuré (catégories manquantes).');
    }

    // Un ticket ouvert par utilisateur maximum
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
          { id: guild.id,           deny: ['ViewChannel'] },
          { id: interaction.user.id, allow: ['ViewChannel','SendMessages','ReadMessageHistory','AttachFiles','EmbedLinks'] },
          { id: STAFF_ROLE_ID,       allow: ['ViewChannel','SendMessages','ReadMessageHistory','ManageMessages'] },
        ],
      });

      await ch.send({
        content: `${interaction.user}`, // ping l’auteur
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

  // 2) Fermer → déplacer + boutons réouvrir/supprimer
  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: '❌ Permission refusée.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const closedCat = await getCategory(interaction.guild, CLOSED_TICKET_CATEGORY_ID);
    if (!closedCat) {
      return interaction.editReply('❌ Catégorie « tickets fermés » introuvable.');
    }

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

  // 3) Réouvrir → remettre en catégorie « open »
  if (interaction.isButton() && interaction.customId === 'reopen_ticket') {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: '❌ Permission refusée.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const openCat = await getCategory(interaction.guild, OPEN_TICKET_CATEGORY_ID);
    if (!openCat) {
      return interaction.editReply('❌ Catégorie « tickets ouverts » introuvable.');
    }

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

  // 4) Supprimer → delete le salon
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
