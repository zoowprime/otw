const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { WEAPONS } = require('../data/catalogWeapons');
const { getShopIdFromMember, debitOwnerEnterprise, incrementStock } = require('../data/shopsData');

const IMPORT_CHANNEL_ID = process.env.ARME_IMPORT_CHANNEL;

module.exports = {
  data: new SlashCommandBuilder().setName('arme').setDescription('Gestion des imports d’armes').addSubcommand(sc =>
    sc.setName('import').setDescription('Importer une arme (armureries uniquement)')
  ),
  async execute(interaction) {
    const shopId = getShopIdFromMember(interaction.member);
    if (!shopId || !shopId.startsWith('armurerie_')) {
      return interaction.reply({ content: '❌ Cette commande est réservée aux **armureries**.', ephemeral: true });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('arme_import')
      .setPlaceholder('🔫 Choisis une arme à importer')
      .addOptions(WEAPONS.map(w => ({ label: w.name, value: JSON.stringify({ name: w.name, price: w.importPrice }), description: `$${w.importPrice}`, emoji: '🔫' })));

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('📦 Import — Armurerie')
      .setDescription('Sélectionne une **arme** à importer.\n💰 Le coût sera débité du **compte entreprise** du patron.')
      .setFooter({ text: 'OTW Économie' });

    const msg = await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });

    const select = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 60000 }).catch(() => null);
    if (!select) return;

    const { name, price } = JSON.parse(select.values[0]);
    const pay = debitOwnerEnterprise(shopId, price);
    if (!pay.ok) {
      return select.update({
        embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle('⛔ Paiement refusé').setDescription(`Raison : ${pay.reason}`).setFooter({ text: 'OTW Économie' })],
        components: [],
      });
    }

    incrementStock(shopId, 'armes', name, 1);

    await select.update({
      embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle('✅ Import confirmé').setDescription(`**${name}** importée pour **$${price}**.`).setFooter({ text: 'OTW Économie' })],
      components: [],
    });

    const ch = await interaction.client.channels.fetch(IMPORT_CHANNEL_ID).catch(() => null);
    ch?.send({
      embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle('📥 Import Arme').setDescription(`**${interaction.user}** a importé **${name}** pour **$${price}**.`).setTimestamp().setFooter({ text: 'OTW Économie' })],
    });
  },
};
