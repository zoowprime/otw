// src/commands/import_arme.js
const {
  SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder, ComponentType, MessageFlags
} = require('discord.js');

const { WEAPONS } = require('../data/catalogWeapons');
const {
  getShopIdFromMember, getOwnerId, envVarForShop,
  debitOwnerEnterprise, incrementStock
} = require('../data/shopsData');

const IMPORT_CHANNEL_ID = process.env.ARME_IMPORT_CHANNEL;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('arme')
    .setDescription('Gestion des imports d’armes')
    .addSubcommand(sc => sc
      .setName('import')
      .setDescription('Importer une arme (armureries uniquement)')
    ),

  async execute(interaction) {
    if (interaction.options.getSubcommand() !== 'import') return;

    // 1) Déterminer la boutique depuis le rôle
    const shopId = getShopIdFromMember(interaction.member);

    // 🔎 DEBUG CONSOLE
    try {
      const roleIds = [...interaction.member.roles.cache.keys()];
      console.log('[arme import] user=', interaction.user.id, 'roles=', roleIds, 'shopId=', shopId);
    } catch (_) {}

    if (!shopId || !shopId.startsWith('armurerie_')) {
      return interaction.reply({
        content: '❌ Cette commande est réservée aux **armureries**.',
        ephemeral: true
      });
    }

    // 2) Vérifier la présence du patron configuré pour ce shop
    const ownerId = getOwnerId(shopId);

    // 🔎 DEBUG CONSOLE
    try {
      console.log('[arme import] envVar=', envVarForShop(shopId), 'ownerId(lu)=', ownerId);
    } catch (_) {}

    if (!ownerId) {
      const varName = envVarForShop(shopId) || 'PATRON_*_USER_ID';
      const emb = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('⛔ Aucun patron défini')
        .setDescription(
          `Boutique: **${shopId}**\n\n` +
          `➜ Renseigne la variable **${varName}** dans ton \`.env\` (ou sur Render), puis redémarre le bot.`
        )
        .setFooter({ text: 'OTW Économie' });
      return interaction.reply({ embeds: [emb], ephemeral: true });
    }

    // 3) Menu d’armes
    const menu = new StringSelectMenuBuilder()
      .setCustomId('weapon_select')
      .setPlaceholder('🔫 Choisis une arme à importer')
      .addOptions(
        WEAPONS.slice(0, 25).map(w => ({
          label: w.name,
          value: JSON.stringify({ name: w.name, price: w.importPrice }),
          description: `$${w.importPrice}`,
          emoji: '🔫',
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('📥 Import — Armurerie')
      .setDescription('Sélectionne une **arme**. Le prix sera débité du **compte entreprise** du patron.')
      .setFooter({ text: 'OTW Économie' });

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral
    });

    // 4) Attente de la sélection
    const msg = await interaction.fetchReply();
    const sel = await msg.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      time: 60_000
    }).catch(() => null);
    if (!sel) return;

    const { name, price } = JSON.parse(sel.values[0]);

    // 5) Paiement entreprise (patron)
    const pay = debitOwnerEnterprise(shopId, price);
    if (!pay.ok) {
      const errEmb = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('⛔ Paiement refusé')
        .setDescription(
          `Raison : **${pay.reason || 'inconnue'}**` +
          (pay.missingEnv ? `\nVariable manquante : **${pay.missingEnv}**` : '')
        )
        .setFooter({ text: 'OTW Économie' });

      return sel.update({ embeds: [errEmb], components: [] });
    }

    // 6) Ajout au stock
    incrementStock(shopId, 'armes', name, 1);

    // 7) Confirmation à l’utilisateur
    await sel.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('✅ Import confirmé')
          .setDescription(`**${name}** importée pour **$${price}**.\nAjoutée au stock **${shopId}** (armes).`)
          .setFooter({ text: 'OTW Économie' })
      ],
      components: []
    });

    // 8) Log dans le salon d’import (si défini)
    if (IMPORT_CHANNEL_ID) {
      interaction.client.channels.fetch(IMPORT_CHANNEL_ID)
        .then(ch => {
          ch?.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('📥 Import Arme')
                .setDescription(`**${interaction.member}** a importé **${name}** pour **$${price}**\nBoutique: **${shopId}**`)
                .setTimestamp()
                .setFooter({ text: 'OTW Économie' })
            ]
          }).catch(() => {});
        })
        .catch(() => {});
    }
  }
};
