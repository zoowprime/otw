const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');
const {
  getShopIdFromMember,
  getShopStock,
  decrementStock,
  getPrice,
  creditOwnerEnterpriseBank
} = require('../data/shopsData');
const { getOrCreateAccount, updateAccount } = require('../economyData');
const { addItem } = require('../data/inventoryData');
const { logTransaction } = require('../utils/commerceLogger');

// Débiter l'acheteur (liquide puis banque)
function debitPlayer(userId, amount) {
  const acc = getOrCreateAccount(userId);
  const c = acc.courant || { banque: 0, liquide: 0 };
  const total = c.banque + c.liquide;
  if (total < amount) return false;
  if (c.liquide >= amount) c.liquide -= amount;
  else {
    amount -= c.liquide;
    c.liquide = 0;
    c.banque -= amount;
  }
  acc.courant = c;
  updateAccount(userId, acc);
  return true;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vente')
    .setDescription('Vendre un article à un joueur')
    .addUserOption(o => o.setName('target').setDescription('Acheteur').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('target');
    if (target.bot)
      return interaction.reply({ content: '🤖 Tu ne peux pas vendre à un bot.', ephemeral: true });

    const shopId = getShopIdFromMember(interaction.member);
    if (!shopId)
      return interaction.reply({ content: '⛔ Tu ne fais partie d’aucune boutique.', ephemeral: true });

    const isArmurerie = shopId.startsWith('armurerie_');
    const cat = isArmurerie ? 'armes' : 'chevaux';
    const emoji = isArmurerie ? '🔫' : '🐎';

    const stock = getShopStock(shopId);
    const items = Object.entries(stock[cat] || {});
    if (!items.length)
      return interaction.reply({ content: '📦 Ton stock est vide.', ephemeral: true });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('vente_item')
      .setPlaceholder(`${emoji} Choisis un article`)
      .addOptions(items.slice(0, 25).map(([n, q]) => ({
        label: n,
        value: n,
        description: `Stock : ${q}`,
        emoji
      })));

    const msg = await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle(`🧾 Vente — ${shopId}`)
        .setDescription(`Choisis un article à vendre à ${target.username}.`)
        .setFooter({ text: 'OTW Économie' })],
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true
    });

    const sel = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 60000 }).catch(() => null);
    if (!sel) return;

    const itemName = sel.values[0];
    const unitPrice = getPrice(shopId, cat, itemName);
    if (!unitPrice)
      return sel.update({
        embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle('⛔ Pas de prix défini').setDescription(`Utilise /prix définir pour fixer un prix à **${itemName}**.`).setFooter({ text: 'OTW Économie' })],
        components: []
      });

    const buyerEmbed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('💰 Proposition de vente')
      .setDescription(`**${interaction.user.username}** te propose **${itemName}** pour **$${unitPrice.toFixed(2)}**.\nSouhaites-tu accepter ?`)
      .setFooter({ text: 'OTW Économie' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('vente_accept').setLabel('Accepter').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('vente_refuse').setLabel('Refuser').setStyle(ButtonStyle.Danger)
    );

    const buyer = await interaction.client.users.fetch(target.id).catch(() => null);
    if (!buyer) return sel.update({ content: '❌ Acheteur introuvable.', components: [] });
    await buyer.send({ embeds: [buyerEmbed], components: [row] }).catch(() => {
      return sel.update({ content: '❌ Impossible d’envoyer la demande à l’acheteur (MP fermés).', components: [] });
    });

    await sel.update({ embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle('📨 Attente de réponse...').setFooter({ text: 'OTW Économie' })], components: [] });

    // Attente du clic de l'acheteur
    const collector = interaction.client.on('interactionCreate', async i => {
      if (!['vente_accept', 'vente_refuse'].includes(i.customId)) return;
      if (i.user.id !== target.id) return;

      if (i.customId === 'vente_refuse') {
        await i.update({ embeds: [new EmbedBuilder().setColor(0x95a5a6).setTitle('❌ Vente refusée').setFooter({ text: 'OTW Économie' })], components: [] });
        interaction.followUp({ content: `❌ Vente refusée par ${target.username}.`, ephemeral: false });
        return;
      }

      if (!debitPlayer(target.id, unitPrice)) {
        await i.update({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle('⛔ Fonds insuffisants').setFooter({ text: 'OTW Économie' })], components: [] });
        return;
      }

      creditOwnerEnterpriseBank(shopId, unitPrice);
      decrementStock(shopId, cat, itemName, 1);
      addItem(target.id, cat, itemName, 1);

      await i.update({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle('✅ Achat validé').setDescription(`Tu as reçu **${itemName}**.`).setFooter({ text: 'OTW Économie' })], components: [] });
      interaction.followUp({ content: `💵 ${interaction.user.username} a vendu **${itemName}** à ${target.username} pour **$${unitPrice.toFixed(2)}**.`, ephemeral: false });

      // 🔹 MP confirmation à l’acheteur
      buyer.send({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle('🎁 Achat reçu').setDescription(`Tu as bien reçu **${itemName}** de **${interaction.user.username}** pour **$${unitPrice.toFixed(2)}**.`).setFooter({ text: 'OTW Économie' })] }).catch(() => {});

      // 🔹 Log public
      await logTransaction(interaction.client, 'VENTE', `<@${interaction.user.id}>`, `<@${target.id}>`, itemName, unitPrice, shopId);
    });
  }
};
