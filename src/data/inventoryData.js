// src/data/inventoryData.js
const { loadJSON, saveJSON } = require('./jsonUtil');

const FILE = 'inventories.json';
const DEFAULT_SECTIONS = () => ({
  armes: [],       // {name, qty, meta?}
  chevaux: [],
  charrettes: [],
  minerais: [],
  autres: []
});

function _db(){ return loadJSON(FILE, {}); }
function _save(db){ saveJSON(FILE, db); }

function getInventory(userId){
  const db = _db();
  if (!db[userId]) {
    db[userId] = { bag: false, sections: DEFAULT_SECTIONS() };
    _save(db);
  } else {
    db[userId].sections ||= DEFAULT_SECTIONS();
    for (const k of Object.keys(DEFAULT_SECTIONS())) db[userId].sections[k] ||= [];
    db[userId].bag = !!db[userId].bag;
    _save(db);
  }
  return db[userId];
}

function setBag(userId, have=true){
  const db = _db();
  if (!db[userId]) db[userId] = { bag: !!have, sections: DEFAULT_SECTIONS() };
  else db[userId].bag = !!have;
  _save(db);
  return db[userId].bag;
}

function addItem(userId, category, name, qty=1, meta=null){
  const inv = getInventory(userId);
  const arr = inv.sections[category];
  if (!Array.isArray(arr)) throw new Error('Catégorie invalide');
  const idx = arr.findIndex(x => x.name === name && JSON.stringify(x.meta||null) === JSON.stringify(meta||null));
  if (idx >= 0) arr[idx].qty += qty;
  else arr.push({ name, qty, meta: meta || undefined });
  const db = _db(); db[userId] = inv; _save(db);
}

function removeItem(userId, category, name, qty=1){
  const inv = getInventory(userId);
  const arr = inv.sections[category];
  const i = arr.findIndex(x => x.name === name);
  if (i < 0 || arr[i].qty < qty) throw new Error('Quantité insuffisante');
  arr[i].qty -= qty;
  if (arr[i].qty <= 0) arr.splice(i,1);
  const db = _db(); db[userId] = inv; _save(db);
}

module.exports = {
  getInventory, setBag, addItem, removeItem
};
