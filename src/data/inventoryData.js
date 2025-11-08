// src/data/inventoryData.js
const { loadJSON, saveJSON } = require('./jsonUtil');

const FILE = 'inventories.json';

function _db() {
  return loadJSON(FILE, {});
}
function _save(db) {
  saveJSON(FILE, db);
}

function ensureUser(id) {
  const db = _db();
  if (!db[id]) db[id] = { armes: {}, chevaux: {}, charrettes: {}, autres: {}, minerais: {} };
  _save(db);
  return db[id];
}

function addItem(userId, category, item, qty = 1) {
  const db = _db();
  ensureUser(userId);
  db[userId][category][item] = (db[userId][category][item] || 0) + qty;
  _save(db);
}

function removeItem(userId, category, item, qty = 1) {
  const db = _db();
  if (!db[userId]?.[category]?.[item]) return;
  db[userId][category][item] -= qty;
  if (db[userId][category][item] <= 0) delete db[userId][category][item];
  _save(db);
}

function getInventory(userId) {
  return ensureUser(userId);
}

module.exports = { addItem, removeItem, getInventory };
