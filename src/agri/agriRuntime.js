// src/agri/agriRuntime.js
const { EmbedBuilder, MessageFlags } = require('discord.js');
const {
  RAW_ITEMS, UNIT_PRICES, SESSION_MS, TICK_MS, YIELD_PER_TICK,
  fieldLabel, harvestChannelIdForField, stockEmbed, randomDest
} = require('./agriCommon');
const {
  loadStock, saveStock,
  loadStockMsgMap, saveStockMsgMap,
  loadSessions, saveSessions,
  loadDeliveries, saveDeliveries
} = require('./agriStorage');
const { getOrCreateAccount, updateAccount } = require('../economyData');

let client = null;
function setClient(c) { client = c; }

// Timers en mémoire
const harvestTimers   = new Map(); // key: gid:field:user => { startedAt, willEndAt, count, item, interval }
const transformTimers = new Map(); // key: gid:field:user => { startedAt, willEndAt, ticks, item, interval }

function key(gid, field, uid) { return `${gid}:${field}:${uid}`; }

async function sendHarvestTick(guildId, fieldKey, content) {
  const chId = harvestChannelIdForField(fieldKey);
  if (!chId) return;
  try {
    const ch = await client.channels.fetch(chId);
    await ch.send(content);
  } catch {}
}

async function updateLiveStockMessage(guildId, fieldKey) {
  const map = loadStockMsgMap();
  const ref = map[guildId]?.[fieldKey];
  if (!ref) return;
  try {
    const ch = await client.channels.fetch(ref.channelId);
    const msg = await ch.messages.fetch(ref.messageId).catch(() => null);
    if (!msg) return;
    const s = loadStock(fieldKey);
    await msg.edit({ embeds: [stockEmbed(fieldKey, s)] });
  } catch {}
}

function ensureGuildSessions(gid) {
  const s = loadSessions();
  if (!s[gid]) s[gid] = {};
  return s;
}

/** ------------------ RÉCOLTE ------------------ **/
async function startHarvest(guildId, user, fieldKey, item) {
  if (!RAW_ITEMS.includes(item)) throw new Error('Item brut invalide');
  const k = key(guildId, fieldKey, user.id);
  if (harvestTimers.has(k)) throw new Error('Récolte déjà en cours sur ce champ.');

  const now = Date.now();
  const ctx = {
    startedAt: now,
    willEndAt: now + SESSION_MS,
    count: 0,
    item,
    interval: null
  };
  harvestTimers.set(k, ctx);

  const sess = ensureGuildSessions(guildId);
  if (!sess[guildId][fieldKey]) sess[guildId][fieldKey] = {};
  sess[guildId][fieldKey][user.id] = { item, startedAt: now, willEndAt: ctx.willEndAt, count: 0 };
  saveSessions(sess);

  ctx.interval = setInterval(async () => {
    const now2 = Date.now();
    if (now2 >= ctx.willEndAt || ctx.count >= 50) {
      clearInterval(ctx.interval);
      await finalizeHarvest(guildId, user, fieldKey);
      return;
    }
    const add = Math.min(YIELD_PER_TICK, 50 - ctx.count);
    ctx.count += add;

    const sess2 = loadSessions();
    if (sess2[guildId]?.[fieldKey]?.[user.id]) {
      sess2[guildId][fieldKey][user.id].count = ctx.count;
      saveSessions(sess2);
    }

    const elapsed = Math.floor((now2 - ctx.startedAt) / 1000);
    const remain  = Math.max(0, Math.ceil((ctx.willEndAt - now2) / 1000));
    await sendHarvestTick(
      guildId,
      fieldKey,
      `🌾 **Récolte — ${fieldLabel(fieldKey)}**\n` +
      `<@${user.id}> récolte du **${ctx.item}**… (t+${elapsed}s, reste ~${remain}s)\n` +
      `Total provisoire: **${ctx.count}/50**`
    );
  }, TICK_MS);
}

async function finalizeHarvest(guildId, user, fieldKey) {
  const k = key(guildId, fieldKey, user.id);
  const ctx = harvestTimers.get(k);
  if (!ctx) return;
  clearInterval(ctx.interval);

  const s = loadStock(fieldKey);
  s.raw[ctx.item] = (s.raw[ctx.item] ?? 0) + ctx.count;
  saveStock(fieldKey, s);

  const sess = loadSessions();
  if (sess[guildId]?.[fieldKey]?.[user.id]) {
    delete sess[guildId][fieldKey][user.id];
    saveSessions(sess);
  }

  harvestTimers.delete(k);

  await sendHarvestTick(
    guildId,
    fieldKey,
    `✅ **Récolte terminée — ${fieldLabel(fieldKey)}**\n` +
    `<@${user.id}> a récolté **${ctx.count} ${ctx.item} (brut)**.\n` +
    `Stock mis à jour.`
  );
  await updateLiveStockMessage(guildId, fieldKey);
}

async function stopHarvest(guildId, user, fieldKey) {
  const k = key(guildId, fieldKey, user.id);
  const ctx = harvestTimers.get(k);
  if (!ctx) throw new Error('Aucune récolte en cours sur ce champ.');
  await finalizeHarvest(guildId, user, fieldKey);
}

