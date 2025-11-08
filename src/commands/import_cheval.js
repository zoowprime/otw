const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { HORSE_GROUPS } = require('../data/catalogHorses');
const { getShopIdFromMember, debitOwnerEnterprise, incrementStock } = require('../data/shopsData');

const IMPORT_CHANNEL_ID = process.env.CHEVAL_IMPORT_CHANNEL;

module.exports = {
  data: new SlashCommandBuilder().setName('cheval').setDescription('Gestion des imports de chevaux').addSubcommand(sc =>
    sc.setName('import').setDescription('Importer un cheval (écuries uniquement)')
  ),
  async execute(interaction) {
    const shopId = getShopIdFromMember(interaction.member);
    if (!shopId || !shopId.startsWith('ecurie_')) {
      return interaction.reply({ content: '❌ Cette commande est réservée aux **écuries**.', ephemeral: true });
    }

    const groupMenu = new StringSelectMenuBuilder()
      .setCustomId('horse_group')
      .setPlaceholder('🐎 Choisis une catégorie de chevaux')
      .addOptions(HORSE_GROUPS.map(g => ({ label: g.title.replace('🐎 ', ''), value: g.title, emoji: '🐎' })));

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('📦 Import — Écurie')
      .setDescription('Sélectionne une **catégorie** pour voir les chevaux disponibles.')
      .setFooter({ text: 'OTW Économie' });

    const msg = await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(groupMenu)], ephemeral: true });

    const selectGroup = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 60000 }).catch(() => null);
    if (!selectGroup) return;
    const group = HORSE_GROUPS.find(g => g.title === selectGroup.values[0]);
    if (!group) return selectGroup.update({ content: '❌ Catégorie invalide.', components: [], embeds: [] });

    const itemMenu = new StringSelectMenuBuilder()
      .setCustomId('horse_item')
      .setPlaceholder('Sélectionne un cheval')
      .addOptions(group.items.map(([name, price]) => ({ label: name, value: JSON.stringify({ name, price }), description: `$${price}`, emoji: '🐎' })));

    const msg2 = await selectGroup.update({
      embeds: [new EmbedBuilder().setColor(0x9b59b6).setTitle(group.title).setDescription('Choisis un cheval à importer.').setFooter({ text: 'OTW Économie' })],
      components: [new ActionRowBuilder().addComponents(itemMenu)],
    });

    const selectItem = await msg2.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 60000 }).catch(() => null);
    if (!selectItem) return;
    const { name, price } = JSON.parse(selectItem.values[0]);

    const pay = debitOwnerEnterprise(shopId, price);
    if (!pay.ok) {
      return selectItem.update({
        embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle('⛔ Paiement refusé').setDescription(`Raison : ${pay.reason}`).setFooter({ text: 'OTW Économie' })],
        components: [],
      });
    }

    incrementStock(shopId, 'chevaux', name, 1);

    await selectItem.update({
      embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle('✅ Import confirmé').setDescription(`**${name}** importé pour **$${price}**.`).setFooter({ text: 'OTW Économie' })],
      components: [],
    });

    const ch = await interaction.client.channels.fetch(IMPORT_CHANNEL_ID).catch(() => null);
    ch?.send({
      embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle('📥 Import Cheval').setDescription(`**${interaction.user}** a importé **${name}** pour **$${price}**.`).setTimestamp().setFooter({ text: 'OTW Économie' })],
    });
  },
};
