// src/commands/illegal_vente.js
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
  ComponentType, MessageFlags
} = require('discord.js');

const {
  getIllegalStock, decrementIllegalStock, getIllegalPrice, creditIllegalBank
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

function debitPlayerCourant(userId, amount){
  const acc = getOrCreateAccount(userId);
  acc.courant ||= { liquide:0, banque:0 };
  const total = (acc.courant.banque||0) + (acc.courant.liquide||0);
  if (total < amount) return { ok:false };
  // Prioriser banque? tu voulais prélèvement sur banque uniquement pour achats d'import,
  // ici pour la vente on peut accepter banque+liquide (comme le /vente classique).
  let rest = amount;
  if (acc.courant.banque >= rest){ acc.courant.banque -= rest; rest = 0; }
  else { rest -= acc.courant.banque; acc.courant.banque = 0; acc.courant.liquide = Math.max(0, acc.courant.liquide - rest); rest = 0; }
  updateAccount(userId, acc);
  return { ok:true };
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
    // flatten armes + autres (we sell only armes + kit etc)
    const items = Object.entries(stock.armes || {}).concat(Object.entries(stock.autres || {})).map(([name,qty])=>{
      const cat = (stock.armes && stock.armes[name] !== undefined) ? 'armes' : 'autres';
      return { name, qty, cat };
    }).filter(Boolean);

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
      embeds:[ new EmbedBuilder().setTitle('🧾 Vente illégale').setDescription(`Sélectionne l'item à vendre à **${target.username}**`).setColor(0xd35400) ],
      components: [ new ActionRowBuilder().addComponents(menu) ],
      ephemeral: true
    });

    const msg = await interaction.fetchReply();
    const sel = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time:60000 }).catch(()=>null);
    if (!sel) return;

    const { name, cat } = JSON.parse(sel.values[0]);
    const unitPrice = getIllegalPrice(cat, name);
    if (!unitPrice) {
      return sel.update({ embeds:[ new EmbedBuilder().setColor(0xe74c3c).setTitle('❌ Pas de prix défini').setDescription('Définis un prix d’abord.') ], components: [] });
    }

    // propose au client par DM + en message de canal
    const acceptBtn = new ButtonBuilder().setCustomId('illegal_sale_accept').setLabel('Accepter').setStyle(ButtonStyle.Success);
    const refuseBtn = new ButtonBuilder().setCustomId('illegal_sale_refuse').setLabel('Refuser').setStyle(ButtonStyle.Danger);
    const rowBtns = new ActionRowBuilder().addComponents(acceptBtn, refuseBtn);

    const saleEmbed = new EmbedBuilder()
      .setTitle('🧾 Proposition de vente illégale')
      .setColor(0xf39c12)
      .setDescription(
        `Vendeur: **${interaction.user.username}**\nArticle: **${name}**\nPrix: **$${unitPrice.toFixed(2)}**\n\nCliquez **Accepter** pour confirmer l'achat.`
      );

    // DM client
    const dm = await interaction.client.users.fetch(target.id).catch(()=>null);
    if (dm) await dm.send({ embeds:[saleEmbed], components:[rowBtns] }).catch(()=>{});

    await sel.update({
      embeds:[ new EmbedBuilder().setColor(0xf39c12).setTitle('🔔 Offre envoyée').setDescription(`Proposition envoyée à **${target.username}**.`) ],
      components: []
    });

    // collector for buttons - listen in the channel where DM sent or original channel
    const collectorTarget = dm ? (await dm.createDM()).messages.fetch({ limit:1 }).catch(()=>null) : null;
    // we'll simply listen on the bot's client for the next button with customId illegal_sale_accept/refuse and user = target
    const collector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

    let done = false;
    collector.on('collect', async (i) => {
      if (!['illegal_sale_accept','illegal_sale_refuse'].includes(i.customId)) return;
      if (i.user.id !== target.id) return i.reply({ content:'⛔ Seul le client peut répondre.', ephemeral:true });
      collector.stop('answered');

      if (i.customId === 'illegal_sale_refuse') {
        done = true;
        await i.update({ embeds:[ new EmbedBuilder().setColor(0x95a5a6).setTitle('❌ Vente refusée') ], components: [] });
        return interaction.followUp({ content:`❌ ${target.username} a refusé l'achat.`, ephemeral:true });
      }

      // paiement du client (courant banque+liquide)
      const pay = debitPlayerCourant(target.id, unitPrice = unitPrice);
      if (!pay.ok) {
        done = true;
        await i.update({ embeds:[ new EmbedBuilder().setColor(0xe74c3c).setTitle('⛔ Paiement refusé').setDescription('Fonds insuffisants.') ], components: [] });
        return interaction.followUp({ content:'⛔ Le client n’a pas assez de fonds.', ephemeral:true });
      }

      // créditer la banque de l'organisation illégale
      creditIllegalBank(unitPrice);

      // MAJ stock
      try {
        decrementIllegalStock(cat, name, 1);
      } catch (e){
        await i.update({ embeds:[ new EmbedBuilder().setColor(0xe74c3c).setTitle('⛔ Stock insuffisant') ], components: [] });
        return;
      }

      // ajout au inventaire du client
      try { addItem(target.id, cat, name, 1); } catch (e){}

      done = true;
      await i.update({ embeds:[ new EmbedBuilder().setColor(0x2ecc71).setTitle('✅ Achat validé').setDescription(`Tu as reçu **${name}**.`) ], components: [] });

      // annonce publique non éphémère
      try {
        const logCh = process.env.LOG_CHANNEL_ID || process.env.STOCK_CHANNEL;
        if (logCh){
          const ch = await interaction.client.channels.fetch(logCh).catch(()=>null);
          if (ch?.isTextBased()) {
            await ch.send({ content:`💬 ${interaction.user} a vendu **${name}** à ${target} pour **$${unitPrice.toFixed(2)}**.` }).catch(()=>{});
          }
        }
      } catch (e){}
    });

    collector.on('end', async (_col, reason) => {
      if (!done && reason !== 'answered') {
        await interaction.followUp({ content:'⏱️ La demande a expiré.', ephemeral:true });
      }
    });

    // helper: debit player courant used above
    function debitPlayerCourant(userId, amount){
      const acc = getOrCreateAccount(userId);
      acc.courant ||= { liquide:0, banque:0 };
      const total = (acc.courant.banque||0) + (acc.courant.liquide||0);
      if (total < amount) return { ok:false };
      let rest = amount;
      if (acc.courant.banque >= rest){ acc.courant.banque -= rest; rest = 0; }
      else { rest -= acc.courant.banque; acc.courant.banque = 0; acc.courant.liquide = Math.max(0, acc.courant.liquide - rest); rest = 0; }
      updateAccount(userId, acc);
      return { ok:true };
    }
  }
};
