// src/data/shopsData.js
// Gestion des stocks, prix et comptes entreprises (armureries / écuries)

const { loadJSON, saveJSON } = require('./jsonUtil');
const { getOrCreateAccount, updateAccount } = require('../economyData');

const FILE_STOCK = 'shops_stock.json';
const FILE_PRICES = 'shops_prices.json';

const roleToShop = {
  [process.env.ARMURERIE_SD_ROLE]: 'armurerie_sd',
  [process.env.ARMURERIE_RHODES_ROLE]: 'armurerie_rhodes',
  [process.env.ARMURERIE_AB_ROLE]: 'armurerie_ab',
  [process.env.ECURIE_SD_ROLE]: 'ecurie_sd',
  [process.env.ECURIE_RHODES_ROLE]: 'ecurie_rhodes',
  [process.env.ECURIE_VH_ROLE]: 'ecurie_vh',
};

const shopOwner = {
  armurerie_sd: process.env.PATRON_ARMURERIE_SD_USER_ID,
  armurerie_rhodes: process.env.PATRON_ARMURERIE_RHODES_USER_ID,
  armurerie_ab: process.env.PATRON_ARMURERIE_AB_USER_ID,
  ecurie_sd: process.env.PATRON_ECURIE_SD_USER_ID,
  ecurie_rhodes: process.env.PATRON_ECURIE_RHODES_USER_ID,
  ecurie_vh: process.env.PATRON_ECURIE_VH_USER_ID,
};

function getShopIdFromMember(member) {
  for (const [roleId, shopId] of Object.entries(roleToShop)) {
    if (roleId && member.roles.cache.has(roleId)) return shopId;
  }
  return null;
}

function getOwnerId(shopId) {
  return shopOwner[shopId] || null;
}

function _stock() {
  return loadJSON(FILE_STOCK, {});
}
function _saveStock(db) {
  saveJSON(FILE_STOCK, db);
}

function ensureShopStock(shopId) {
  const db = _stock();
  if (!db[shopId]) db[shopId] = { armes: {}, chevaux: {}, charrettes: {} };
  _saveStock(db);
  return db[shopId];
}

function incrementStock(shopId, category, item, qty = 1) {
  const db = _stock();
  ensureShopStock(shopId);
  db[shopId][category][item] = (db[shopId][category][item] || 0) + qty;
  _saveStock(db);
}

function debitOwnerEnterprise(shopId, amount) {
  const ownerId = getOwnerId(shopId);
  if (!ownerId) return { ok: false, reason: 'Aucun patron défini' };
  const acc = getOrCreateAccount(ownerId);
  const ent = acc.entreprise || { liquide: 0, banque: 0 };
  const total = ent.banque + ent.liquide;
  if (total < amount) return { ok: false, reason: 'Fonds insuffisants' };

  let reste = amount;
  if (ent.banque >= reste) ent.banque -= reste;
  else {
    reste -= ent.banque;
    ent.banque = 0;
    ent.liquide -= reste;
  }

  acc.entreprise = ent;
  updateAccount(ownerId, acc);
  return { ok: true };
}

module.exports = { getShopIdFromMember, incrementStock, debitOwnerEnterprise };
