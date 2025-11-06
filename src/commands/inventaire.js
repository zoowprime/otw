// src/commands/inventaire.js
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, ComponentType, MessageFlags
} = require('discord.js');
const { getInventory, addItem, removeItem } = require('../data/inventoryData');

const CATS = [
  { key:'armes', label:'Armes', emoji:'🔫' },
  { key:'chevaux', label:'Chevaux', emoji:'🐎' },
  { key:'charrettes', label:'Charrettes', emoji:'🚚' },
  { key:'minerais', label:'Minerais', emoji:'⛏️' },
  { key:'autres', label:'Autres', emoji:'🎒' },
];

function renderInventory(inv, username){
  const lines = [];
  lines.push(`✅ **Sacoche**: ${inv.bag ? 'Oui' : 'Non'}`);
  lines.push('');
  for (const c of CATS) {
    const arr = inv.sections[c.key] || [];
    lines.push(`**${c.emoji} ${c.label}**`);
    if (!arr.length) lines.push('_Vide_');
    else for (const it of arr) lines.push(`• ${it.name} — **x${it.qty}**`);
    lines.push('');
  }
  return new EmbedBuilder()
    .setColor(0x34495e)
    .setTitle(`🎒 Inventaire de ${username}`)
    .setDescription(lines.join('\n'))
    .setFooter({ text: 'OTW Économie' });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventaire')
    .setDescription('Inventaire persistant')
    .addSubcommand(sc => sc.setName('voir').setDescription('Voir un inventaire')
      .addUserOption(o => o.setName('target').setDescription('Joueur (optionnel)').setRequired(false)))
    .addSubcommand(sc => sc.setName('donner').setDescription('Donner un item à un joueur')
      .addUserOption(o => o.setName('target').setDescription('Destinataire').setRequired(true)))
    .addSubcommand(sc => sc.setName('voler').setDescription('Voler un item à un joueur (RP)')
      .addUserOption(o => o.setName('target').setDescription('Victime').setRequired(true))),
  async execute(interaction){
    const sub = interaction.options.getSubcommand();

    if (sub === 'voir') {
      const target = interaction.options.getUser('target') || interaction.user;
      const inv = getInventory(target.id);
      return interaction.reply({ embeds: [renderInventory(inv, target.username)], ephemeral: true });
    }

    // Donner / Voler : cible
    const target = interaction.options.getUser('target');
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '🙃 Pas sur toi-même.', ephemeral: true });
    }

    const donorId = sub === 'donner' ? interaction.user.id : target.id;
    const receiverId = sub === 'donner' ? target.id : interaction.user.id;
    const donorName = sub === 'donner' ? interaction.user.username : target.username;
    const receiverName = sub === 'donner' ? target.username : interaction.user.username;

    const inv = getInventory(donorId);

    // Choix catégorie
    const menuCat = new StringSelectMenuBuilder()
      .setCustomId('inv_cat')
      .setPlaceholder('Choisis une catégorie')
      .addOptions(CATS.map(c => ({
        label: c.label, value: c.key, emoji: c.emoji
      })));
    const row1 = new ActionRowBuilder().addComponents(menuCat);

    await interaction.reply({
      embeds: [ new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`${sub === 'donner' ? 'Donner' : 'Voler'} un item`)
        .setDescription('1) Choisir la **catégorie**\n2) Choisir l’**item**\n3) Quantité (par défaut 1)')
        .setFooter({ text: 'OTW Économie' })
      ],
      components: [row1],
      flags: MessageFlags.Ephemeral
    });

    const msg = await interaction.fetchReply();
    const selCat = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 60_000 }).catch(()=>null);
    if (!selCat) return;
    const catKey = selCat.values[0];

    const arr = inv.sections[catKey] || [];
    if (!arr.length) return selCat.update({ content: '📦 Catégorie vide.', components: [], embeds: [] });

    const menuItem = new StringSelectMenuBuilder()
      .setCustomId('inv_item')
      .setPlaceholder('Choisis un item')
      .addOptions(arr.slice(0,25).map(it => ({
        label: `${it.name} (x${it.qty})`, value: it.name, emoji: (CATS.find(c=>c.key===catKey)||{}).emoji
      })));
    const row2 = new ActionRowBuilder().addComponents(menuItem);

    await selCat.update({
      embeds: [ new EmbedBuilder().setColor(0x9b59b6).setTitle('Item').setDescription('Sélectionne l’item à transférer.').setFooter({ text:'OTW Économie' }) ],
      components: [row2]
    });

    const selItem = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 60_000 }).catch(()=>null);
    if (!selItem) return;
    const itemName = selItem.values[0];

    await selItem.update({
      embeds: [ new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`Quantité pour **${itemName}**`)
        .setDescription('Réponds avec un nombre (par défaut 1).')
        .setFooter({ text: 'OTW Économie' })
      ],
      components: []
    });

    const m = await interaction.channel.awaitMessages({
      filter: m => m.author.id === interaction.user.id,
      max: 1, time: 60_000
    }).catch(()=>null);
    const q = parseInt(m?.first()?.content || '1', 10);
    if (isNaN(q) || q <= 0) return interaction.followUp({ content:'❌ Quantité invalide.', ephemeral:true });

    // Transfert
    try { removeItem(donorId, catKey, itemName, q); }
    catch (e) { return interaction.followUp({ content:`⛔ ${e.message}`, ephemeral:true }); }

    addItem(receiverId, catKey, itemName, q);

    // MP infos
    const dmDonor = await interaction.client.users.fetch(donorId).catch(()=>null);
    const dmReceiver = await interaction.client.users.fetch(receiverId).catch(()=>null);

    const embD = new EmbedBuilder()
      .setColor(sub==='donner'?0x2ecc71:0xe67e22)
      .setTitle(sub==='donner'?'🎁 Don effectué':'👜 Vol effectué')
      .setDescription(`**${itemName} x${q}** → ${receiverName}`)
      .setFooter({ text: 'OTW Économie' });

    const embR = new EmbedBuilder()
      .setColor(sub==='donner'?0x2ecc71:0xe67e22)
      .setTitle(sub==='donner'?'🎁 Vous avez reçu':'⚠️ On vous a volé')
      .setDescription(`**${itemName} x${q}** de ${donorName}`)
      .setFooter({ text: 'OTW Économie' });

    dmDonor?.send({ embeds:[embD]}).catch(()=>{});
    dmReceiver?.send({ embeds:[embR]}).catch(()=>{});

    return interaction.followUp({
      content: `✅ **${itemName} x${q}** transféré à **${receiverName}**.`,
      ephemeral: true
    });
  }
};
