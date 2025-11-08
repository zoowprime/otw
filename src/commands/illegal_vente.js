// src/commands/illegal_vente.js
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
  ComponentType, MessageFlags
} = require('discord.js');

const {
  getIllegalStock, decrementIllegalStock, getIllegalPrice
} = require('../data/illegalData');
const { getOrCreateAccount, updateAccount } = require('../economyData');
const { addItem } = require('../data/inventoryData');

const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;
const GERANT_IDS = [
  process.env.ILLEGAL_GERANT_USER_ID_1,
  process.env.ILLEGAL_GERANT_USER_ID_2,
  process.env.ILLEGAL_GERANT_USER_ID_3,
  process.env.ILLEGAL_GERANT_USER_ID_4,
].filter(Boolean);

// Débite le client (banque puis liquide)
function debitPlayerCourant(userId, amount){
  const acc = getOrCreateAccount(userId);
  acc.courant ||= { liquide:0, banque:0 };
  const total = (acc.courant.banque||0) + (acc.courant.liquide||0);
  if (total < amount) return { ok:false };
  let rest = amount;
  if (acc.courant.banque >= rest){ acc.courant.banque -= rest; rest = 0; }
  else {
    rest -= acc.courant.banque;
    acc.courant.banque = 0;
    acc.courant.liquide = Math.max(0, acc.courant.liquide - rest);
    rest = 0;
  }
  updateAccount(userId, acc);
  return { ok:true };
}

