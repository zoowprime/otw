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
  const cur = acc.courant || { liquide:0, banque:0 };
  const total = (cur.banque||0) + (cur.liquide||0);
  if (total < amount) return { ok:false };
  let rest = amount;
  if (cur.banque >= rest) { cur.banque -= rest; rest = 0; }
  else { rest -= cur.banque; cur.banque = 0; cur.liquide = Math.max(0, cur.liquide - rest); rest = 0; }
  acc.courant = cur; updateAccount(userId, acc);
  return { ok:true };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vente')
    .setDescription('Vendre un cheval ou une arme à un joueur')
    .addUserOption(o => o.setName('target').setDescription('Client').setRequired(true)),
  async execute(interaction){
    const target = interaction.options.getUser('target');
    if (target.bot) return interaction.reply({ content: '🤖 Nope.', ephemeral: true });

    const shopId = getShopIdFromMember(interaction.member);
    if (!shopId) return interaction.reply({ content: '⛔ Tu ne fais partie d’aucune boutique.', ephemeral: true });

    const isArmurerie = shopId.startsWith('armurerie_');
    const cat = isArmurerie ? 'armes' : 'chevaux';

    // Stock filtré
    const stock = getShopStock(shopId);
    const items = Object.entries(stock[cat] || {});
    if (!items.length) return interaction.reply({ content: '📦 Stock vide.', ephemeral: true });

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

    // Demande d’acceptation au client
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
        `👉 Cliquer **Accepter** pour confirmer l’achat (débit sur *courant*).`)
      .setFooter({ text: 'OTW Économie' });

    const dm = await interaction.client.users.fetch(target.id).catch(()=>null);

    if (dm) {
      await dm.send({ embeds: [reqEmbed], components: [rowBtns] }).catch(()=>{});
    }

    // Également poster dans le salon courant (pour éviter DM fermés)
    await sel.update({
      embeds: [ new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('Attente de la réponse du client')
        .setDescription(`J’ai envoyé la proposition à **${target.username}**.`)
        .setFooter({ text: 'OTW Économie' })
      ],
      components: []
    });

    // Créer un collector de boutons sur le canal DM si possible, sinon sur le salon courant
    const collectorTarget = dm
      ? (await dm.createDM())
      : interaction.channel;

    const buttonMsg = dm ? (await collectorTarget.messages.fetch({ limit:1 })).first() : null;

    const collector = (buttonMsg || interaction.channel).createMessageComponentCollector({
      componentType: ComponentType.Button, time: 120_000
    });

    let done = false;
    collector.on('collect', async (i) => {
      if (i.customId !== 'vente_accept' && i.customId !== 'vente_refuse') return;
      if (i.user.id !== target.id) {
        return i.reply({ content: '⛔ Seul le client peut répondre.', ephemeral: true });
      }
      collector.stop('answered');

      if (i.customId === 'vente_refuse') {
        done = true;
        await i.update({ embeds: [ new EmbedBuilder().setColor(0x95a5a6).setTitle('❌ Vente refusée').setFooter({ text:'OTW Économie' }) ], components: [] });
        return interaction.followUp({ content: `❌ **${target.username}** a refusé l’achat.`, ephemeral: true });
      }

      // Accepter → paiement
      const pay = debitPlayerCourant(target.id, unitPrice);
      if (!pay.ok) {
        done = true;
        await i.update({ embeds: [ new EmbedBuilder().setColor(0xe74c3c).setTitle('⛔ Paiement refusé').setDescription('Fonds insuffisants sur **courant**.').setFooter({ text:'OTW Économie' }) ], components: [] });
        return interaction.followUp({ content: '⛔ Le client n’a pas assez de fonds.', ephemeral: true });
      }

      // Crédit boutique (entreprise banque)
      creditOwnerEnterpriseBank(shopId, unitPrice);

      // MAJ stock + inventaire
      try {
        decrementStock(shopId, cat, itemName, 1);
      } catch {
        // si entre temps plus de stock
        return i.update({ embeds: [ new EmbedBuilder().setColor(0xe74c3c).setTitle('⛔ Stock épuisé').setFooter({ text:'OTW Économie' }) ], components: [] });
      }

      addItem(target.id, cat, itemName, 1);

      done = true;
      await i.update({
        embeds: [ new EmbedBuilder()
          .setColor(0x2ecc71).setTitle('✅ Achat validé')
          .setDescription(`Tu as reçu **${itemName}** dans ton inventaire.`)
          .setFooter({ text: 'OTW Économie' })
        ], components: []
      });

      await interaction.followUp({
        content: `✅ Vente confirmée: **${itemName}** → **${target.username}** pour **$${unitPrice.toFixed(2)}**.`,
        ephemeral: true
      });
    });

    collector.on('end', async (_c, reason) => {
      if (!done && reason !== 'answered') {
        await interaction.followUp({ content: '⏱️ La demande a expiré.', ephemeral: true });
      }
    });
  }
};
