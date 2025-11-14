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
 * Purge un salon.
 * - bulkDelete pour les messages récents (< 14 jours)
 * - delete() un par un pour les très vieux
 * Limité à environ 5000 messages pour éviter les abus.
 */
async function purgeChannel(channel) {
  let deletedTotal = 0;
  let lastId = undefined;
  const maxMessages = 5000;
  const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
  const SAFE_MARGIN = 13 * 24 * 60 * 60 * 1000; // par sécurité

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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Nettoyages de messages')
    .addSubcommand(sc =>
      sc
        .setName('channel')
        .setDescription('Supprime tous les messages du salon actuel (STAFF uniquement)')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub !== 'channel') return;

    // Vérif staff
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        embeds: [ko('⛔ Cette commande est réservée au staff.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const channel = interaction.channel;

    // Confirmation
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
  },
};