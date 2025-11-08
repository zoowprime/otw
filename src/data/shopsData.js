// src/data/shopsData.js
// Gestion des stocks, prix, et comptes entreprises (patrons)

const { loadJSON, saveJSON } = require('./jsonUtil');
const { getOrCreateAccount, updateAccount } = require('../economyData');

// --- FICHIERS PERSISTANTS ----------------------------------------------------
const FILE_STOCK  = 'shops_stock.json';
const FILE_PRICES = 'shops_prices.json';

// --- CATEGORIES PRISES EN CHARGE --------------------------------------------
const CATS = ['armes', 'chevaux', 'charrettes', 'autres', 'minerais'];

// --- MAPPING ROLES -> SHOP ID -----------------------------------------------
// (si un rôle est vide dans .env, il sera simplement ignoré)
const roleToShop = {
  [process.env.ARMURERIE_SD_ROLE]:     'armurerie_sd',
  [process.env.ARMURERIE_RHODES_ROLE]: 'armurerie_rhodes',
  [process.env.ARMURERIE_AB_ROLE]:     'armurerie_ab',
  [process.env.ECURIE_SD_ROLE]:        'ecurie_sd',
  [process.env.ECURIE_RHODES_ROLE]:    'ecurie_rhodes',
  [process.env.ECURIE_VH_ROLE]:        'ecurie_vh',
};

// --- SHOP -> NOM DE VARIABLE D'ENV DU PATRON --------------------------------
// IMPORTANT : on NE lit plus les valeurs à l’init (pour éviter les ""/undefined fixés),
// on résout dynamiquement à chaque appel.
const OWNER_ENV_VAR = {
  armurerie_sd:     'PATRON_ARMURERIE_SD_USER_ID',
  armurerie_rhodes: 'PATRON_ARMURERIE_RHODES_USER_ID',
  armurerie_ab:     'PATRON_ARMURERIE_AB_USER_ID',
  ecurie_sd:        'PATRON_ECURIE_SD_USER_ID',
  ecurie_rhodes:    'PATRON_ECURIE_RHODES_USER_ID',
  ecurie_vh:        'PATRON_ECURIE_VH_USER_ID',
};

// Donne le nom de la variable d'env attendue pour un shop
function envVarForShop(shopId) {
  return OWNER_ENV_VAR[shopId] || null;
}

// Lit l'ID patron dans process.env et normalise (string vide -> null)
function getOwnerId(shopId) {
  const varName = envVarForShop(shopId);
  if (!varName) return null;
  const raw = process.env[varName];
  if (!raw) return null;
  const trimmed = String(raw).trim();
  return trimmed.length ? trimmed : null;
}

// Récupère le shopId depuis les rôles d'un membre
function getShopIdFromMember(member) {
  // Staff : peut agir sur n’importe quelle boutique (mais shopId reste celui du rôle du membre)
  // Ici on ne “force” pas un shop pour le staff : on vérifie d’abord les rôles boutiques.
  for (const [roleId, shopId] of Object.entries(roleToShop)) {
    if (!roleId) continue;
    if (member.roles.cache.has(roleId)) return shopId;
  }
  // Si c’est un staff mais sans rôle boutique, il n’a pas de shopId associé
  return null;
}

// --- PERSISTENCE STOCK/PRIX --------------------------------------------------
function _stock()       { return loadJSON(FILE_STOCK, {}); }
function _saveStock(db) { saveJSON(FILE_STOCK, db); }
function _prices()      { return loadJSON(FILE_PRICES, {}); }
function _savePrices(db){ saveJSON(FILE_PRICES, db); }

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

function getShopStock(shopId) {
  ensureShopStock(shopId);
  return _stock()[shopId];
}

function incrementStock(shopId, category, itemName, qty = 1) {
  const db = _stock(); ensureShopStock(shopId);
  db[shopId][category][itemName] = (db[shopId][category][itemName] ?? 0) + qty;
  _saveStock(db);
}

function decrementStock(shopId, category, itemName, qty = 1) {
  const db = _stock(); ensureShopStock(shopId);
  const cur = db[shopId][category][itemName] ?? 0;
  if (cur < qty) throw new Error('Stock insuffisant');
  const newQty = cur - qty;
  if (newQty <= 0) delete db[shopId][category][itemName];
  else db[shopId][category][itemName] = newQty;
  _saveStock(db);
}

// --- PRIX --------------------------------------------------------------------
function setPrice(shopId, category, itemName, price) {
  const p = _prices();
  p[shopId] ||= {}; p[shopId][category] ||= {};
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

// --- TRANSACTIONS ENTREPRISE -------------------------------------------------
// Débite d’abord banque, puis liquide
function debitOwnerEnterprise(shopId, amount) {
  const ownerId = getOwnerId(shopId);
  if (!ownerId) {
    return {
      ok: false,
      reason: 'Aucun patron défini',
      missingEnv: envVarForShop(shopId),
    };
  }
  const acc = getOrCreateAccount(ownerId);
  acc.entreprise ||= { liquide: 0, banque: 0 };
  const total = (acc.entreprise.banque || 0) + (acc.entreprise.liquide || 0);
  if (total < amount) {
    return { ok: false, reason: 'Fonds insuffisants (entreprise)', ownerId };
  }

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
  if (!ownerId) {
    return { ok: false, reason: 'Aucun patron défini', missingEnv: envVarForShop(shopId) };
  }
  const acc = getOrCreateAccount(ownerId);
  acc.entreprise ||= { liquide: 0, banque: 0 };
  acc.entreprise.banque = (acc.entreprise.banque || 0) + amount;
  updateAccount(ownerId, acc);
  return { ok: true, ownerId };
}

module.exports = {
  // mapping & helpers
  getShopIdFromMember,
  getOwnerId,
  envVarForShop,

  // stock
  ensureShopStock,
  getShopStock,
  incrementStock,
  decrementStock,

  // prix
  setPrice,
  getPrice,
  getAllPrices,
  resetPrices,

  // comptes
  debitOwnerEnterprise,
  creditOwnerEnterpriseBank,

  CATS,
};
