// src/commands/import_arme.js
const {
  SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder, ComponentType, MessageFlags
} = require('discord.js');
const { WEAPONS } = require('../data/catalogWeapons');
const {
  getShopIdFromMember, debitOwnerEnterprise, incrementStock
} = require('../data/shopsData');

const IMPORT_CHANNEL_ID = process.env.ARME_IMPORT_CHANNEL;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('arme')
    .setDescription('Gestion des imports d’armes')
    .addSubcommand(sc => sc
      .setName('import')
      .setDescription('Importer une arme (armureries uniquement)')
    ),
  async execute(interaction){
    if (interaction.options.getSubcommand() !== 'import') return;

    const shopId = getShopIdFromMember(interaction.member);
    if (!shopId || !shopId.startsWith('armurerie_')) {
      return interaction.reply({ content: '❌ Cette commande est réservée aux **armureries**.', ephemeral: true });
    }

    // 1) Menu armes (on peut paginer si tu veux plus tard)
    const menu = new StringSelectMenuBuilder()
      .setCustomId('weapon_select')
      .setPlaceholder('🔫 Choisis une arme à importer')
      .addOptions(WEAPONS.slice(0, 25).map(w => ({
        label: w.name, value: JSON.stringify({ name: w.name, price: w.importPrice }),
        description: `$${w.importPrice}`, emoji: '🔫'
      })));

    const row = new ActionRowBuilder().addComponents(menu);
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('📥 Import — Armurerie')
      .setDescription('Sélectionne une **arme**. Le prix sera débité du **compte entreprise** du patron.')
      .setFooter({ text: 'OTW Économie' });

    await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });

    const msg = await interaction.fetchReply();
    const sel = await msg.awaitMessageComponent({
      componentType: ComponentType.StringSelect, time: 60_000
    }).catch(() => null);
    if (!sel) return;

    const { name, price } = JSON.parse(sel.values[0]);

    // Paiement
    const pay = debitOwnerEnterprise(shopId, price);
    if (!pay.ok) {
      return sel.update({
        embeds: [ new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('⛔ Paiement refusé')
          .setDescription(`Raison: ${pay.reason || 'inconnue'}\nMontant requis: **$${price}**`)
          .setFooter({ text: 'OTW Économie' })
        ],
        components: []
      });
    }

    // Stock + confirmation
    incrementStock(shopId, 'armes', name, 1);

    await sel.update({
      embeds: [ new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Import confirmé')
        .setDescription(`**${name}** importée pour **$${price}**.\nAjoutée au stock **${shopId}** (armes).`)
        .setFooter({ text: 'OTW Économie' })
      ],
      components: []
    });

    if (IMPORT_CHANNEL_ID) {
      interaction.client.channels.fetch(IMPORT_CHANNEL_ID).then(ch => {
        ch?.send({ embeds: [ new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('📥 Import Arme')
          .setDescription(`**${interaction.member}** a importé **${name}** pour **$${price}**\nBoutique: **${shopId}**`)
          .setTimestamp()
          .setFooter({ text: 'OTW Économie' })
        ]}).catch(()=>{});
      }).catch(()=>{});
    }
  }
};
