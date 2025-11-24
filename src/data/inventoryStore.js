// src/data/inventoryStore.js
// Nouveau cœur d'inventaire (persisté dans /data/inventory.json)

const fs   = require('fs');
const path = require('path');

const DB_FILE = path.join('/data', 'inventory.json');
const catalog = require('./itemCatalog'); // { id: {weight, stackable, consumable, effect, ...}, ... }
const { getOrCreateAccount } = require('../economyData'); // ← pour récupérer le liquide courant

// ─────────────────────────────────────────────────────────────
// I/O JSON

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2), 'utf8');
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function saveDB(db) {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch {}
}

// ─────────────────────────────────────────────────────────────
// Constantes gameplay

const DEFAULT_WEIGHT_MAX = 60.0;
// faim 100 -> 0 en 90 min : 100/90 ≈ 1.111... % par minute
const HUNGER_DROP_PER_MIN  = 100 / 90;
// soif 100 -> 0 en 60 min : 100/60 ≈ 1.666... % par minute
const THIRST_DROP_PER_MIN  = 100 / 60;

// argent liquide courant dans l’inventaire
const CASH_ITEM_ID = 'argent_icone';
const CASH_UNIT_WEIGHT = (catalog[CASH_ITEM_ID]?.weight ?? 0);

// ─────────────────────────────────────────────────────────────
// Normalisation d'état

function nowMs() { return Date.now(); }

function ensureState(state, userId) {
  const s = state && typeof state === 'object' ? { ...state } : {};
  const t = nowMs();

  s.user_id      = s.user_id || (userId ? String(userId) : undefined);
  s.items        = Array.isArray(s.items) ? s.items : [];
  s.weight_max   = typeof s.weight_max === 'number' ? s.weight_max : DEFAULT_WEIGHT_MAX;

  // Vitals (faim/soif) + timestamps
  s.hunger       = clamp0_100(typeof s.hunger === 'number' ? s.hunger : 100);
  s.thirst       = clamp0_100(typeof s.thirst === 'number' ? s.thirst : 100);
  s.lastHungerTs = typeof s.lastHungerTs === 'number' ? s.lastHungerTs : t;
  s.lastThirstTs = typeof s.lastThirstTs === 'number' ? s.lastThirstTs : t;

  // Compat anciens champs éventuels
  s.has_bag      = Boolean(s.has_bag);

  return s;
}