// Crédite le vendeur en LIQUIDE
function creditSellerLiquid(userId, amount){
  const acc = getOrCreateAccount(userId);
  acc.courant ||= { liquide:0, banque:0 };
  acc.courant.liquide = (acc.courant.liquide || 0) + amount;
  updateAccount(userId, acc);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('illegal_vente')
    .setDescription('Vendre un item illégal à un joueur')
    .addUserOption(o => o.setName('target').setDescription('Client').setRequired(true)),
  async execute(interaction){
    const uid = interaction.user.id;
    const isStaff = interaction.member.roles.cache.has(STAFF_ROLE_ID);
    const isGerant = GERANT_IDS.includes(uid);
    if (!isStaff && !isGerant) return interaction.reply({ content:'⛔ Accès refusé.', ephemeral:true });

    const target = interaction.options.getUser('target');
    if (!target || target.bot) return interaction.reply({ content:'Client invalide.', ephemeral:true });

    const stock = getIllegalStock();
    const items = [
      ...Object.entries(stock.armes || {}).map(([name, qty]) => ({ name, qty, cat:'armes' })),
      ...Object.entries(stock.autres || {}).map(([name, qty]) => ({ name, qty, cat:'autres' })),
    ];
    if (!items.length) return interaction.reply({ content:'📦 Stock illégal vide.', ephemeral:true });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('illegal_sale_item')
      .setPlaceholder('Sélectionne un item à vendre')
      .addOptions(items.slice(0,25).map(it => ({
        label: it.name,
        value: JSON.stringify({ name: it.name, cat: it.cat }),
        description: `Stock: ${it.qty}`,
        emoji: it.cat === 'armes' ? '🔫' : '🎒'
      })));

    await interaction.reply({
      embeds:[ new EmbedBuilder()
        .setTitle('🧾 Vente illégale')
        .setDescription(`Sélectionne l'item à vendre à **${target.username}**.`)
        .setColor(0xd35400) ],
      components: [ new ActionRowBuilder().addComponents(menu) ],
      flags: MessageFlags.Ephemeral
    });

    const msg = await interaction.fetchReply();
    const sel = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time:60000 }).catch(()=>null);
    if (!sel) return;

    const { name, cat } = JSON.parse(sel.values[0]);
    const unitPrice = getIllegalPrice(cat, name);
    if (!unitPrice) {
      return sel.update({
        embeds:[ new EmbedBuilder().setColor(0xe74c3c).setTitle('❌ Pas de prix défini').setDescription('Définis un prix d’abord avec /illegal_prix.') ],
        components: []
      });
    }

    // Message public de confirmation dans le salon courant (pas de MP)
    const acceptBtn = new ButtonBuilder().setCustomId('illegal_sale_accept').setLabel('Accepter').setStyle(ButtonStyle.Success).setEmoji('✅');
    const refuseBtn = new ButtonBuilder().setCustomId('illegal_sale_refuse').setLabel('Refuser').setStyle(ButtonStyle.Danger).setEmoji('❌');

    const saleEmbed = new EmbedBuilder()
      .setTitle('🧾 Proposition de vente illégale')
      .setColor(0xf39c12)
      .setDescription(
        `Vendeur : **${interaction.user.username}**\n`+
        `Client : ${target}\n`+
        `Article : **${name}**\n`+
        `Prix : **$${unitPrice.toFixed(2)}**\n\n`+
        `👉 ${target}, cliquez sur **Accepter** pour confirmer l'achat.`
      );

    // Envoie public (non éphémère) pour que le client puisse cliquer
    const promptMsg = await interaction.channel.send({
      embeds:[saleEmbed],
      components:[ new ActionRowBuilder().addComponents(acceptBtn, refuseBtn) ]
    });

    // Désactive la vue éphémère du vendeur
    await sel.update({
      embeds:[ new EmbedBuilder().setColor(0xf39c12).setTitle('🔔 Offre envoyée').setDescription(`Proposition envoyée à **${target.username}** dans ce salon.`) ],
      components: []
    });

    const collector = promptMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });
    let completed = false;

    collector.on('collect', async (i) => {
      if (!['illegal_sale_accept','illegal_sale_refuse'].includes(i.customId)) return;
      if (i.user.id !== target.id) return i.reply({ content:'⛔ Seul le client peut répondre.', ephemeral:true });

      if (i.customId === 'illegal_sale_refuse') {
        completed = true;
        collector.stop('refused');
        await i.update({ embeds:[ new EmbedBuilder().setColor(0x95a5a6).setTitle('❌ Vente refusée') ], components: [] });
        return;
      }

      // Accepté → paiement client
      const pay = debitPlayerCourant(target.id, unitPrice);
      if (!pay.ok) {
        completed = true;
        collector.stop('nofunds');
        return i.update({ embeds:[ new EmbedBuilder().setColor(0xe74c3c).setTitle('⛔ Paiement refusé').setDescription('Fonds insuffisants.') ], components: [] });
      }

      // MAJ stock
      try {
        decrementIllegalStock(cat, name, 1);
      } catch {
        completed = true;
        collector.stop('nostock');
        return i.update({ embeds:[ new EmbedBuilder().setColor(0xe74c3c).setTitle('⛔ Stock insuffisant') ], components: [] });
      }

      // Ajout dans l’inventaire du client (kit → "autres")
      const invCat = (name === 'Kit de crochetage') ? 'autres' : cat;
      try { addItem(target.id, invCat, name, 1); } catch {}

      // Créditer le vendeur en LIQUIDE
      creditSellerLiquid(uid, unitPrice);

      completed = true;
      collector.stop('sold');

      await i.update({
        embeds:[ new EmbedBuilder().setColor(0x2ecc71).setTitle('✅ Achat validé').setDescription(`Tu as reçu **${name}**.`) ],
        components: []
      });

      // Annonce publique
      const logChId = process.env.LOG_CHANNEL_ID || process.env.STOCK_CHANNEL;
      if (logChId) {
        const logCh = await interaction.client.channels.fetch(logChId).catch(()=>null);
        if (logCh?.isTextBased()) {
          await logCh.send(`💬 ${interaction.user} a vendu **${name}** à ${target} pour **$${unitPrice.toFixed(2)}** (vendeur crédité en liquide).`).catch(()=>{});
        }
      }
    });

    collector.on('end', async (_col, reason) => {
      if (!completed && promptMsg.editable) {
        await promptMsg.edit({ components: [] }).catch(()=>{});
        if (reason !== 'sold' && reason !== 'refused') {
          await interaction.followUp({ content:'⏱️ La demande a expiré.', ephemeral:true }).catch(()=>{});
        }
      }
    });
  }
};
