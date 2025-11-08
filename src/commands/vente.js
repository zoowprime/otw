// src/commands/vente.js
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
  ComponentType, MessageFlags
} = require('discord.js');
const {
  getShopIdFromMember, getShopStock, decrementStock,
  getPrice, creditOwnerEnterpriseBank, incrementStock
} = require('../data/shopsData');
const { getOrCreateAccount, updateAccount } = require('../economyData');
const { addItem } = require('../data/inventoryData');

function debitPlayerCourant(userId, amount) {
  const acc = getOrCreateAccount(userId);
  acc.courant ||= { liquide: 0, banque: 0 };
  const total = (acc.courant.banque || 0) + (acc.courant.liquide || 0);
  if (total < amount) return { ok: false };

  let rest = amount;
  if (acc.courant.banque >= rest) {
    acc.courant.banque -= rest; rest = 0;
  } else {
    rest -= acc.courant.banque; acc.courant.banque = 0;
    acc.courant.liquide = Math.max(0, (acc.courant.liquide || 0) - rest); rest = 0;
  }
  updateAccount(userId, acc);
  return { ok: true };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vente')
    .setDescription('Vendre un cheval ou une arme à un joueur')
    .addUserOption(o => o.setName('target').setDescription('Client').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('target');
    if (!target || target.bot) {
      return interaction.reply({ content: '🤖 Cible invalide.', ephemeral: true });
    }

    const shopId = getShopIdFromMember(interaction.member);
    if (!shopId) return interaction.reply({ content: '⛔ Tu ne fais partie d’aucune boutique.', ephemeral: true });

    const isArmurerie = shopId.startsWith('armurerie_');
    const cat = isArmurerie ? 'armes' : 'chevaux';

    // Stock dispo
    const stock = getShopStock(shopId);
    const items = Object.entries(stock[cat] || {});
    if (!items.length) return interaction.reply({ content: '📦 Stock vide.', ephemeral: true });

    // Sélecteur vendeur
    const menu = new StringSelectMenuBuilder()
      .setCustomId('vente_item')
      .setPlaceholder(`Sélectionner dans ${cat}`)
      .addOptions(items.slice(0, 25).map(([name, qty]) => ({
        label: name, value: name, description: `Stock: ${qty}`, emoji: isArmurerie ? '🔫' : '🐎'
      })));
    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      embeds: [ new EmbedBuilder()
        .setColor(0x16a085)
        .setTitle(`🧾 Vente — ${shopId}`)
        .setDescription(`Sélectionne un item à vendre à **${target.username}**.`)
        .setFooter({ text: 'OTW Économie' })
      ],
      components: [row],
      flags: MessageFlags.Ephemeral
    });

    const msg = await interaction.fetchReply();
    const sel = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 60_000 }).catch(() => null);
    if (!sel) return;

    const itemName = sel.values[0];
    const unitPrice = getPrice(shopId, cat, itemName);
    if (!unitPrice) {
      return sel.update({
        embeds: [ new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('⛔ Pas de prix défini')
          .setDescription(`Définis d’abord un prix pour **${itemName}** avec **/prix definir**.`)
          .setFooter({ text: 'OTW Économie' })
        ],
        components: []
      });
    }

    // Message de confirmation dans le salon courant (public, supprimé à la fin)
    const acceptBtn = new ButtonBuilder().setCustomId('vente_accept').setLabel('Accepter').setStyle(ButtonStyle.Success);
    const refuseBtn = new ButtonBuilder().setCustomId('vente_refuse').setLabel('Refuser').setStyle(ButtonStyle.Danger);
    const btns = new ActionRowBuilder().addComponents(acceptBtn, refuseBtn);

    const reqEmbed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('🧾 Proposition de vente')
      .setDescription(
        `Vendeur: **${interaction.user.username}**\n` +
        `Boutique: **${shopId}**\n` +
        `Article: **${itemName}**\n` +
        `Prix: **$${unitPrice.toFixed(2)}**\n\n` +
        `👉 ${target}, clique **Accepter** pour confirmer l’achat (débit sur *courant*).`
      )
      .setFooter({ text: 'OTW Économie' });

    const confirmMsg = await interaction.channel.send({
      content: `${target}`, allowedMentions: { users: [target.id] },
      embeds: [reqEmbed], components: [btns]
    });

    // fermer l'UI “vendeur” (éphemère)
    await sel.update({
      embeds: [ new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('Attente de la réponse du client')
        .setDescription(`Proposition envoyée à **${target.username}** dans ce salon.`)
        .setFooter({ text: 'OTW Économie' })
      ],
      components: []
    });

    const collector = confirmMsg.createMessageComponentCollector({
      componentType: ComponentType.Button, time: 120_000
    });

    let finished = false;

    collector.on('collect', async (i) => {
      if (i.user.id !== target.id) {
        return i.reply({ content: '⛔ Seul le client peut répondre.', ephemeral: true });
      }

      // éviter le timeout 3s
      await i.deferUpdate();

      // désactiver les boutons (UI figée)
      const disabledRow = new ActionRowBuilder().addComponents(
        ButtonBuilder.from(acceptBtn).setDisabled(true),
        ButtonBuilder.from(refuseBtn).setDisabled(true)
      );

      if (i.customId === 'vente_refuse') {
        finished = true;
        await confirmMsg.edit({
          embeds: [ new EmbedBuilder().setColor(0x95a5a6).setTitle('❌ Vente refusée').setFooter({ text:'OTW Économie' }) ],
          components: [disabledRow]
        });
        return; // pas d’annonce publique supplémentaire
      }

      // i.customId === 'vente_accept'
      // Re-vérif du stock au dernier moment (anti course)
      const current = (getShopStock(shopId)?.[cat]?.[itemName]) || 0;
      if (current <= 0) {
        finished = true;
        await confirmMsg.edit({
          embeds: [ new EmbedBuilder().setColor(0xe74c3c).setTitle('⛔ Stock épuisé').setFooter({ text:'OTW Économie' }) ],
          components: [disabledRow]
        });
        return;
      }

      // Débit acheteur
      const pay = debitPlayerCourant(target.id, unitPrice);
      if (!pay.ok) {
        finished = true;
        await confirmMsg.edit({
          embeds: [ new EmbedBuilder().setColor(0xe74c3c).setTitle('⛔ Paiement refusé').setDescription('Fonds insuffisants sur **courant**.').setFooter({ text:'OTW Économie' }) ],
          components: [disabledRow]
        });
        return;
      }

      // Crédit entreprise
      creditOwnerEnterpriseBank(shopId, unitPrice);

      // Décrémenter le stock puis ajouter à l’inventaire — avec rollback si addItem échoue
      try {
        decrementStock(shopId, cat, itemName, 1);
        try {
          // sécurité inventaire (cat toujours existante)
          addItem(target.id, cat, itemName, 1);
        } catch (e) {
          // rollback stock si inventaire a échoué
          incrementStock(shopId, cat, itemName, 1);
          throw e;
        }
      } catch (e) {
        finished = true;
        await confirmMsg.edit({
          embeds: [ new EmbedBuilder().setColor(0xe74c3c).setTitle('⛔ Erreur lors du transfert').setDescription('La transaction a été annulée.').setFooter({ text:'OTW Économie' }) ],
          components: [disabledRow]
        });
        return;
      }

      // UI de confirmation
      await confirmMsg.edit({
        embeds: [ new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('✅ Achat validé')
          .setDescription(`${target} a reçu **${itemName}** dans son inventaire.`)
          .setFooter({ text: 'OTW Économie' })
        ],
        components: [disabledRow]
      });

      // Annonce publique (non éphémère)
      await interaction.channel.send(
        `✅ **${interaction.user.username}** a vendu **${itemName}** à **${target.username}** pour **$${unitPrice.toFixed(2)}**.`
      );

      finished = true;
    });

    collector.on('end', async (_c, reason) => {
      if (!finished && reason !== 'messageDelete') {
        try {
          const disabledRow = new ActionRowBuilder().addComponents(
            ButtonBuilder.from(acceptBtn).setDisabled(true),
            ButtonBuilder.from(refuseBtn).setDisabled(true)
          );
          await confirmMsg.edit({
            embeds: [ new EmbedBuilder().setColor(0x7f8c8d).setTitle('⌛ Demande expirée').setFooter({ text:'OTW Économie' }) ],
            components: [disabledRow]
          });
        } catch {}
      }
    });
  }
};
