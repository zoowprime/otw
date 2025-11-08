// src/data/shopsData.js
const { loadJSON, saveJSON } = require('./jsonUtil');
const { getOrCreateAccount, updateAccount } = require('../economyData');

// fichiers
const FILE_STOCK  = 'shops_stock.json';
const FILE_PRICES = 'shops_prices.json';

// catégories prises en charge
const CATS = ['armes','chevaux','charrettes','autres','minerais'];

// rôles => shopId (issus du .env)
const roleToShop = {
  [process.env.ARMURERIE_SD_ROLE]:     'armurerie_sd',
  [process.env.ARMURERIE_RHODES_ROLE]: 'armurerie_rhodes',
  [process.env.ARMURERIE_AB_ROLE]:     'armurerie_ab',
  [process.env.ECURIE_SD_ROLE]:        'ecurie_sd',
  [process.env.ECURIE_RHODES_ROLE]:    'ecurie_rhodes',
  [process.env.ECURIE_VH_ROLE]:        'ecurie_vh',
};

// ⚠️ IMPORTANT : les *noms* ci-dessous DOIVENT correspondre à ton .env
// (tu as bien mis ..._USER_ID avec cet underscore).
function _trimOrNull(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
}

// shopId => owner userId (patron) — LIT EXACTEMENT *_USER_ID du .env
const shopOwner = {
  armurerie_sd:     _trimOrNull(process.env.PATRON_ARMURERIE_SD_USER_ID),
  armurerie_rhodes: _trimOrNull(process.env.PATRON_ARMURERIE_RHODES_USER_ID),
  armurerie_ab:     _trimOrNull(process.env.PATRON_ARMURERIE_AB_USER_ID),
  ecurie_sd:        _trimOrNull(process.env.PATRON_ECURIE_SD_USER_ID),
  ecurie_rhodes:    _trimOrNull(process.env.PATRON_ECURIE_RHODES_USER_ID),
  ecurie_vh:        _trimOrNull(process.env.PATRON_ECURIE_VH_USER_ID),
};

// 🔎 Auto-diagnostic au chargement (console) pour vérifier ce que voit le bot
(function debugOwnersOnce(){
  try {
    // Ne loggue qu’une fois : utile quand on hot-reload
    if (global.__OTW_SHOPS_DEBUGGED__) return;
    global.__OTW_SHOPS_DEBUGGED__ = true;

    console.log('[shopsData] Mapping role->shop :');
    for (const [roleId, shopId] of Object.entries(roleToShop)) {
      if (!roleId) continue;
      console.log(`  role ${roleId} -> ${shopId}`);
    }

    console.log('[shopsData] Patrons (user ids) :');
    for (const [shopId, uid] of Object.entries(shopOwner)) {
      console.log(`  ${shopId} -> ${uid || '(absent)'}`);
    }

    // Aide explicite si manquant
    const neededVars = {
      armurerie_sd:     'PATRON_ARMURERIE_SD_USER_ID',
      armurerie_rhodes: 'PATRON_ARMURERIE_RHODES_USER_ID',
      armurerie_ab:     'PATRON_ARMURERIE_AB_USER_ID',
      ecurie_sd:        'PATRON_ECURIE_SD_USER_ID',
      ecurie_rhodes:    'PATRON_ECURIE_RHODES_USER_ID',
      ecurie_vh:        'PATRON_ECURIE_VH_USER_ID',
    };
    for (const [shopId, varName] of Object.entries(neededVars)) {
      if (!shopOwner[shopId]) {
        console.warn(`[shopsData] ⚠️ Aucun patron pour ${shopId}. Défini ${varName} dans ton .env`);
      }
    }
  } catch {}
})();

function getShopIdFromMember(member){
  for (const [roleId, shopId] of Object.entries(roleToShop)) {
    if (!roleId) continue;
    if (member.roles.cache.has(roleId)) return shopId;
  }
  return null;
}
function getOwnerId(shopId){ return shopOwner[shopId] || null; }

function _stock(){ return loadJSON(FILE_STOCK, {}); }
function _saveStock(db){ saveJSON(FILE_STOCK, db); }
function _prices(){ return loadJSON(FILE_PRICES, {}); }
function _savePrices(db){ saveJSON(FILE_PRICES, db); }

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

// PRIX
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

// Paiement (entreprise patron) : banque puis liquide
function debitOwnerEnterprise(shopId, amount){
  const ownerId = getOwnerId(shopId);
  if (!ownerId) return { ok:false, reason:`Aucun patron défini pour ${shopId}` };
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
  if (!ownerId) return { ok:false, reason:`Aucun patron défini pour ${shopId}` };
  const acc = getOrCreateAccount(ownerId);
  acc.entreprise ||= { liquide:0, banque:0 };
  acc.entreprise.banque = (acc.entreprise.banque||0) + amount;
  updateAccount(ownerId, acc);
  return { ok:true, ownerId };
}

module.exports = {
  getShopIdFromMember, getOwnerId,
  incrementStock, decrementStock, getShopStock,
  setPrice, getPrice, getAllPrices, resetPrices,
  debitOwnerEnterprise, creditOwnerEnterpriseBank,
  CATS
};
