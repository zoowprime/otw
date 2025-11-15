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
    .setDescription('Consulte ta carte grise de cheval / charrette.'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const { horseId, cartId } = getStable(userId);

    if (!horseId && !cartId) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x145a32)
          .setTitle('Écurie — Carte grise')
          .setDescription(
            '🐎 **Dossier de monture OTW**\n' +
            '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n' +
            'Tu ne possèdes actuellement **aucun cheval** ni **charrette**.\n' +
            'Passe par une **écurie** pour en acheter une !'
          )
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const emb = new EmbedBuilder()
      .setColor(0x145a32)
      .setTitle('Écurie — Carte grise officielle')
      .setDescription(
        '🐎 **Dossier de monture OTW**\n' +
        '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n' +
        'Toutes les informations sur tes montures sont répertoriées ci-dessous.\n' +
        'Les actions de gestion se trouvent en bas de ce panneau.'
      )
      .addFields(
        {
          name: 'Propriétaire',
          value: interaction.user.toString(),
          inline: true,
        },
        {
          name: 'ID joueur',
          value: `\`${userId}\``,
          inline: true,
        },
      );

    if (horseId) {
      emb.addFields({
        name: '🐎 Cheval enregistré',
        value:
          `• **Nom / Robe :** ${humanize(horseId)}\n` +
          `• **Type :** Cheval de selle\n`,
        inline: false,
      });
    }

    if (cartId) {
      emb.addFields({
        name: '🚚 Charrette enregistrée',
        value:
          `• **Modèle :** ${humanize(cartId)}\n` +
          `• **Usage :** Transport & logistique RP\n`,
        inline: false,
      });
    }

    emb.addFields({
      name: 'Gestion',
      value:
        '🐎 *Relâcher ton cheval* : il disparaîtra définitivement.\n' +
        '🪓 *Détruire ta charrette* : elle ne sera plus disponible.\n' +
        '\nCes actions sont **définitives** — utilise-les avec précaution.',
      inline: false,
    });

    emb.setFooter({ text: 'OTW — Écurie officielle' });

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
      emb.addFields({
        name: 'Action effectuée',
        value: '🐎 Ton cheval a été **relâché** dans les plaines de Belleshore.',
      });
    }
    if (click.customId === 'ecurie_destroy_cart') {
      clearPlayerCart(userId);
      emb.addFields({
        name: 'Action effectuée',
        value: '🪓 Ta charrette a été **détruite** et retirée des registres.',
      });
    }

    await click.update({ embeds: [emb], components: [] });
  }
};
