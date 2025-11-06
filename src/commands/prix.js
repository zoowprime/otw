// src/commands/prix.js
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, ComponentType, MessageFlags
} = require('discord.js');
const { WEAPONS } = require('../data/catalogWeapons');
const { flatHorses } = require('../data/catalogHorses');
const {
  getShopIdFromMember, setPrice, getAllPrices, resetPrices
} = require('../data/shopsData');

const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;

function beautifyPrices(p){
  const lines = [];
  for (const cat of Object.keys(p||{})) {
    const entries = Object.entries(p[cat]||{});
    if (!entries.length) continue;
    lines.push(`**${cat.toUpperCase()}**`);
    for (const [name, price] of entries) lines.push(`• ${name} — **$${(+price).toFixed(2)}**`);
    lines.push('');
  }
  return lines.join('\n') || '_Aucun prix défini_.';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prix')
    .setDescription('Gérer les prix de votre commerce')
    .addSubcommand(sc => sc
      .setName('definir')
      .setDescription('Définir le prix de vente d’un item (arme/cheval)'))
    .addSubcommand(sc => sc
      .setName('modifier')
      .setDescription('Modifier un prix déjà défini'))
    .addSubcommand(sc => sc
      .setName('voir')
      .setDescription('Voir les prix de votre commerce'))
    .addSubcommand(sc => sc
      .setName('reset')
      .setDescription('Réinitialiser TOUS les prix d’un commerce (STAFF)')
      .addStringOption(o =>
        o.setName('commerce')
          .setDescription('ID du commerce (ex: armurerie_sd)')
          .setRequired(true)
      )
    ),
  async execute(interaction){
    const sub = interaction.options.getSubcommand();
    if (sub === 'reset') {
      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
        return interaction.reply({ content: '⛔ Réservé au staff.', ephemeral: true });
      }
      const shopId = interaction.options.getString('commerce');
      resetPrices(shopId);
      return interaction.reply({ content: `✅ Prix réinitialisés pour **${shopId}**.`, ephemeral: true });
    }

    const shopId = getShopIdFromMember(interaction.member);
    if (!shopId) return interaction.reply({ content: '⛔ Tu ne fais partie d’aucune boutique.', ephemeral: true });

    if (sub === 'voir') {
      const p = getAllPrices(shopId);
      const embed = new EmbedBuilder()
        .setColor(0x2d3436)
        .setTitle(`🏷️ Prix — ${shopId}`)
        .setDescription(beautifyPrices(p))
        .setFooter({ text: 'OTW Économie' });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Définir / Modifier : sélecteurs
    const listArmes = WEAPONS.map(w => ({ cat: 'armes', name: w.name, emoji: '🔫' }));
    const listChevaux = flatHorses().map(h => ({ cat: 'chevaux', name: h.name, emoji: '🐎' }));

    const menuCat = new StringSelectMenuBuilder()
      .setCustomId('prix_cat')
      .setPlaceholder('Choisir la catégorie')
      .addOptions([
        { label: 'Armes', value: 'armes', emoji: '🔫', description: 'Armes de l’armurerie' },
        { label: 'Chevaux', value: 'chevaux', emoji: '🐎', description: 'Chevaux de l’écurie' },
      ]);

    const row1 = new ActionRowBuilder().addComponents(menuCat);
    await interaction.reply({
      embeds: [ new EmbedBuilder()
        .setColor(0x2980b9)
        .setTitle(`🏷️ ${sub === 'definir' ? 'Définir' : 'Modifier'} un prix`)
        .setDescription('1) Choisis une **catégorie**\n2) Choisis l’**item**\n3) Réponds au **prix** au format `32,50` ou `32.50`')
        .setFooter({ text: 'OTW Économie' })
      ],
      components: [row1],
      flags: MessageFlags.Ephemeral
    });

    const msg = await interaction.fetchReply();
    const selCat = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 60_000 }).catch(()=>null);
    if (!selCat) return;

    const cat = selCat.values[0];
    const pool = cat === 'armes' ? listArmes : listChevaux;
    const options = pool.slice(0,25).map(x => ({
      label: x.name, value: JSON.stringify({ cat, name: x.name }), emoji: x.emoji
    }));

    const menuItem = new StringSelectMenuBuilder()
      .setCustomId('prix_item')
      .setPlaceholder('Choisir un item')
      .addOptions(options);

    const row2 = new ActionRowBuilder().addComponents(menuItem);
    await selCat.update({
      embeds: [ new EmbedBuilder()
        .setColor(0x2980b9)
        .setTitle('Sélectionne l’item')
        .setDescription('Sélectionne **l’item** à tarifer.')
        .setFooter({ text: 'OTW Économie' })
      ],
      components: [row2]
    });

    const selItem = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 60_000 }).catch(()=>null);
    if (!selItem) return;
    const data = JSON.parse(selItem.values[0]);

    await selItem.update({
      embeds: [ new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`Tape le prix pour **${data.name}**`)
        .setDescription('Réponds à ce message avec un nombre. Ex: `32,50` ou `32.50`')
        .setFooter({ text: 'OTW Économie' })
      ],
      components: []
    });

    // Collecte un message texte du vendeur
    const m = await interaction.channel.awaitMessages({
      filter: m => m.author.id === interaction.user.id,
      max: 1, time: 60_000
    }).catch(()=>null);

    const content = m?.first()?.content?.trim();
    if (!content) {
      return interaction.followUp({ content: '⏱️ Temps écoulé. Recommence.', ephemeral: true });
    }
    const num = parseFloat(content.replace('$','').replace(',','.'));
    if (isNaN(num) || num <= 0) {
      return interaction.followUp({ content: '❌ Prix invalide.', ephemeral: true });
    }

    setPrice(shopId, data.cat, data.name, num);
    return interaction.followUp({
      embeds: [ new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Prix enregistré')
        .setDescription(`**${data.name}** → **$${num.toFixed(2)}**\nBoutique: **${shopId}**`)
        .setFooter({ text: 'OTW Économie' })
      ],
      ephemeral: true
    });
  }
};
