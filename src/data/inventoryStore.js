// src/data/inventoryStore.js
const fs = require("fs");
const path = require("path");
const catalog = require("./itemCatalog");
const { resolveItemId } = require("./itemNameResolver");

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "inventories.json");

const HUNGER_MS_TO_ZERO = 90 * 60 * 1000; // 1h30
const THIRST_MS_TO_ZERO = 60 * 60 * 1000; // 1h
const MAX_WEIGHT = 60.0;

function ensure() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "{}", "utf8");
}
ensure();

function load() { try { return JSON.parse(fs.readFileSync(FILE, "utf8") || "{}"); } catch { return {}; } }
function save(obj){ try { fs.writeFileSync(FILE, JSON.stringify(obj, null, 2), "utf8"); } catch {} }
function now(){ return Date.now(); }
function clamp01(v){ return Math.max(0, Math.min(100, v)); }

function computeCurrentBars(state){
  const last = state.lastUpdate || now();
  const dt = now() - last;
  const hungerDrop = (dt / HUNGER_MS_TO_ZERO) * 100;
  const thirstDrop = (dt / THIRST_MS_TO_ZERO) * 100;
  return {
    hunger: clamp01((state.hunger ?? 100) - hungerDrop),
    thirst: clamp01((state.thirst ?? 100) - thirstDrop),
  };
}
function materializeBars(state){
  const bars = computeCurrentBars(state);
  state.hunger = bars.hunger;
  state.thirst = bars.thirst;
  state.lastUpdate = now();
}

function defaultState(userId){
  return { user_id: userId, items: [], weight_max: MAX_WEIGHT, hunger: 100, thirst: 100, lastUpdate: now() };
}

function getUser(userId){
  const db = load();
  if (!db[userId]) { db[userId] = defaultState(userId); save(db); }
  materializeBars(db[userId]);
  save(db);
  return db[userId];
}
function setUser(userId, state){ const db = load(); db[userId] = state; save(db); }

function totalWeight(items){
  return Number(items.reduce((sum, it) => {
    const meta = catalog[it.name] || { weight: it.weight || 0 };
    const w = (typeof meta.weight === "number" ? meta.weight : 0);
    const q = it.quantity ?? 1;
    return sum + w * q;
  }, 0).toFixed(2));
}

function addItem(userId, rawNameOrId, qty=1){
  const itemName = resolveItemId(rawNameOrId);
  const st = getUser(userId);
  const meta = catalog[itemName];
  const stackable = meta?.stackable ?? true;

  const wBefore = totalWeight(st.items);
  const wDelta  = (meta?.weight ?? 0) * qty;
  if (wBefore + wDelta > st.weight_max + 1e-6) {
    return { ok:false, reason:`Poids dépassé (${(wBefore + wDelta).toFixed(2)} / ${st.weight_max})` };
    }

  const idx = st.items.findIndex(i => i.name === itemName);
  if (idx >= 0 && stackable) {
    st.items[idx].quantity = (st.items[idx].quantity ?? 1) + qty;
  } else {
    st.items.push({ name: itemName, quantity: stackable ? qty : 1, weight: meta?.weight ?? 0 });
  }
  setUser(userId, st);
  return { ok:true, state: st };
}

function removeItem(userId, rawNameOrId, qty=1){
  const itemName = resolveItemId(rawNameOrId);
  const st = getUser(userId);
  const idx = st.items.findIndex(i => i.name === itemName);
  if (idx < 0) return { ok:false, reason:"Item introuvable." };
  const it = st.items[idx];
  const q = it.quantity ?? 1;
  if (q > qty && (catalog[itemName]?.stackable ?? true)) {
    it.quantity = q - qty;
  } else {
    st.items.splice(idx, 1);
  }
  setUser(userId, st);
  return { ok:true, state: st };
}

function transferItem(fromId, toId, rawNameOrId, qty=1){
  const itemName = resolveItemId(rawNameOrId);
  const from = getUser(fromId);
  const to   = getUser(toId);

  const idx = from.items.findIndex(i => i.name === itemName);
  if (idx < 0) return { ok:false, reason:"Item absent chez le donneur." };
  const available = from.items[idx].quantity ?? 1;
  const take = Math.min(qty, available);

  const meta = catalog[itemName];
  const wBefore = totalWeight(to.items);
  const wDelta  = (meta?.weight ?? 0) * take;
  if (wBefore + wDelta > to.weight_max + 1e-6) {
    return { ok:false, reason:"Le receveur est trop chargé." };
  }

  removeItem(fromId, itemName, take);
  addItem(toId, itemName, take);

  return { ok:true, qty: take };
}

function consumeItem(userId, rawNameOrId, qty=1){
  const itemName = resolveItemId(rawNameOrId);
  const st = getUser(userId);
  const meta = catalog[itemName];
  if (!meta?.consumable) return { ok:false, reason:"Objet non consommable." };

  materializeBars(st);
  let { hunger, thirst } = st;
  for (let i=0;i<qty;i++){
    if (typeof meta.effect?.hungerDelta === "number") hunger = clamp01(hunger + meta.effect.hungerDelta);
    if (typeof meta.effect?.thirstDelta === "number") thirst = clamp01(thirst + meta.effect.thirstDelta);
  }
  st.hunger = hunger; st.thirst = thirst; st.lastUpdate = now();

  const r = removeItem(userId, itemName, qty);
  if (!r.ok) return r;

  setUser(userId, st);
  return { ok:true, state: st, hunger, thirst };
}

module.exports = {
  MAX_WEIGHT,
  getUser, setUser,
  addItem, removeItem, transferItem, consumeItem,
  totalWeight, computeCurrentBars,
};
