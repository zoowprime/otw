// src/commands/vente.js
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
  ComponentType, MessageFlags
} = require('discord.js');
const {
  getShopIdFromMember, getShopStock, decrementStock,
  getPrice, creditOwnerEnterpriseBank
} = require('../data/shopsData');
const { getOrCreateAccount, updateAccount } = require('../economyData');
const { addItem } = require('../data/inventoryData');

function debitPlayerCourant(userId, amount){
  const acc = getOrCreateAccount(userId);
  acc.courant ||= { liquide:0, banque:0 };
  const total = (acc.courant.banque||0) + (acc.courant.liquide||0);
  if (total < amount) return { ok:false };
  let rest = amount;
  if (acc.courant.banque >= rest) {
    acc.courant.banque -= rest; rest = 0;
  } else {
    rest -= acc.courant.banque; acc.courant.banque = 0;
    acc.courant.liquide = Math.max(0, (acc.courant.liquide||0) - rest); rest = 0;
  }
  updateAccount(userId, acc);
  return { ok:true };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vente')
    .setDescription('Vendre un cheval ou une arme à un joueur')
    .addUserOption(o => o.setName('target').setDescription('Client').setRequired(true)),

  async execute(interaction){
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
      .addOptions(items.slice(0,25).map(([name, qty]) => ({
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
    const sel = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 60_000 }).catch(()=>null);
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

    // Demande d’acceptation en MP
    const acceptBtn = new ButtonBuilder().setCustomId('vente_accept').setLabel('Accepter').setStyle(ButtonStyle.Success);
    const refuseBtn = new ButtonBuilder().setCustomId('vente_refuse').setLabel('Refuser').setStyle(ButtonStyle.Danger);
    const rowBtns = new ActionRowBuilder().addComponents(acceptBtn, refuseBtn);

    const reqEmbed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('🧾 Proposition de vente')
      .setDescription(
        `Vendeur: **${interaction.user.username}**\n`+
        `Boutique: **${shopId}**\n`+
        `Article: **${itemName}**\n`+
        `Prix: **$${unitPrice.toFixed(2)}**\n\n`+
        `👉 Clique **Accepter** pour confirmer l’achat (débit sur *courant*).`)
      .setFooter({ text: 'OTW Économie' });

    let dmMessage = null;
    try {
      const dmUser = await interaction.client.users.fetch(target.id);
      dmMessage = await dmUser.send({ embeds: [reqEmbed], components: [rowBtns] });
    } catch {
      // si DM fermés, poster dans le salon courant (non éphémère pour le client)
      dmMessage = await interaction.channel.send({
        content: `${target}`, allowedMentions: { users: [target.id] },
        embeds: [reqEmbed], components: [rowBtns]
      });
    }

    // notifier le vendeur qu’on attend la réponse
    await sel.update({
      embeds: [ new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('Attente de la réponse du client')
        .setDescription(`Proposition envoyée à **${target.username}**.`)
        .setFooter({ text: 'OTW Économie' })
      ],
      components: []
    });

    // Collector UNIQUEMENT sur le message de la proposition
    const collector = dmMessage.createMessageComponentCollector({
      componentType: ComponentType.Button, time: 120_000
    });

    let finished = false;

    collector.on('collect', async (i) => {
      if (i.user.id !== target.id) {
        return i.reply({ content: '⛔ Seul le client peut répondre.', ephemeral: true });
      }

      // éviter timeout interaction
      await i.deferUpdate();

      if (i.customId === 'vente_refuse') {
        finished = true;
        await dmMessage.edit({
          embeds: [ new EmbedBuilder().setColor(0x95a5a6).setTitle('❌ Vente refusée').setFooter({ text:'OTW Économie' }) ],
          components: []
        });
        // info vendeur (public)
        return interaction.channel.send(`❌ **${target.username}** a refusé l’achat **${itemName}**.`);
      }

      // i.customId === 'vente_accept'
      // Re-vérif stock juste avant débit
      const current = getShopStock(shopId)?.[cat]?.[itemName] || 0;
      if (current <= 0) {
        finished = true;
        await dmMessage.edit({
          embeds: [ new EmbedBuilder().setColor(0xe74c3c).setTitle('⛔ Stock épuisé').setFooter({ text:'OTW Économie' }) ],
          components: []
        });
        return interaction.channel.send(`⛔ Stock épuisé pour **${itemName}** à **${shopId}**.`);
      }

      // Débit acheteur
      const pay = debitPlayerCourant(target.id, unitPrice);
      if (!pay.ok) {
        finished = true;
        await dmMessage.edit({
          embeds: [ new EmbedBuilder().setColor(0xe74c3c).setTitle('⛔ Paiement refusé').setDescription('Fonds insuffisants sur **courant**.').setFooter({ text:'OTW Économie' }) ],
          components: []
        });
        return interaction.channel.send(`⛔ **${target.username}** n’a pas assez de fonds pour **${itemName}** ($${unitPrice.toFixed(2)}).`);
      }

      // Crédit boutique + MAJ stock + inventaire
      creditOwnerEnterpriseBank(shopId, unitPrice);

      try {
        decrementStock(shopId, cat, itemName, 1);
      } catch {
        finished = true;
        await dmMessage.edit({
          embeds: [ new EmbedBuilder().setColor(0xe74c3c).setTitle('⛔ Stock insuffisant').setFooter({ text:'OTW Économie' }) ],
          components: []
        });
        return interaction.channel.send(`⛔ Stock insuffisant pour **${itemName}** à **${shopId}**.`);
      }

      addItem(target.id, cat, itemName, 1);

      // Conf MP acheteur
      await dmMessage.edit({
        embeds: [ new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('✅ Achat validé')
          .setDescription(`Tu as reçu **${itemName}** dans ton inventaire.`)
          .setFooter({ text: 'OTW Économie' })
        ],
        components: []
      });

      // Annonce publique
      await interaction.channel.send(
        `✅ **${interaction.user.username}** a vendu **${itemName}** à **${target.username}** pour **$${unitPrice.toFixed(2)}**.`
      );

      finished = true;
    });

    collector.on('end', async (_c, reason) => {
      if (!finished && reason !== 'messageDelete') {
        try {
          await dmMessage.edit({
            embeds: [ new EmbedBuilder().setColor(0x7f8c8d).setTitle('⌛ Demande expirée').setFooter({ text:'OTW Économie' }) ],
            components: []
          });
        } catch {}
        await interaction.channel.send(`⌛ La proposition de vente à **${target.username}** a expiré.`);
      }
    });
  }
};
