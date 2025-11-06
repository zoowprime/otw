// src/commands/catalogue.js
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, ComponentType, MessageFlags
} = require('discord.js');
const { getShopStock } = require('../data/shopsData');

const CATALOG_CHOICES = [
  { label:'Armurerie Saint-Denis', value:'armurerie_sd', emoji:'🏛️' },
  { label:'Armurerie Rhodes', value:'armurerie_rhodes', emoji:'🏛️' },
  { label:'Armurerie Annesburg', value:'armurerie_ab', emoji:'🏭' },
  { label:'Écurie Saint-Denis', value:'ecurie_sd', emoji:'🐎' },
  { label:'Écurie Rhodes', value:'ecurie_rhodes', emoji:'🐎' },
  { label:'Écurie Van Horn', value:'ecurie_vh', emoji:'🐎' },
];

function renderStock(stock){
  const sec = ['armes','chevaux','charrettes'];
  const lines = [];
  for (const s of sec) {
    const entries = Object.entries(stock[s]||{});
    if (!entries.length) continue;
    lines.push(`**${s.toUpperCase()}**`);
    for (const [name, qty] of entries) lines.push(`• ${name} — **x${qty}**`);
    lines.push('');
  }
  return lines.join('\n') || '_Rien en vitrine pour le moment_.';
}

module.exports = {
  data: new SlashCommandBuilder().setName('catalogue').setDescription('Voir les catalogues des commerces'),
  async execute(interaction){
    const menu = new StringSelectMenuBuilder()
      .setCustomId('catalog_shop')
      .setPlaceholder('Choisis un commerce')
      .addOptions(CATALOG_CHOICES);

    const row = new ActionRowBuilder().addComponents(menu);
    await interaction.reply({
      embeds: [ new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle('🗂️ Catalogue')
        .setDescription('Sélectionne un **commerce** pour voir son stock.')
        .setFooter({ text:'OTW Économie' })
      ],
      components: [row],
      flags: MessageFlags.Ephemeral
    });

    const msg = await interaction.fetchReply();
    const sel = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 60_000 }).catch(()=>null);
    if (!sel) return;

    const shopId = sel.values[0];
    const stock = getShopStock(shopId);

    await sel.update({
      embeds: [ new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle(`🗂️ Catalogue — ${shopId}`)
        .setDescription(renderStock(stock))
        .setFooter({ text:'OTW Économie' })
      ],
      components: []
    });
  }
};
