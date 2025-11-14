// src/commands/clear.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require('discord.js');

const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;

// Helpers embeds
const ok   = (t) => new EmbedBuilder().setColor(0x2ecc71).setDescription(t);
const ko   = (t) => new EmbedBuilder().setColor(0xe74c3c).setDescription(t);
const info = (t) => new EmbedBuilder().setColor(0x95a5a6).setDescription(t);

// Petite pause pour éviter les gros rate-limit
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

/**
 * Purge quasi complète d'un salon.
 * - bulkDelete pour les messages récents (< ~13 jours)
 * - delete() un par un pour les très vieux
 * Limité à environ 5000 messages pour éviter les abus.
 */
async function purgeChannel(channel) {
  let deletedTotal = 0;
  let lastId = undefined;
  const maxMessages = 5000;
  const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
  const SAFE_MARGIN = 13 * 24 * 60 * 60 * 1000; // un peu moins pour éviter les erreurs

  while (deletedTotal < maxMessages) {
    const fetched = await channel.messages.fetch({
      limit: 100,
      ...(lastId ? { before: lastId } : {})
    }).catch(() => null);

    if (!fetched || fetched.size === 0) break;

    lastId = fetched.last().id;
    const now = Date.now();

    const younger = fetched.filter(m => (now - m.createdTimestamp) < SAFE_MARGIN);
    const older   = fetched.filter(m => !younger.has(m.id));

    // Messages récents → bulkDelete
    if (younger.size > 0) {
      const deleted = await channel.bulkDelete(younger, true).catch(() => null);
      if (deleted) deletedTotal += deleted.size;
    }

    // Messages trop vieux → un par un
    for (const msg of older.values()) {
      if (deletedTotal >= maxMessages) break;
      await msg.delete().catch(() => {});
      deletedTotal++;
      await sleep(300); // évite de taper trop fort les rate-limit
    }

    if (fetched.size < 100) break; // plus rien à récupérer
  }

  return deletedTotal;
}

/**
 * Supprime un nombre précis de messages récents via bulkDelete.
 * - Limité par Discord à < 14 jours
 * - amount max 500 (option slash)
 */
async function deleteAmount(channel, amount) {
  let remaining = amount;
  let deletedTotal = 0;

  while (remaining > 0) {
    const toDelete = Math.min(remaining, 100);
    const deleted = await channel.bulkDelete(toDelete, true).catch(() => null);
    if (!deleted || deleted.size === 0) break;

    deletedTotal += deleted.size;
    remaining -= deleted.size;
    await sleep(800);
  }

  return deletedTotal;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Nettoyages de messages')
    // Purge quasi complète du salon
    .addSubcommand(sc =>
      sc
        .setName('channel')
        .setDescription('Supprime un très grand nombre de messages du salon actuel (STAFF uniquement)')
    )
    // Suppression par quantité
    .addSubcommand(sc =>
      sc
        .setName('nombre')
        .setDescription('Supprime un nombre précis de messages récents dans ce salon (STAFF uniquement)')
        .addIntegerOption(o =>
          o
            .setName('nombre')
            .setDescription('Nombre de messages à supprimer (1–500)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(500)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // Vérif staff
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        embeds: [ko('⛔ Cette commande est réservée au staff.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const channel = interaction.channel;

    // ────────────────────────────────
    // /clear channel → purge massive
    if (sub === 'channel') {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('clear_confirm')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🧹')
          .setLabel('Confirmer'),
        new ButtonBuilder()
          .setCustomId('clear_cancel')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('❌')
          .setLabel('Annuler')
      );

      const replyMsg = await interaction.reply({
        embeds: [
          info(
            `Tu es sur le point de **vider le salon** ${channel}.\n` +
            'Cette action supprimera un très grand nombre de messages (limite technique ~5000).\n\n' +
            'Es-tu sûr de vouloir continuer ?'
          ),
        ],
        components: [row],
        flags: MessageFlags.Ephemeral,
        fetchReply: true,
      });

      const button = await replyMsg
        .awaitMessageComponent({
          componentType: ComponentType.Button,
          time: 60_000,
          filter: (i) => i.user.id === interaction.user.id,
        })
        .catch(() => null);

      if (!button) {
        return interaction.editReply({
          embeds: [ko('⌛ Temps écoulé, commande annulée.')],
          components: [],
        }).catch(() => {});
      }

      if (button.customId === 'clear_cancel') {
        return button.update({
          embeds: [info('❎ Nettoyage annulé.')],
          components: [],
        });
      }

      // Confirmation → purge
      await button.update({
        embeds: [info('🧹 Nettoyage du salon en cours…')],
        components: [],
      });

      const count = await purgeChannel(channel).catch(() => -1);

      if (count < 0) {
        return interaction.editReply({
          embeds: [ko('❌ Une erreur est survenue pendant le nettoyage.')],
          components: [],
        }).catch(() => {});
      }

      return interaction.editReply({
        embeds: [ok(`✅ Nettoyage terminé : **${count}** messages supprimés dans ${channel}.`)],
        components: [],
      }).catch(() => {});
    }

    // ────────────────────────────────
    // /clear nombre → supprimer X derniers messages
    if (sub === 'nombre') {
      const amount = interaction.options.getInteger('nombre', true);

      await interaction.reply({
        embeds: [info(`🧹 Suppression de **${amount}** messages récents dans ${channel}…`)],
        flags: MessageFlags.Ephemeral,
      });

      const count = await deleteAmount(channel, amount).catch(() => -1);

      if (count < 0) {
        return interaction.editReply({
          embeds: [ko('❌ Impossible de supprimer ces messages (limite Discord ou erreur interne).')],
        }).catch(() => {});
      }

      return interaction.editReply({
        embeds: [ok(`✅ **${count}** messages ont été supprimés dans ${channel}.`)],
      }).catch(() => {});
    }
  },
};
