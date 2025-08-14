const fs = require('fs');
const path = require('path');
const {
  EmbedBuilder,
  MessageFlags,
  ChannelType,
} = require('discord.js');

const { groups } = require('../data/horsesCatalog');
const { getOrCreateInventory, updateInventory } = require('../inventoryData');
const { getOrCreateAccount, updateAccount } = require('../economyData');

const DATA_DIR = process.env.DATA_DIR || '/data';
const STOCK_FILE = path.join(DATA_DIR, 'kinuma_stock.json');
const STOCK_MSG_FILE = path.join(DATA_DIR, 'kinuma_stock_msg.json'); // { guildId: { channelId, messageId } }

function ensureDir() { try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {} }
ensureDir();

function initAllHorses() {
  const base = {};
  groups.forEach(g => g.items.forEach(([name]) => base[name] = 0));
  return base;
}
function loadStock() { try { return JSON.parse(fs.readFileSync(STOCK_FILE, 'utf8') || '{}'); } catch { return {}; } }
function saveStock(obj) { try { fs.writeFileSync(STOCK_FILE, JSON.stringify(obj, null, 2), 'utf8'); } catch {} }
function loadStockMsg() { try { return JSON.parse(fs.readFileSync(STOCK_MSG_FILE, 'utf8') || '{}'); } catch { return {}; } }
function saveStockMsg(obj) { try { fs.writeFileSync(STOCK_MSG_FILE, JSON.stringify(obj, null, 2), 'utf8'); } catch {} }

function stockToEmbed(stock) {
  const lines = [];
  groups.forEach((g, gi) => {
    lines.push(`${gi ? '\n' : ''}${g.title}`);
    for (const [name] of g.items) lines.push(`${name} x ${stock[name] ?? 0}`);
  });
  return new EmbedBuilder().setColor(0x1ABC9C).setTitle('📦 Stock — Kinuma Stable').setDescription(lines.join('\n'));
}

async function updateLiveStockMessage(client, guildId) {
  const refMap = loadStockMsg();
  const ref = refMap[guildId];
  if (!ref) return;
  try {
    const channel = await client.channels.fetch(ref.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) return;
    const msg = await channel.messages.fetch(ref.messageId).catch(() => null);
    if (!msg) return;
    const stock = { ...initAllHorses(), ...loadStock() };
    await msg.edit({ embeds: [stockToEmbed(stock)] });
  } catch {}
}

module.exports.handleHorseStockInteractions = async function handleHorseStockInteractions(interaction) {
  // 1) Sélecteur de commande (depuis le catalogue)
  if (interaction.isStringSelectMenu() && interaction.customId === 'horse_order_select') {
    const chosen = interaction.values?.[0];
    if (!chosen) return interaction.reply({ content: '❗ Choix invalide.', flags: MessageFlags.Ephemeral });

    const cmdChId = process.env.COMMANDER_CHEVAL_CHANNEL;
    const cmdCh = cmdChId ? await interaction.client.channels.fetch(cmdChId).catch(() => null) : null;

    const stock = { ...initAllHorses(), ...loadStock() };
    stock[chosen] = (stock[chosen] ?? 0) + 1;
    saveStock(stock);

    if (cmdCh) await cmdCh.send(`🐎 Vous avez fabriqué **${chosen}** (par ${interaction.user}).`).catch(() => {});
    await interaction.reply({ content: `✅ **${chosen}** ajouté au stock.`, flags: MessageFlags.Ephemeral }).catch(() => {});
    await updateLiveStockMessage(interaction.client, interaction.guildId);
    return;
  }

  // 2) Sélecteur de vente (ouvert par /vendrecheval)
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('sell_horse_select:')) {
    const [, targetId, priceStr] = interaction.customId.split(':');
    const horse = interaction.values?.[0];
    if (!horse) return interaction.reply({ content: '❗ Choix invalide.', flags: MessageFlags.Ephemeral });

    const price = Number(priceStr || '0') || 0;
    const companyId = process.env.KINUMA_USER;

    const stock = { ...initAllHorses(), ...loadStock() };
    if ((stock[horse] ?? 0) <= 0) {
      return interaction.reply({ content: `❌ **${horse}** n’est pas en stock.`, flags: MessageFlags.Ephemeral });
    }

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

    // Inventaire client
    const inv = getOrCreateInventory(targetId);
    inv.items = inv.items || [];
    const idx = inv.items.findIndex(i => i?.name === horse);
    if (idx === -1) inv.items.push({ name: horse, quantity: 1 });
    else inv.items[idx].quantity += 1;
    updateInventory(targetId, inv);

    // Stock --
    stock[horse] -= 1;
    saveStock(stock);

    // Preuve publique + accusé de réception
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('Vente de cheval confirmée')
      .setDescription(
        `**Cheval :** ${horse}\n` +
        `**Prix :** ${price}$\n` +
        `**Client :** <@${targetId}>\n` +
        (companyId ? `**Compte crédité :** <@${companyId}>` : '')
      );

    await interaction.channel.send({ embeds: [embed] }).catch(() => {});
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '✅ Vente enregistrée et publiée dans ce salon.', flags: MessageFlags.Ephemeral }).catch(() => {});
    }

    await updateLiveStockMessage(interaction.client, interaction.guildId);
    return;
  }
};

module.exports._horseStockInternal = {
  initAllHorses, loadStock, saveStock, stockToEmbed, loadStockMsg, saveStockMsg, updateLiveStockMessage
};
