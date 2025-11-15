// src/data/stableData.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/data';
const FILE = path.join(DATA_DIR, 'stable.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load() {
  try {
    if (!fs.existsSync(FILE)) {
      return { horses: {}, carts: {} };
    }
    const raw = fs.readFileSync(FILE, 'utf8');
    const json = JSON.parse(raw || '{}');
    if (!json.horses) json.horses = {};
    if (!json.carts)  json.carts  = {};
    return json;
  } catch {
    return { horses: {}, carts: {} };
  }
}

function save(db) {
  try {
    fs.writeFileSync(FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch {
    // ignore
  }
}

function getStable(userId) {
  const db = load();
  return {
    horseId: db.horses[userId] || null,
    cartId:  db.carts[userId]  || null,
  };
}

function setPlayerHorse(userId, horseId) {
  const db = load();
  db.horses[userId] = horseId;
  save(db);
}

function clearPlayerHorse(userId) {
  const db = load();
  delete db.horses[userId];
  save(db);
}

function setPlayerCart(userId, cartId) {
  const db = load();
  db.carts[userId] = cartId;
  save(db);
}

function clearPlayerCart(userId) {
  const db = load();
  delete db.carts[userId];
  save(db);
}

module.exports = {
  getStable,
  setPlayerHorse,
  clearPlayerHorse,
  setPlayerCart,
  clearPlayerCart,
};
