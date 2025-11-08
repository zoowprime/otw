// src/commands/illegal_armes.js
const {
  SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder, ComponentType, MessageFlags
} = require('discord.js');

const {
  ILLEGAL_ROLE,
  incrementIllegalStock, getIllegalStock,
  debitUserCourantBank, getAllIllegalPrices
} = require('../data/illegalData');

const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;
const GERANT_IDS = [
  process.env.ILLEGAL_GERANT_USER_ID_1,
  process.env.ILLEGAL_GERANT_USER_ID_2,
  process.env.ILLEGAL_GERANT_USER_ID_3,
  process.env.ILLEGAL_GERANT_USER_ID_4,
].filter(Boolean);

const ITEMS = [
  // catégorie 'armes'
  { category:'armes', group:'🧨 Explosifs et Armes de Jet', items:[
    ['Dynamites',250], ['Bouteilles incendiaires',50], ['Tomahawk',100]
  ]},
  { category:'armes', group:'🔫 Fusils de chasse', items:[
    ['Fusil à double canon',750], ['Fusil à pompe',550], ['Fusil à canon scié',350], ['Fusil semi-automatique',350]
  ]},
  { category:'armes', group:'🕵️‍♂️ Pistolets', items:[
    ['Semi-automatique',450], ['Mauser',550], ['Pistolet 1899',1000]
  ]},
  { category:'armes', group:'🎯 Fusils de précision', items:[
    ['Fusil Carcano',225], ['Fusil Rolling Block',500]
  ]},
  { category:'autres', group:'🎯 Autres', items:[
    ['Kit de crochetage',200]
  ]}
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('armes_illegales')
    .setDescription('Commande armes illégales (staff + gérants)'),
  async execute(interaction){
    const uid = interaction.user.id;
    const isStaff = interaction.member.roles.cache.has(STAFF_ROLE_ID);
    const isGerant = GERANT_IDS.includes(uid);
    if (!isStaff && !isGerant) {
      return interaction.reply({ content: '⛔ Accès refusé.', ephemeral:true });
    }

    // Build menu flatten (we'll show group menus - first select group)
    const groupOptions = ITEMS.map(g => ({
      label: g.group.slice(0,100),
      value: g.group,
      description: `${g.items.length} items`,
      emoji: g.group.startsWith('🧨') ? '🧨' : (g.group.startsWith('🔫') ? '🔫' : '🎯')
    }));

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('illegal_group_select')
        .setPlaceholder('Que souhaitez-vous commander ?')
        .addOptions(groupOptions)
    );

    const embed = new EmbedBuilder()
      .setTitle('📦 Commande — Armes illégales')
      .setDescription('Sélectionne une catégorie, puis choisis l’article à commander. Le paiement sera débité du compte *courant.banque* de l’utilisateur exécutant la commande.')
      .setFooter({ text: 'OTW — Armes illégales' })
      .setColor(0x8e44ad);

    await interaction.reply({ embeds:[embed], components:[row], flags: MessageFlags.Ephemeral });

    const msg = await interaction.fetchReply();
    const selGroup = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time:60000 }).catch(()=>null);
    if (!selGroup) return;

    const groupTitle = selGroup.values[0];
    const group = ITEMS.find(g=>g.group===groupTitle);
    if (!group) return selGroup.update({ content:'Catégorie introuvable.', components:[], embeds:[], ephemeral:true }).catch(()=>{});

    // Build item menu
    const itemOptions = group.items.map(([name, price]) => ({
      label: name,
      value: JSON.stringify({ name, price, category: group.category }),
      description: `$${price}`,
      emoji: group.category === 'armes' ? '🔫' : '🎒'
    }));

    const row2 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('illegal_item_select')
        .setPlaceholder('Choisir l’article')
        .addOptions(itemOptions.slice(0,25))
    );

    await selGroup.update({
      embeds: [ new EmbedBuilder().setTitle(group.group).setDescription('Choisis un item à commander.').setColor(0x8e44ad) ],
      components: [row2]
    });

    const selItem = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time:60000 }).catch(()=>null);
    if (!selItem) return;
    const { name, price, category } = JSON.parse(selItem.values[0]);

    // Paiement depuis courant.banque de l'utilisateur qui a exécuté la commande
    const pay = debitUserCourantBank(uid, price);
    if (!pay.ok) {
      await selItem.update({
        embeds: [ new EmbedBuilder().setColor(0xe74c3c).setTitle('⛔ Paiement refusé').setDescription(`Raison: ${pay.reason || 'Fonds insuffisants (banque).'} `) ],
        components: []
      });
      return;
    }

    // Ajout dans le stock illégal
    try {
      incrementIllegalStock(category, name, 1);
    } catch (e) {
      // improbable
    }

    // Si c'est un kit de crochetage et que l'acheteur n'est pas le gérant (ou même si c'est lui), on doit le placer dans son inventaire ? 
    // D'après ta demande, le kit acheté par **un joueur** doit être placé dans son inventaire sous 'autres'.
    // Ici la commande est réservée au staff/gerants (acheteur = personne qui exécute la commande).
    if (name === 'Kit de crochetage') {
      // On ajoute aussi dans l'inventaire utilisateur directement
      try {
        const { addItem } = require('../data/inventoryData');
        addItem(uid, 'autres', 'Kit de crochetage', 1);
      } catch (e) {}
    }

    // update message + public log
    await selItem.update({
      embeds: [ new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Commande reçue')
        .setDescription(`**${name}** ajouté au stock illégal (${category})\nDébit: **$${price}** depuis **banque** de <@${uid}>`)
        .setFooter({ text: 'OTW — Armes illégales' })
      ],
      components: []
    });

    // public log (non-ephemeral)
    try {
      const chId = process.env.STOCK_CHANNEL || process.env.LOG_CHANNEL_ID;
      if (chId) {
        const ch = await interaction.client.channels.fetch(chId).catch(()=>null);
        if (ch?.isTextBased()) {
          await ch.send({
            embeds: [ new EmbedBuilder()
              .setTitle('📥 Import illégal')
              .setDescription(`<@${uid}> a commandé **${name}** pour **$${price}** (stock illégal: <@&${ILLEGAL_ROLE}>).`)
              .setColor(0x2ecc71)
              .setTimestamp()
            ]
          }).catch(()=>{});
        }
      }
    } catch(e){}
  }
};