function clamp0_100(x) {
  const n = Number.isFinite(x) ? x : 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ─────────────────────────────────────────────────────────────
// Poids / catalogue

function getItemWeight(itemId) {
  const meta = catalog[itemId];
  if (!meta) return 0;
  return typeof meta.weight === 'number' ? meta.weight : 0;
}

function totalWeight(userOrId) {
  const state = typeof userOrId === 'object' ? ensureState(userOrId) : getUser(userOrId);
  const items = Array.isArray(state.items) ? state.items : [];

  // poids des items classiques
  let sum = items.reduce((acc, it) => {
    const id  = (it.id || it.name);
    const qty = typeof it.quantity === 'number' ? it.quantity :
                (typeof it.qty === 'number' ? it.qty : 1);
    return acc + getItemWeight(id) * qty;
  }, 0);

  // + poids de l’argent liquide du compte courant
  try {
    const acc = getOrCreateAccount(state.user_id);
    const cash = acc?.courant?.liquide || 0;
    sum += cash * CASH_UNIT_WEIGHT;
  } catch {
    // si economyData n’est pas dispo pour une raison quelconque, on ignore le cash
  }

  return sum;
}

function canCarry(userIdOrState, addItemId, addQty = 1) {
  const st = typeof userIdOrState === 'object' ? ensureState(userIdOrState) : getUser(userIdOrState);
  const w  = totalWeight(st);
  const addW = getItemWeight(addItemId) * Math.max(1, Number(addQty) || 1);
  return (w + addW) <= st.weight_max;
}

// ─────────────────────────────────────────────────────────────
// Vitals (faim/soif)

function applyDecay(state) {
  const t = nowMs();

  // Δ temps en minutes
  const dH_min = Math.max(0, (t - state.lastHungerTs) / 60000);
  const dT_min = Math.max(0, (t - state.lastThirstTs) / 60000);

  if (dH_min > 0) {
    const decH = dH_min * HUNGER_DROP_PER_MIN;
    state.hunger = clamp0_100(state.hunger - decH);
    state.lastHungerTs = t;
  }
  if (dT_min > 0) {
    const decT = dT_min * THIRST_DROP_PER_MIN;
    state.thirst = clamp0_100(state.thirst - decT);
    state.lastThirstTs = t;
  }

  return state;
}

function getVitals(userId) {
  const db = loadDB();
  const cur = ensureState(db[userId], userId);
  const next = applyDecay(cur);
  db[userId] = next;
  saveDB(db);
  return { hunger: next.hunger, thirst: next.thirst };
}

function changeVitals(userId, { hungerDelta = 0, thirstDelta = 0 } = {}) {
  const db = loadDB();
  const st = applyDecay(ensureState(db[userId], userId));
  const t = nowMs();

  if (hungerDelta) {
    st.hunger = clamp0_100(st.hunger + hungerDelta);
    st.lastHungerTs = t;
  }
  if (thirstDelta) {
    st.thirst = clamp0_100(st.thirst + thirstDelta);
    st.lastThirstTs = t;
  }

  db[userId] = st;
  saveDB(db);
  return { ok: true, state: st };
}

// ─────────────────────────────────────────────────────────────
// CRUD inventaire

function getUser(userId) {
  const db = loadDB();
  const st = ensureState(db[userId], userId);
  if (db[userId] !== st) {
    db[userId] = st;
    saveDB(db);
  }
  return st;
}

function setUser(userId, nextState) {
  const db = loadDB();
  db[userId] = ensureState(nextState, userId);
  saveDB(db);
  return db[userId];
}

function addItem(userId, itemId, qty = 1) {
  const db = loadDB();
  const st = applyDecay(ensureState(db[userId], userId));

  const q = Math.max(1, Number(qty) || 1);

  // contrainte de poids
  const meta = catalog[itemId];
  if (meta) {
    const wAdd = getItemWeight(itemId) * q;
    const wCur = totalWeight(st);
    if ((wCur + wAdd) > st.weight_max) {
      return { ok: false, reason: 'OVERWEIGHT', current: wCur, add: wAdd, max: st.weight_max };
    }
  }

  const idx = st.items.findIndex(e => (e.name || e.id) === itemId);
  if (idx >= 0) {
    const cur = st.items[idx];
    const curQty = typeof cur.quantity === 'number' ? cur.quantity :
                   (typeof cur.qty === 'number' ? cur.qty : 0);
    st.items[idx] = { ...cur, name: itemId, quantity: curQty + q };
  } else {
    st.items.push({ name: itemId, quantity: q });
  }

  db[userId] = st;
  saveDB(db);
  return { ok: true, state: st };
}

function removeItem(userId, itemId, qty = 1) {
  const db = loadDB();
  const st = applyDecay(ensureState(db[userId], userId));

  const q = Math.max(1, Number(qty) || 1);
  const idx = st.items.findIndex(e => (e.name || e.id) === itemId);
  if (idx < 0) return { ok: false, reason: 'NOT_FOUND' };

  const cur = st.items[idx];
  const curQty = typeof cur.quantity === 'number' ? cur.quantity :
                 (typeof cur.qty === 'number' ? cur.qty : 0);
  if (curQty < q) return { ok: false, reason: 'NOT_ENOUGH' };

  const newQty = curQty - q;
  if (newQty <= 0) st.items.splice(idx, 1);
  else st.items[idx] = { ...cur, name: itemId, quantity: newQty };

  db[userId] = st;
  saveDB(db);
  return { ok: true, state: st };
}

function transferItem(fromId, toId, itemId, qty = 1) {
  const r1 = removeItem(fromId, itemId, qty);
  if (!r1.ok) return r1;
  const r2 = addItem(toId, itemId, qty);
  if (!r2.ok) {
    addItem(fromId, itemId, qty);
    return r2;
  }
  return { ok: true };
}

function consumeItem(userId, itemId, qty = 1) {
  const q = Math.max(1, Number(qty) || 1);
  const meta = catalog[itemId];
  if (!meta) return { ok: false, reason: 'UNKNOWN_ITEM' };
  if (!meta.consumable) return { ok: false, reason: 'NOT_CONSUMABLE' };

  const r = removeItem(userId, itemId, q);
  if (!r.ok) return r;

  const thirstDelta = Number(meta.effect?.thirstDelta || 0) * q;
  const hungerDelta = Number(meta.effect?.hungerDelta || 0) * q;

  changeVitals(userId, { hungerDelta, thirstDelta });

  return { ok: true, effect: { hungerDelta, thirstDelta } };
}

// ─────────────────────────────────────────────────────────────
// Exports

module.exports = {
  // État
  getUser,
  setUser,

  // Vitals
  getVitals,
  changeVitals,

  // Poids
  totalWeight,
  canCarry,

  // Items
  addItem,
  removeItem,
  transferItem,
  consumeItem,
};
