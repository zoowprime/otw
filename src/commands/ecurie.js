// src/commands/ecurie.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require('discord.js');

const {
  getStable,
  clearPlayerHorse,
  clearPlayerCart,
} = require('../data/stableData');

const humanize = (id) =>
  String(id).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

module.exports = {
  data: new SlashCommandBuilder()
    .setName('écurie')
    .setDescription('Affiche ton cheval / ta charrette (carte grise).'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const { horseId, cartId } = getStable(userId);

    if (!horseId && !cartId) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x145a32)
          .setDescription('🐎 Tu ne possèdes actuellement ni cheval ni charrette.')
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const emb = new EmbedBuilder()
      .setColor(0x145a32)
      .setTitle('Carte grise — Écurie')
      .addFields(
        { name: 'Propriétaire', value: interaction.user.toString(), inline: true },
      );

    if (horseId) {
      emb.addFields({
        name: 'Cheval',
        value: `🐎 **${humanize(horseId)}**`,
        inline: false,
      });
    }
    if (cartId) {
      emb.addFields({
        name: 'Charrette',
        value: `🚚 **${humanize(cartId)}**`,
        inline: false,
      });
    }

    const buttons = [];
    if (horseId) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('ecurie_release_horse')
          .setLabel('Relâcher le cheval')
          .setEmoji('🐎')
          .setStyle(ButtonStyle.Danger)
      );
    }
    if (cartId) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('ecurie_destroy_cart')
          .setLabel('Détruire la charrette')
          .setEmoji('🪓')
          .setStyle(ButtonStyle.Danger)
      );
    }

    const row = buttons.length
      ? new ActionRowBuilder().addComponents(...buttons)
      : null;

    await interaction.reply({
      embeds: [emb],
      components: row ? [row] : [],
      flags: MessageFlags.Ephemeral,
    });

    if (!row) return;

    const msg = await interaction.fetchReply();
    const click = await msg.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 90_000,
      filter: i => i.user.id === userId,
    }).catch(() => null);

    if (!click) {
      try { await msg.edit({ components: [] }); } catch {}
      return;
    }

    if (click.customId === 'ecurie_release_horse') {
      clearPlayerHorse(userId);
      emb.addFields({ name: 'Action', value: '🐎 Ton cheval a été relâché.' });
    }
    if (click.customId === 'ecurie_destroy_cart') {
      clearPlayerCart(userId);
      emb.addFields({ name: 'Action', value: '🪓 Ta charrette a été détruite.' });
    }

    await click.update({ embeds: [emb], components: [] });
  }
};
