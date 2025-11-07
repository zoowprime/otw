// src/data/shopsData.js
const { loadJSON, saveJSON } = require('./jsonUtil');
const { getOrCreateAccount, updateAccount } = require('../economyData');

// ==============================
// Constantes & helpers
// ==============================

// Fichiers JSON persistés
const FILE_STOCK  = 'shops_stock.json';
const FILE_PRICES = 'shops_prices.json';

// Catégories gérées par les shops
const CATS = ['armes', 'chevaux', 'charrettes', 'autres', 'minerais'];

// Mapping rôles -> shopId (un membre peut appartenir à une boutique via son rôle)
const roleToShop = {
  [process.env.ARMURERIE_SD_ROLE]:     'armurerie_sd',
  [process.env.ARMURERIE_RHODES_ROLE]: 'armurerie_rhodes',
  [process.env.ARMURERIE_AB_ROLE]:     'armurerie_ab',
  [process.env.ECURIE_SD_ROLE]:        'ecurie_sd',
  [process.env.ECURIE_RHODES_ROLE]:    'ecurie_rhodes',
  [process.env.ECURIE_VH_ROLE]:        'ecurie_vh',
};

// Helper pour lire proprement un userId depuis l'env
function envId(key) {
  const v = process.env[key];
  return v && String(v).trim().length ? String(v).trim() : null;
}

// Mapping shopId -> patron (userId)
// ⚠️ LUS DANS LES VARIABLES ..._USER_ID
const shopOwner = {
  armurerie_sd:     envId('PATRON_ARMURERIE_SD_USER_ID'),
  armurerie_rhodes: envId('PATRON_ARMURERIE_RHODES_USER_ID'),
  armurerie_ab:     envId('PATRON_ARMURERIE_AB_USER_ID'),
  ecurie_sd:        envId('PATRON_ECURIE_SD_USER_ID'),
  ecurie_rhodes:    envId('PATRON_ECURIE_RHODES_USER_ID'),
  ecurie_vh:        envId('PATRON_ECURIE_VH_USER_ID'),
};

// ==============================
// Accès de base aux fichiers
// ==============================
function _stock()       { return loadJSON(FILE_STOCK,  {}); }
function _saveStock(db) { saveJSON(FILE_STOCK,  db); }
function _prices()      { return loadJSON(FILE_PRICES, {}); }
function _savePrices(p) { saveJSON(FILE_PRICES, p); }

// ==============================
// API: Shops & rôles
// ==============================
function getShopIdFromMember(member) {
  // On parcourt les rôles du membre, le premier qui matche gagne
  for (const [roleId, shopId] of Object.entries(roleToShop)) {
    if (!roleId) continue;
    if (member.roles.cache.has(roleId)) return shopId;
  }
  return null;
}

function getOwnerId(shopId) {
  return shopOwner[shopId] || null;
}

// ==============================
// API: Stock
// ==============================
function ensureShopStock(shopId) {
  const db = _stock();
  if (!db[shopId]) {
    db[shopId] = {};
    for (const c of CATS) db[shopId][c] = {};
    _saveStock(db);
  } else {
    for (const c of CATS) db[shopId][c] ||= {};
    _saveStock(db);
  }
  return db[shopId];
}

function incrementStock(shopId, category, itemName, qty = 1) {
  if (!CATS.includes(category)) throw new Error('Catégorie invalide');
  const db = _stock();
  ensureShopStock(shopId);
  db[shopId][category][itemName] = (db[shopId][category][itemName] ?? 0) + qty;
  _saveStock(db);
}

function decrementStock(shopId, category, itemName, qty = 1) {
  if (!CATS.includes(category)) throw new Error('Catégorie invalide');
  const db = _stock();
  ensureShopStock(shopId);
  const cur = db[shopId][category][itemName] ?? 0;
  if (cur < qty) throw new Error('Stock insuffisant');
  db[shopId][category][itemName] = cur - qty;
  if (db[shopId][category][itemName] <= 0) delete db[shopId][category][itemName];
  _saveStock(db);
}

function getShopStock(shopId) {
  ensureShopStock(shopId);
  const db = _stock();
  return db[shopId];
}

// ==============================
// API: Prix
// ==============================
function setPrice(shopId, category, itemName, price) {
  if (!CATS.includes(category)) throw new Error('Catégorie invalide');
  const p = _prices();
  p[shopId] ||= {};
  p[shopId][category] ||= {};
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
  if (p[shopId]) delete p[shopId];
  _savePrices(p);
}

// ==============================
// API: Paiements entreprise (patron)
// ==============================

/**
 * Débite le compte entreprise du patron d'un shop.
 * Règle: d'abord banque, puis liquide.
 * @returns { ok: boolean, reason?: string, ownerId?: string, before?: {liquide,banque}, after?: {liquide,banque} }
 */
function debitOwnerEnterprise(shopId, amount) {
  const ownerId = getOwnerId(shopId);
  if (!ownerId) return { ok: false, reason: 'Aucun patron défini.' };

  const acc = getOrCreateAccount(ownerId);
  const cur = acc.entreprise || { liquide: 0, banque: 0 };

  const total = (cur.banque || 0) + (cur.liquide || 0);
  if (total < amount) return { ok: false, reason: 'Fonds insuffisants (entreprise).' };

  const before = { liquide: cur.liquide || 0, banque: cur.banque || 0 };
  let rest = amount;

  if (cur.banque >= rest) {
    cur.banque -= rest;
    rest = 0;
  } else {
    rest -= cur.banque;
    cur.banque = 0;
    cur.liquide = Math.max(0, (cur.liquide || 0) - rest);
    rest = 0;
  }

  acc.entreprise = cur;
  updateAccount(ownerId, acc);

  return { ok: true, ownerId, before, after: { liquide: cur.liquide, banque: cur.banque } };
}

/**
 * Crédite la banque entreprise du patron d'un shop.
 * @returns { ok: boolean, reason?: string, ownerId?: string }
 */
function creditOwnerEnterpriseBank(shopId, amount) {
  const ownerId = getOwnerId(shopId);
  if (!ownerId) return { ok: false, reason: 'Aucun patron défini.' };

  const acc = getOrCreateAccount(ownerId);
  acc.entreprise ||= { liquide: 0, banque: 0 };
  acc.entreprise.banque = (acc.entreprise.banque || 0) + amount;

  updateAccount(ownerId, acc);
  return { ok: true, ownerId };
}

// ==============================
// Exports
// ==============================
module.exports = {
  // mapping & infos
  CATS,
  getShopIdFromMember,
  getOwnerId,

  // stock
  ensureShopStock,
  incrementStock,
  decrementStock,
  getShopStock,

  // prix
  setPrice,
  getPrice,
  getAllPrices,
  resetPrices,

  // paiements
  debitOwnerEnterprise,
  creditOwnerEnterpriseBank,
};