/** ------------------ TRANSFORMATION ------------------ **/
async function startTransform(guildId, user, fieldKey, item) {
  if (!RAW_ITEMS.includes(item)) throw new Error('Item brut invalide');
  const k = key(guildId, fieldKey, user.id);
  if (transformTimers.has(k)) throw new Error('Transformation déjà en cours sur ce champ.');

  const now = Date.now();
  const ctx = {
    startedAt: now,
    willEndAt: now + SESSION_MS,
    ticks: 0,
    item,
    interval: null
  };
  transformTimers.set(k, ctx);

  ctx.interval = setInterval(async () => {
    const now2 = Date.now();
    if (now2 >= ctx.willEndAt) {
      clearInterval(ctx.interval);
      await finalizeTransform(guildId, user, fieldKey);
      return;
    }
    ctx.ticks += 1;
    const elapsed = Math.floor((now2 - ctx.startedAt) / 1000);
    const remain  = Math.max(0, Math.ceil((ctx.willEndAt - now2) / 1000));
    await sendHarvestTick(
      guildId,
      fieldKey,
      `⚙️ **Transformation — ${fieldLabel(fieldKey)}**\n` +
      `<@${user.id}> transforme du **${ctx.item}**… (t+${elapsed}s, reste ~${remain}s)`
    );
  }, TICK_MS);
}

async function finalizeTransform(guildId, user, fieldKey) {
  const k = key(guildId, fieldKey, user.id);
  const ctx = transformTimers.get(k);
  if (!ctx) return;
  clearInterval(ctx.interval);

  // Quantité transformée = ticks * YIELD_PER_TICK, bornée par stock brut dispo à la fin
  const s = loadStock(fieldKey);
  const maxPossible = s.raw[ctx.item] ?? 0;
  const want = ctx.ticks * YIELD_PER_TICK;
  const done = Math.min(maxPossible, want);

  s.raw[ctx.item]     = (s.raw[ctx.item] ?? 0) - done;
  s.refined[ctx.item] = (s.refined[ctx.item] ?? 0) + done;
  saveStock(fieldKey, s);

  transformTimers.delete(k);

  await sendHarvestTick(
    guildId,
    fieldKey,
    `✅ **Transformation terminée — ${fieldLabel(fieldKey)}**\n` +
    `<@${user.id}> a transformé **${done} ${ctx.item}**.\n` +
    `Stock mis à jour.`
  );
  await updateLiveStockMessage(guildId, fieldKey);
}

async function stopTransform(guildId, user, fieldKey) {
  const k = key(guildId, fieldKey, user.id);
  const ctx = transformTimers.get(k);
  if (!ctx) throw new Error('Aucune transformation en cours sur ce champ.');
  await finalizeTransform(guildId, user, fieldKey);
}

/** ------------------ LIVRAISONS ------------------ **/
function ensureGuildDeliveries(gid) {
  const d = loadDeliveries();
  if (!d[gid]) d[gid] = {};
  return d;
}

async function startDelivery(guildId, user, fieldKey, item, qty) {
  const s = loadStock(fieldKey);
  const have = s.refined[item] ?? 0;
  if (qty <= 0) throw new Error('Quantité invalide');
  if (qty > have) throw new Error(`Stock insuffisant: ${item} transformé disponible = ${have}`);

  const d = ensureGuildDeliveries(guildId);
  d[guildId][user.id] = {
    fieldKey, item, qty,
    dest: randomDest(),
    startedAt: Date.now()
  };
  saveDeliveries(d);

  return d[guildId][user.id];
}

async function finishDelivery(guildId, user) {
  const d = loadDeliveries();
  const pending = d[guildId]?.[user.id];
  if (!pending) throw new Error('Aucune livraison en cours.');

  const { fieldKey, item, qty, dest } = pending;

  // Décrément stock transformé
  const s = loadStock(fieldKey);
  const have = s.refined[item] ?? 0;
  const used = Math.min(have, qty);
  s.refined[item] = have - used;
  saveStock(fieldKey, s);

  // 💵 Paiement = prix_unitaire(item transformé) * qty
  const unit = UNIT_PRICES[item];
  if (typeof unit !== 'number') {
    // sécurité : ne pas bloquer, mais aucun paiement si non configuré
    delete d[guildId][user.id];
    saveDeliveries(d);
    await updateLiveStockMessage(guildId, fieldKey);
    return { fieldKey, item, qty: used, dest, amount: 0 };
  }
  const amount = +(unit * used).toFixed(2);
  const acc = getOrCreateAccount(user.id);
  acc.courant = acc.courant || { liquide: 0, banque: 0 };
  acc.courant.liquide = (acc.courant.liquide ?? 0) + amount;
  updateAccount(user.id, acc);

  delete d[guildId][user.id];
  saveDeliveries(d);

  await updateLiveStockMessage(guildId, fieldKey);
  return { fieldKey, item, qty: used, dest, amount, unit };
}

module.exports = {
  setClient,
  startHarvest, stopHarvest,
  startTransform, stopTransform,
  startDelivery, finishDelivery,
  updateLiveStockMessage
};
