// src/commands/illegal_prix.js
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, ComponentType, MessageFlags
} = require('discord.js');

const { setIllegalPrice, getIllegalPrice, getAllIllegalPrices, resetIllegalPrices } = require('../data/illegalData');
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;
const GERANT_IDS = [
  process.env.ILLEGAL_GERANT_USER_ID_1,
  process.env.ILLEGAL_GERANT_USER_ID_2,
  process.env.ILLEGAL_GERANT_USER_ID_3,
  process.env.ILLEGAL_GERANT_USER_ID_4,
].filter(Boolean);

const ALL_ITEMS = [
  // mirror ITEMS from illegal_armes.js
  { category:'armes', name:'Dynamites' }, { category:'armes', name:'Bouteilles incendiaires' }, { category:'armes', name:'Tomahawk' },
  { category:'armes', name:'Fusil à double canon' }, { category:'armes', name:'Fusil à pompe' }, { category:'armes', name:'Fusil à canon scié' }, { category:'armes', name:'Fusil semi-automatique' },
  { category:'armes', name:'Semi-automatique' }, { category:'armes', name:'Mauser' }, { category:'armes', name:'Pistolet 1899' },
  { category:'armes', name:'Fusil Carcano' }, { category:'armes', name:'Fusil Rolling Block' },
  { category:'autres', name:'Kit de crochetage' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('illegal_prix')
    .setDescription('Gérer les prix (armes illégales)')
    .addSubcommand(sc => sc.setName('definir').setDescription('Définir un prix'))
    .addSubcommand(sc => sc.setName('modifier').setDescription('Modifier un prix'))
    .addSubcommand(sc => sc.setName('voir').setDescription('Voir les prix'))
    .addSubcommand(sc => sc.setName('reset').setDescription('Reset tous les prix (STAFF)')),
  async execute(interaction){
    const sub = interaction.options.getSubcommand();
    const uid = interaction.user.id;
    const isStaff = interaction.member.roles.cache.has(STAFF_ROLE_ID);
    const isGerant = GERANT_IDS.includes(uid);
    if (!isStaff && !isGerant) return interaction.reply({ content: '⛔ Accès refusé.', ephemeral:true });

    if (sub === 'reset') {
      if (!isStaff) return interaction.reply({ content: '⛔ Réservé au staff.', ephemeral:true });
      resetIllegalPrices();
      return interaction.reply({ content: '✅ Prix illégaux réinitialisés.', ephemeral:true });
    }

    if (sub === 'voir') {
      const p = getAllIllegalPrices();
      const lines = [];
      for (const cat of ['armes','autres']) {
        lines.push(`**${cat.toUpperCase()}**`);
        const entries = Object.entries(p[cat]||{});
        if (!entries.length) lines.push('_Aucun prix_');
        else for (const [k,v] of entries) lines.push(`• ${k} — **$${(+v).toFixed(2)}**`);
        lines.push('');
      }
      return interaction.reply({ embeds: [ new EmbedBuilder().setTitle('🏷️ Prix — Armes illégales').setDescription(lines.join('\n')).setColor(0x9b59b6) ], ephemeral:true });
    }

    // définir / modifier: choix item -> input price via channel message
    const menu = new StringSelectMenuBuilder()
      .setCustomId('illegal_price_item')
      .setPlaceholder('Choisis un item')
      .addOptions(ALL_ITEMS.map(i => ({ label: i.name, value: JSON.stringify(i), emoji: i.category==='armes'?'🔫':'🎒' })));

    await interaction.reply({
      embeds: [ new EmbedBuilder().setTitle(sub==='definir'?'Définir un prix':'Modifier un prix').setColor(0x9b59b6) .setDescription('Choisis l’item, puis envoie le prix dans le chat (ex: 32.50 ou 32,50).') ],
      components: [ new ActionRowBuilder().addComponents(menu) ],
      ephemeral: true
    });

    const msg = await interaction.fetchReply();
    const sel = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time:60000 }).catch(()=>null);
    if (!sel) return;
    const data = JSON.parse(sel.values[0]);

    await sel.update({ embeds: [ new EmbedBuilder().setTitle(`Prix pour ${data.name}`).setDescription('Envoie le prix maintenant.') ], components: [] });

    const collected = await interaction.channel.awaitMessages({ filter: m=>m.author.id === interaction.user.id, max:1, time:60000 }).catch(()=>null);
    const txt = collected?.first()?.content?.trim();
    if (!txt) return interaction.followUp({ content:'⏱️ Temps écoulé.', ephemeral:true });
    const num = parseFloat(txt.replace(',','.').replace('$',''));
    if (isNaN(num) || num <= 0) return interaction.followUp({ content:'❌ Prix invalide.', ephemeral:true });

    setIllegalPrice(data.category, data.name, num);
    return interaction.followUp({ content:`✅ Prix enregistré: **${data.name}** → **$${num.toFixed(2)}**`, ephemeral:true });
  }
};
