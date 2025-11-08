// src/data/illegalData.js
const { loadJSON, saveJSON } = require('./jsonUtil');
const { getOrCreateAccount, updateAccount } = require('../economyData');

const FILE_STOCK = 'illegal_stock.json';
const FILE_PRICES = 'illegal_prices.json';

// Default structure : shop tied to ILLEGAL_CONTACT_ROLE_ID (one shop)
function _stock(){ return loadJSON(FILE_STOCK, {}); }
function _saveStock(db){ saveJSON(FILE_STOCK, db); }
function _prices(){ return loadJSON(FILE_PRICES, {}); }
function _savePrices(db){ saveJSON(FILE_PRICES, db); }

const ILLEGAL_ROLE = process.env.ILLEGAL_CONTACT_ROLE_ID || 'ILLEGAL_CONTACT_ROLE_ID';

// Ensure structure exists
function ensureIllegalStock(){
  const db = _stock();
  if (!db[ILLEGAL_ROLE]) db[ILLEGAL_ROLE] = { armes: {}, autres: {} };
  db[ILLEGAL_ROLE].armes ||= {};
  db[ILLEGAL_ROLE].autres ||= {};
  _saveStock(db);
  return db[ILLEGAL_ROLE];
}

function incrementIllegalStock(category, itemName, qty=1){
  const db = _stock();
  ensureIllegalStock();
  db[ILLEGAL_ROLE][category] = db[ILLEGAL_ROLE][category] || {};
  db[ILLEGAL_ROLE][category][itemName] = (db[ILLEGAL_ROLE][category][itemName] ?? 0) + qty;
  _saveStock(db);
}
function decrementIllegalStock(category, itemName, qty=1){
  const db = _stock();
  ensureIllegalStock();
  const cur = db[ILLEGAL_ROLE][category][itemName] ?? 0;
  if (cur < qty) throw new Error('Stock insuffisant');
  db[ILLEGAL_ROLE][category][itemName] = cur - qty;
  if (db[ILLEGAL_ROLE][category][itemName] <= 0) delete db[ILLEGAL_ROLE][category][itemName];
  _saveStock(db);
}
function getIllegalStock(){
  ensureIllegalStock();
  return _stock()[ILLEGAL_ROLE];
}

// Prices
function setIllegalPrice(category, itemName, price){
  const p = _prices();
  p[ILLEGAL_ROLE] ||= { armes:{}, autres:{} };
  p[ILLEGAL_ROLE][category] ||= {};
  p[ILLEGAL_ROLE][category][itemName] = Number(price);
  _savePrices(p);
}
function getIllegalPrice(category, itemName){
  const p = _prices();
  return p?.[ILLEGAL_ROLE]?.[category]?.[itemName] ?? null;
}
function getAllIllegalPrices(){ return _prices()?.[ILLEGAL_ROLE] || { armes:{}, autres:{} }; }
function resetIllegalPrices(){ const p = _prices(); delete p[ILLEGAL_ROLE]; _savePrices(p); }

// Payment helper (débit depuis courant.banque uniquement)
function debitUserCourantBank(userId, amount){
  const acc = getOrCreateAccount(userId);
  acc.courant ||= { liquide:0, banque:0 };
  if ((acc.courant.banque||0) < amount) return { ok:false, reason: 'Fonds banque insuffisants' };
  acc.courant.banque -= amount;
  updateAccount(userId, acc);
  return { ok:true, before: acc.courant };
}

// Credit revenue: credit to ILLEGAL_SHOP_OWNER_ID if set, else to first gerant env var
function _getIllegalReceiverId(){
  const envOwner = process.env.ILLEGAL_SHOP_OWNER_ID;
  if (envOwner) return envOwner;
  // try gerant list
  for (let i=1;i<=4;i++){
    const v = process.env[`ILLEGAL_GERANT_USER_ID_${i}`];
    if (v) return v;
  }
  return null;
}
function creditIllegalBank(amount){
  const ownerId = _getIllegalReceiverId();
  if (!ownerId) return { ok:false, reason:'Aucun receveur défini' };
  const acc = getOrCreateAccount(ownerId);
  acc.entreprise ||= { liquide:0, banque:0 };
  acc.entreprise.banque = (acc.entreprise.banque||0) + amount;
  updateAccount(ownerId, acc);
  return { ok:true, ownerId };
}

module.exports = {
  ILLEGAL_ROLE,
  ensureIllegalStock, incrementIllegalStock, decrementIllegalStock, getIllegalStock,
  setIllegalPrice, getIllegalPrice, getAllIllegalPrices, resetIllegalPrices,
  debitUserCourantBank, creditIllegalBank
};
