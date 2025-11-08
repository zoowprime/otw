// src/data/inventoryData.js
const { loadJSON, saveJSON } = require('./jsonUtil');

const FILE = 'inventories.json';

// structure de base
const DEFAULT_SECTIONS = () => ({
  armes: [],
  chevaux: [],
  charrettes: [],
  minerais: [],
  autres: []
});

function _db() { return loadJSON(FILE, {}); }
function _save(db) { saveJSON(FILE, db); }

function _ensureUser(db, userId) {
  if (!db[userId]) {
    db[userId] = { bag: false, sections: DEFAULT_SECTIONS() };
    return;
  }
  // normaliser la structure
  db[userId].sections ||= {};
  const base = DEFAULT_SECTIONS();
  for (const k of Object.keys(base)) {
    if (!Array.isArray(db[userId].sections[k])) db[userId].sections[k] = [];
  }
  db[userId].bag = !!db[userId].bag;
}

function getInventory(userId) {
  const db = _db();
  _ensureUser(db, userId);
  _save(db);
  return db[userId];
}

function setBag(userId, have = true) {
  const db = _db();
  _ensureUser(db, userId);
  db[userId].bag = !!have;
  _save(db);
  return db[userId].bag;
}

function addItem(userId, category, name, qty = 1, meta = null) {
  const db = _db();
  _ensureUser(db, userId);

  // sécuriser la catégorie
  if (!db[userId].sections[category]) {
    db[userId].sections[category] = [];
  }
  const arr = db[userId].sections[category];
  if (!Array.isArray(arr)) {
    db[userId].sections[category] = [];
  }
  const list = db[userId].sections[category];

  const idx = list.findIndex(
    x => x.name === name && JSON.stringify(x.meta ?? null) === JSON.stringify(meta ?? null)
  );
  if (idx >= 0) list[idx].qty += qty;
  else list.push({ name, qty, meta: meta || undefined });

  _save(db);
}

function removeItem(userId, category, name, qty = 1) {
  const db = _db();
  _ensureUser(db, userId);

  const arr = db[userId].sections[category];
  if (!Array.isArray(arr)) throw new Error('Catégorie invalide');

  const i = arr.findIndex(x => x.name === name);
  if (i < 0 || (arr[i].qty ?? 0) < qty) throw new Error('Quantité insuffisante');

  arr[i].qty -= qty;
  if (arr[i].qty <= 0) arr.splice(i, 1);

  _save(db);
}

module.exports = {
  getInventory, setBag, addItem, removeItem
};
