// src/data/vehicleData.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/data';
const FILE = path.join(DATA_DIR, 'vehicles.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function load() {
  try {
    if (!fs.existsSync(FILE)) return { horses: {}, carts: {} };
    const raw = fs.readFileSync(FILE, 'utf8');
    const json = JSON.parse(raw || '{}');
    if (!json.horses) json.horses = {};
    if (!json.carts) json.carts = {};
    return json;
  } catch {
    return { horses: {}, carts: {} };
  }
}
function save(db) {
  try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2), 'utf8'); } catch {}
}

// Capacités (kg)
const SACOCHE_CHEVAL_MAX_KG = 40;
const SACOCHE_CHARRETTE_MAX_KG = 120;

function getHorse(userId) {
  const db = load();
  return db.horses[userId] || null;
}
function getCart(userId) {
  const db = load();
  return db.carts[userId] || null;
}
function setHorse(userId, entry) {
  const db = load();
  db.horses[userId] = {
    id: entry.id,
    name: entry.name,
    breed: entry.breed || null,
    bag: entry.bag || [], // [{id, qty, weight}]
  };
  save(db); return db.horses[userId];
}
function removeHorse(userId) {
  const db = load();
  delete db.horses[userId];
  save(db);
}
function setCart(userId, entry) {
  const db = load();
  db.carts[userId] = {
    id: entry.id,
    name: entry.name,
    bag: entry.bag || [],
  };
  save(db); return db.carts[userId];
}
function removeCart(userId) {
  const db = load();
  delete db.carts[userId];
  save(db);
}

function bagWeight(arr) {
  return (arr || []).reduce((s, it) => s + (Number(it.weight || 0) * Number(it.qty || 0)), 0);
}
function pushToBag(container, itemMeta, qty) {
  const it = container.bag.find(x => x.id === itemMeta.id);
  if (it) it.qty += qty;
  else container.bag.push({ id: itemMeta.id, qty, weight: itemMeta.weight || 0 });
}

// export capacities for UI
module.exports = {
  getHorse, setHorse, removeHorse,
  getCart, setCart, removeCart,
  bagWeight, pushToBag,
  SACOCHE_CHEVAL_MAX_KG, SACOCHE_CHARRETTE_MAX_KG,
};
