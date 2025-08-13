// src/interaction/stockInteraction.js
const fs = require('fs');
const path = require('path');
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  MessageFlags,
  ChannelType,
} = require('discord.js');

const { categories } = require('../data/weaponsCatalog');
const { getOrCreateInventory, updateInventory } = require('../inventoryData');
const { getOrCreateAccount, updateAccount } = require('../economyData');

const DATA_DIR = process.env.DATA_DIR || '/data';
const STOCK_FILE = path.join(DATA_DIR, 'tetsu_stock.json');
const STOCK_MSG_FILE = path.join(DATA_DIR, 'tetsu_stock_msg.json'); // { guildId: { channelId, messageId } }

function ensureDir() { try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {} }
ensureDir();

function loadStock() {
  try { return JSON.parse(fs.readFileSync(STOCK_FILE, 'utf8') || '{}'); } catch { return {}; }
}
function saveStock(obj) {
  try { fs.writeFileSync(STOCK_FILE, JSON.stringify(obj, null, 2), 'utf8'); } catch {}
}
function loadStockMsg() {
  try { return JSON.parse(fs.readFileSync(STOCK_MSG_FILE, 'utf8') || '{}'); } catch { return {}; }
}
function saveStockMsg(obj) {
  try { fs.writeFileSync(STOCK_MSG_FILE, JSON.stringify(obj, null, 2), 'utf8'); } catch {}
}

function initAllItems() {
  const base = {};
  for (const cat of categories) for (const item of cat.items) base[item] = 0;
  return base;
}

function stockToEmbed(stock) {
  const lines = [];
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    lines.push(`${i ? '\n' : ''}${cat.name} :`);
    for (const item of cat.items) {
      const n = stock[item] ?? 0;
      lines.push(`● ${item} x ${n}`);
    }
    if (i < categories.length - 1) lines.push('\n⸻');
  }
  return new EmbedBuilder().setColor(0x5865F2).setTitle('📦 Stock — Tetsui Ronworks').setDescription(lines.join('\n'));
}

async function updateLiveStockMessage(client, guildId) {
  const map = loadStockMsg();
  const ref = map[guildId];
  if (!ref) return;
  try {
    const channel = await client.channels.fetch(ref.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) return;
    const msg = await channel.messages.fetch(ref.messageId).catch(() => null);
    if (!msg) return;
    const stock = { ...initAllItems(), ...loadStock() };
    await msg.edit({ embeds: [stockToEmbed(stock)] });
  } catch {}
}

// Helpers de menus
function fullWeaponOptions() {
  const options = [];
  for (const cat of categories) {
    for (const item of cat.items) options.push({ label: item, value: item });
  }
  return options.slice(0, 25);
}
function chunkWeapons() {
  // Discord limite un select à 25 options → on pagine si besoin
  const all = [];
  for (const cat of categories) for (const item of cat.items) all.push({ label: item, value: item });
  const chunks = [];
  while (all.length) chunks.push(all.splice(0, 25));
  return chunks;
}

module.exports.handleStockInteractions = async function handleStockInteractions(interaction) {
  // 1) Sélecteur de fabrication (dans le salon catalogue)
  if (interaction.isStringSelectMenu() && interaction.customId === 'weapon_fabricate_select') {
    const chosen = interaction.values?.[0];
    if (!chosen) return interaction.reply({ content: '❗ Choix invalide.', flags: MessageFlags.Ephemeral });

    const fabChannelId = process.env.FABRICATION_ARME_CHANNEL;
    const fabChannel = fabChannelId ? await interaction.client.channels.fetch(fabChannelId).catch(() => null) : null;

    // maj stock
    const stock = { ...initAllItems(), ...loadStock() };
    stock[chosen] = (stock[chosen] ?? 0) + 1;
    saveStock(stock);

    if (fabChannel) {
      await fabChannel.send(`🔫 Vous avez fabriqué **${chosen}** (par ${interaction.user}).`).catch(() => {});
    }

    // accuse réception
    await interaction.reply({ content: `✅ **${chosen}** ajouté au stock.`, flags: MessageFlags.Ephemeral }).catch(() => {});

    // MAJ des messages /stock actifs
    await updateLiveStockMessage(interaction.client, interaction.guildId);
    return;
  }

  // 2) Sélecteur de vente (ouvert par la commande /vendrearme)
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('sell_weapon_select:')) {
    const [, targetId, priceStr] = interaction.customId.split(':');
    const weapon = interaction.values?.[0];
    if (!weapon) return interaction.reply({ content: '❗ Choix invalide.', flags: MessageFlags.Ephemeral });

    const price = Number(priceStr || '0') || 0;
    const companyId = process.env.ARMURERIER_USER;

    // Vérifs du stock
    const stock = { ...initAllItems(), ...loadStock() };
    if ((stock[weapon] ?? 0) <= 0) {
      return interaction.reply({ content: `❌ Stock insuffisant pour **${weapon}**.`, flags: MessageFlags.Ephemeral });
    }

    // Comptes
    const buyerAcc = getOrCreateAccount(targetId);
    if ((buyerAcc.courant?.liquide ?? 0) < price) {
      return interaction.reply({ content: `💸 Le joueur n'a pas **${price}$** en liquide.`, flags: MessageFlags.Ephemeral });
    }

    // Débit/crédit
    buyerAcc.courant.liquide -= price;
    updateAccount(targetId, buyerAcc);
    if (companyId) {
      const comp = getOrCreateAccount(companyId);
      comp.courant.liquide = (comp.courant.liquide ?? 0) + price;
      updateAccount(companyId, comp);
    }

    // Inventaire
    const inv = getOrCreateInventory(targetId);
    inv.items = inv.items || [];
    const idx = inv.items.findIndex(i => i?.name === weapon);
    if (idx === -1) inv.items.push({ name: weapon, quantity: 1 });
    else inv.items[idx].quantity += 1;
    updateInventory(targetId, inv);

    // Stock --
    stock[weapon] -= 1;
    saveStock(stock);

    // ✅ Confirmation publique (preuve) + petit accusé éphémère pour le vendeur
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('Vente d’arme confirmée')
      .setDescription(
        `**Arme :** ${weapon}\n` +
        `**Prix :** ${price}$\n` +
        `**Client :** <@${targetId}>\n` +
        (companyId ? `**Compte crédité :** <@${companyId}>` : '')
      );

    // 1) Message public persistant dans le salon
    await interaction.channel.send({ embeds: [embed] }).catch(() => {});

    // 2) Accusé de réception éphémère (si rien n’a encore été répondu)
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '✅ Vente enregistrée et publiée dans ce salon.',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }

    // MAJ des messages /stock actifs
    await updateLiveStockMessage(interaction.client, interaction.guildId);
    return;
  }
};

module.exports._stockInternal = {
  loadStock,
  saveStock,
  initAllItems,
  stockToEmbed,
  loadStockMsg,
  saveStockMsg,
  updateLiveStockMessage,
  chunkWeapons,
  fullWeaponOptions
};
