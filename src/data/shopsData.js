// src/data/shopsData.js
const { loadJSON, saveJSON } = require('./jsonUtil');
const { getOrCreateAccount, updateAccount } = require('../economyData');

// fichiers
const FILE_STOCK  = 'shops_stock.json';
const FILE_PRICES = 'shops_prices.json';

// catégories supportées
const CATS = ['armes','chevaux','charrettes','autres','minerais'];

// rôles => shopId
const roleToShop = {
  [process.env.ARMURERIE_SD_ROLE]:     'armurerie_sd',
  [process.env.ARMURERIE_RHODES_ROLE]: 'armurerie_rhodes',
  [process.env.ARMURERIE_AB_ROLE]:     'armurerie_ab',
  [process.env.ECURIE_SD_ROLE]:        'ecurie_sd',
  [process.env.ECURIE_RHODES_ROLE]:    'ecurie_rhodes',
  [process.env.ECURIE_VH_ROLE]:        'ecurie_vh',
};

// mapping shopId -> nom de variable d’env
function envVarForShop(shopId) {
  const map = {
    armurerie_sd:     'PATRON_ARMURERIE_SD_USER_ID',
    armurerie_rhodes: 'PATRON_ARMURERIE_RHODES_USER_ID',
    armurerie_ab:     'PATRON_ARMURERIE_AB_USER_ID',
    ecurie_sd:        'PATRON_ECURIE_SD_USER_ID',
    ecurie_rhodes:    'PATRON_ECURIE_RHODES_USER_ID',
    ecurie_vh:        'PATRON_ECURIE_VH_USER_ID',
  };
  return map[shopId] || null;
}

function getOwnerId(shopId) {
  const varName = envVarForShop(shopId);
  if (!varName) return null;
  const v = process.env[varName];
  return v && v.trim() ? v.trim() : null;
}

// util json
function _stock() { return loadJSON(FILE_STOCK, {}); }
function _saveStock(db) { saveJSON(FILE_STOCK, db); }
function _prices() { return loadJSON(FILE_PRICES, {}); }
function _savePrices(db) { saveJSON(FILE_PRICES, db); }

// s’assure que le shop existe DANS l’objet db passé
function ensureShopStockInDb(db, shopId) {
  if (!db[shopId]) db[shopId] = {};
  for (const c of CATS) {
    if (!db[shopId][c]) db[shopId][c] = {};
  }
  return db;
}

// API
function getShopIdFromMember(member) {
  for (const [roleId, sid] of Object.entries(roleToShop)) {
    if (!roleId) continue;
    if (member.roles.cache.has(roleId)) return sid;
  }
  return null;
}

function incrementStock(shopId, category, itemName, qty = 1) {
  const db = _stock();
  ensureShopStockInDb(db, shopId);
  db[shopId][category][itemName] = (db[shopId][category][itemName] ?? 0) + qty;
  _saveStock(db);
}

function decrementStock(shopId, category, itemName, qty = 1) {
  const db = _stock();
  ensureShopStockInDb(db, shopId);
  const cur = db[shopId][category][itemName] ?? 0;
  if (cur < qty) throw new Error('Stock insuffisant');
  const left = cur - qty;
  if (left <= 0) delete db[shopId][category][itemName];
  else db[shopId][category][itemName] = left;
  _saveStock(db);
}

function getShopStock(shopId) {
  const db = _stock();
  ensureShopStockInDb(db, shopId);
  _saveStock(db);
  return db[shopId];
}

// PRIX
function setPrice(shopId, category, itemName, price) {
  const p = _prices();
  if (!p[shopId]) p[shopId] = {};
  if (!p[shopId][category]) p[shopId][category] = {};
  p[shopId][category][itemName] = Number(price);
  _savePrices(p);
}
function getPrice(shopId, category, itemName) {
  const p = _prices();
  return p?.[shopId]?.[category]?.[itemName] ?? null;
}
function getAllPrices(shopId) {
  const p = _prices();
  return p?.[shopId] || {};
}
function resetPrices(shopId) {
  const p = _prices();
  delete p[shopId];
  _savePrices(p);
}

// Paiements entreprise (patron)
function debitOwnerEnterprise(shopId, amount) {
  const varName = envVarForShop(shopId);
  const ownerId = getOwnerId(shopId);
  if (!ownerId) return { ok: false, reason: 'Aucun patron défini', missingEnv: varName };

  const acc = getOrCreateAccount(ownerId);
  acc.entreprise ||= { liquide: 0, banque: 0 };

  const total = (acc.entreprise.banque || 0) + (acc.entreprise.liquide || 0);
  if (total < amount) return { ok: false, reason: 'Fonds insuffisants (entreprise)' };

  let rest = amount;
  if (acc.entreprise.banque >= rest) {
    acc.entreprise.banque -= rest;
    rest = 0;
  } else {
    rest -= acc.entreprise.banque;
    acc.entreprise.banque = 0;
    acc.entreprise.liquide = Math.max(0, (acc.entreprise.liquide || 0) - rest);
    rest = 0;
  }
  updateAccount(ownerId, acc);
  return { ok: true, ownerId };
}

function creditOwnerEnterpriseBank(shopId, amount) {
  const ownerId = getOwnerId(shopId);
  if (!ownerId) return { ok: false, reason: 'Aucun patron défini' };
  const acc = getOrCreateAccount(ownerId);
  acc.entreprise ||= { liquide: 0, banque: 0 };
  acc.entreprise.banque = (acc.entreprise.banque || 0) + amount;
  updateAccount(ownerId, acc);
  return { ok: true, ownerId };
}

module.exports = {
  // maps
  CATS, envVarForShop,

  // shop helpers
  getShopIdFromMember, getOwnerId,

  // stock
  incrementStock, decrementStock, getShopStock,

  // prix
  setPrice, getPrice, getAllPrices, resetPrices,

  // finance
  debitOwnerEnterprise, creditOwnerEnterpriseBank,
};
