// src/data/shopsData.js
const { loadJSON, saveJSON } = require('./jsonUtil');
const { getOrCreateAccount, updateAccount } = require('../economyData');

// fichiers
const FILE_STOCK  = 'shops_stock.json';
const FILE_PRICES = 'shops_prices.json';

// catégories gérées par les shops
const CATS = ['armes','chevaux','charrettes','autres','minerais'];

/**
 * Mapping des rôles vers les shops, avec un "kind" explicite
 * kind: 'armurerie' | 'ecurie'
 */
const roleToShop = [
  { roleId: process.env.ARMURERIE_SD_ROLE,     shopId: 'armurerie_sd',     kind: 'armurerie' },
  { roleId: process.env.ARMURERIE_RHODES_ROLE, shopId: 'armurerie_rhodes', kind: 'armurerie' },
  { roleId: process.env.ARMURERIE_AB_ROLE,     shopId: 'armurerie_ab',     kind: 'armurerie' },

  { roleId: process.env.ECURIE_SD_ROLE,        shopId: 'ecurie_sd',        kind: 'ecurie' },
  { roleId: process.env.ECURIE_RHODES_ROLE,    shopId: 'ecurie_rhodes',    kind: 'ecurie' },
  { roleId: process.env.ECURIE_VH_ROLE,        shopId: 'ecurie_vh',        kind: 'ecurie' },
];

/**
 * shopId => variable d'env du patron (user id) pour message d’erreur
 * (sert uniquement à afficher l’ENV manquante dans les embeds)
 */
const shopToOwnerEnv = {
  armurerie_sd:     'PATRON_ARMURERIE_SD_USER_ID',
  armurerie_rhodes: 'PATRON_ARMURERIE_RHODES_USER_ID',
  armurerie_ab:     'PATRON_ARMURERIE_AB_USER_ID',
  ecurie_sd:        'PATRON_ECURIE_SD_USER_ID',
  ecurie_rhodes:    'PATRON_ECURIE_RHODES_USER_ID',
  ecurie_vh:        'PATRON_ECURIE_VH_USER_ID',
};

/**
 * shopId => owner userId (patron)
 * ⚠️ On lit bien les variables *_USER_ID (utilisateurs, pas rôles)
 */
const shopOwner = {
  armurerie_sd:     process.env.PATRON_ARMURERIE_SD_USER_ID || null,
  armurerie_rhodes: process.env.PATRON_ARMURERIE_RHODES_USER_ID || null,
  armurerie_ab:     process.env.PATRON_ARMURERIE_AB_USER_ID || null,
  ecurie_sd:        process.env.PATRON_ECURIE_SD_USER_ID || null,
  ecurie_rhodes:    process.env.PATRON_ECURIE_RHODES_USER_ID || null,
  ecurie_vh:        process.env.PATRON_ECURIE_VH_USER_ID || null,
};

/**
 * Ne renvoie qu’un shop correspondant au "kind" demandé.
 * kind peut être 'armurerie', 'ecurie' ou null (dans ce cas, n’importe quel shop matché).
 */
function getShopIdFromMember(member, kind = null){
  for (const entry of roleToShop) {
    if (!entry.roleId) continue;                 // role non configuré
    if (kind && entry.kind !== kind) continue;   // filtrage par type
    if (member.roles.cache.has(entry.roleId)) {
      return entry.shopId;
    }
  }
  return null;
}

function getOwnerId(shopId){ return shopOwner[shopId] || null; }
function getOwnerEnvVarName(shopId){ return shopToOwnerEnv[shopId] || 'PATRON_*_USER_ID'; }

// ----------------------- Stock -----------------------
function _stock(){ return loadJSON(FILE_STOCK, {}); }
function _saveStock(db){ saveJSON(FILE_STOCK, db); }

function ensureShopStock(shopId){
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

function incrementStock(shopId, category, itemName, qty=1){
  const db = _stock(); ensureShopStock(shopId);
  db[shopId][category][itemName] = (db[shopId][category][itemName] ?? 0) + qty;
  _saveStock(db);
}
function decrementStock(shopId, category, itemName, qty=1){
  const db = _stock(); ensureShopStock(shopId);
  const cur = db[shopId][category][itemName] ?? 0;
  if (cur < qty) throw new Error('Stock insuffisant');
  db[shopId][category][itemName] = cur - qty;
  if (db[shopId][category][itemName] <= 0) delete db[shopId][category][itemName];
  _saveStock(db);
}
function getShopStock(shopId){ ensureShopStock(shopId); return _stock()[shopId]; }

// ----------------------- Prix -----------------------
function _prices(){ return loadJSON(FILE_PRICES, {}); }
function _savePrices(db){ saveJSON(FILE_PRICES, db); }

function setPrice(shopId, category, itemName, price){
  const p = _prices();
  p[shopId] ||= {}; p[shopId][category] ||= {};
  p[shopId][category][itemName] = Number(price);
  _savePrices(p);
}
function getPrice(shopId, category, itemName){
  const p = _prices();
  return p?.[shopId]?.[category]?.[itemName] ?? null;
}
function getAllPrices(shopId){ return _prices()?.[shopId] || {}; }
function resetPrices(shopId){ const p = _prices(); delete p[shopId]; _savePrices(p); }

// ----------------------- Paiements -----------------------
/**
 * Débit sur le compte entreprise du patron:
 * d’abord banque, puis liquide.
 */
function debitOwnerEnterprise(shopId, amount){
  const ownerId = getOwnerId(shopId);
  if (!ownerId) return { ok:false, reason:'Aucun patron défini.' };
  const acc = getOrCreateAccount(ownerId);
  const cur = acc.entreprise || { liquide:0, banque:0 };
  const total = (cur.banque||0)+(cur.liquide||0);
  if (total < amount) return { ok:false, reason:'Fonds insuffisants (entreprise).' };

  let rest = amount;
  const before = { liquide: cur.liquide, banque: cur.banque };
  if (cur.banque >= rest) { cur.banque -= rest; rest = 0; }
  else { rest -= cur.banque; cur.banque = 0; cur.liquide = Math.max(0, cur.liquide - rest); rest = 0; }

  acc.entreprise = cur; updateAccount(ownerId, acc);
  return { ok:true, before, after:cur, ownerId };
}

function creditOwnerEnterpriseBank(shopId, amount){
  const ownerId = getOwnerId(shopId);
  if (!ownerId) return { ok:false, reason:'Aucun patron défini.' };
  const acc = getOrCreateAccount(ownerId);
  acc.entreprise ||= { liquide:0, banque:0 };
  acc.entreprise.banque = (acc.entreprise.banque||0) + amount;
  updateAccount(ownerId, acc);
  return { ok:true, ownerId };
}

module.exports = {
  // util
  CATS,
  getShopIdFromMember,
  getOwnerId,
  getOwnerEnvVarName,

  // stock
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
