// src/data/propertyStore.js
// Gestion des propriétés + stockage (coffres) + loyers + clés

const fs   = require('fs');
const path = require('path');
const catalog = require('./itemCatalog');

const DB_FILE = path.join('/data', 'properties.json');

// ──────────────────────────────────────────────
// I/O JSON

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2), 'utf8');
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function saveDB(db) {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch {}
}

// ──────────────────────────────────────────────
// Helpers poids

const DEFAULT_STORAGE_MAX = 120.0;

function getItemWeight(itemId) {
  const meta = catalog[itemId];
  if (!meta) return 0;
  return typeof meta.weight === 'number' ? meta.weight : 0;
}

function storageTotalWeight(storage = {}) {
  const items = Array.isArray(storage.items) ? storage.items : [];
  return items.reduce((sum, it) => {
    const id  = it.id || it.name;
    const qty = typeof it.quantity === 'number' ? it.quantity : 1;
    return sum + getItemWeight(id) * qty;
  }, 0);
}

// ──────────────────────────────────────────────
// Normalisation propriété

function ensureProperty(raw, id) {
  const p = raw && typeof raw === 'object' ? { ...raw } : {};

  p.id          = p.id || id || `prop_${Math.random().toString(36).slice(2, 10)}`;
  p.name        = p.name || 'Propriété sans nom';
  p.type        = p.type || 'MAISON'; // MAISON / TERRAIN / LOCAL / IMMEUBLE
  p.location    = p.location || '';

  // statut : AGENCE_ONLY / OWNED / RENTED / SEIZED etc.
  p.status      = p.status || 'AGENCE_ONLY';

  // liens logiques
  p.ownerPlayerId = p.ownerPlayerId || null; // achat définitif
  p.landlordId    = p.landlordId || null;    // agence / proprio qui loue
  p.tenantId      = p.tenantId || null;      // locataire
  p.agencyId      = p.agencyId || null;      // agence qui gère le bien (catalogue)

  // prix / loyers
  p.salePrice     = typeof p.salePrice === 'number' ? p.salePrice : null;
  p.basePrice     = typeof p.basePrice === 'number' ? p.basePrice : null;
  p.rentAmount    = typeof p.rentAmount === 'number' ? p.rentAmount : null;
  p.rentEveryDays = typeof p.rentEveryDays === 'number' ? p.rentEveryDays : 7;
  p.nextRentTs    = typeof p.nextRentTs === 'number' ? p.nextRentTs : null;

  // clés / stockage
  p.keyholders    = Array.isArray(p.keyholders) ? p.keyholders : [];

  p.storage       = p.storage && typeof p.storage === 'object' ? { ...p.storage } : {};
  p.storage.items     = Array.isArray(p.storage.items) ? p.storage.items : [];
  p.storage.weightMax = typeof p.storage.weightMax === 'number' ? p.storage.weightMax : DEFAULT_STORAGE_MAX;
  // argent liquide dans le coffre
  p.storage.cash      = typeof p.storage.cash === 'number' ? p.storage.cash : 0;

  return p;
}

function getProperty(id) {
  const db = loadDB();
  const raw = db[id];
  if (!raw) return null;
  const p = ensureProperty(raw, id);
  if (db[id] !== p) {
    db[id] = p;
    saveDB(db);
  }
  return p;
}

function setProperty(prop) {
  const db = loadDB();
  const p = ensureProperty(prop, prop.id);
  db[p.id] = p;
  saveDB(db);
  return p;
}

function getAllProperties() {
  const db = loadDB();
  return Object.values(db).map((p) => ensureProperty(p, p.id));
}

// ──────────────────────────────────────────────
// Propriétés par joueur / accès

function listPropertiesForUser(userId) {
  const all = getAllProperties();
  return all.filter((p) => {
    if (p.ownerPlayerId === userId) return true;
    if (p.tenantId === userId) return true;
    if (Array.isArray(p.keyholders) && p.keyholders.includes(userId)) return true;
    return false;
  });
}

function userHasAccessToProperty(userId, prop) {
  if (!prop) return false;
  if (prop.ownerPlayerId === userId) return true;
  if (prop.tenantId === userId) return true;
  if (Array.isArray(prop.keyholders) && prop.keyholders.includes(userId)) return true;
  return false;
}

// ──────────────────────────────────────────────
// Clés

function addKeyholder(propertyId, userId) {
  const db = loadDB();
  const raw = db[propertyId];
  if (!raw) return { ok: false, reason: 'NOT_FOUND' };
  const p = ensureProperty(raw, propertyId);
  if (!p.keyholders.includes(userId)) p.keyholders.push(userId);
  db[propertyId] = p;
  saveDB(db);
  return { ok: true, property: p };
}

function removeKeyholder(propertyId, userId) {
  const db = loadDB();
  const raw = db[propertyId];
  if (!raw) return { ok: false, reason: 'NOT_FOUND' };
  const p = ensureProperty(raw, propertyId);
  p.keyholders = p.keyholders.filter((id) => id !== userId);
  db[propertyId] = p;
  saveDB(db);
  return { ok: true, property: p };
}

// ──────────────────────────────────────────────
// Stockage : checks & mutations

function canStoreItem(propertyId, itemId, qty = 1) {
  const db = loadDB();
  const raw = db[propertyId];
  if (!raw) return { ok: false, reason: 'PROP_NOT_FOUND' };
  const p = ensureProperty(raw, propertyId);

  const q = Math.max(1, Number(qty) || 1);
  const curWeight = storageTotalWeight(p.storage);
  const addWeight = getItemWeight(itemId) * q;

  if ((curWeight + addWeight) > p.storage.weightMax) {
    return {
      ok: false,
      reason: 'OVERWEIGHT',
      current: curWeight,
      add: addWeight,
      max: p.storage.weightMax,
    };
  }
  return { ok: true, property: p };
}

function addItemToProperty(propertyId, itemId, qty = 1) {
  const db = loadDB();
  const raw = db[propertyId];
  if (!raw) return { ok: false, reason: 'PROP_NOT_FOUND' };
  const p = ensureProperty(raw, propertyId);

  const q = Math.max(1, Number(qty) || 1);
  const check = canStoreItem(propertyId, itemId, q);
  if (!check.ok && check.reason === 'OVERWEIGHT') return check;

  const items = p.storage.items;
  const idx = items.findIndex((it) => (it.id || it.name) === itemId);
  if (idx >= 0) {
    const cur = items[idx];
    const curQty = typeof cur.quantity === 'number' ? cur.quantity : 0;
    items[idx] = { ...cur, name: itemId, quantity: curQty + q };
  } else {
    items.push({ name: itemId, quantity: q });
  }

  db[propertyId] = p;
  saveDB(db);
  return { ok: true, property: p };
}

function removeItemFromProperty(propertyId, itemId, qty = 1) {
  const db = loadDB();
  const raw = db[propertyId];
  if (!raw) return { ok: false, reason: 'PROP_NOT_FOUND' };
  const p = ensureProperty(raw, propertyId);

  const q = Math.max(1, Number(qty) || 1);
  const items = p.storage.items;
  const idx = items.findIndex((it) => (it.id || it.name) === itemId);
  if (idx < 0) return { ok: false, reason: 'ITEM_NOT_FOUND' };

  const cur = items[idx];
  const curQty = typeof cur.quantity === 'number' ? cur.quantity : 0;
  if (curQty < q) return { ok: false, reason: 'NOT_ENOUGH' };

  const newQty = curQty - q;
  if (newQty <= 0) items.splice(idx, 1);
  else items[idx] = { ...cur, name: itemId, quantity: newQty };

  db[propertyId] = p;
  saveDB(db);
  return { ok: true, property: p };
}

// Remise à zéro stockage (expulsion / saisie)
function wipeStorage(propertyId) {
  const db = loadDB();
  const raw = db[propertyId];
  if (!raw) return { ok: false, reason: 'PROP_NOT_FOUND' };
  const p = ensureProperty(raw, propertyId);

  p.storage.items = [];
  p.storage.cash  = 0;

  db[propertyId] = p;
  saveDB(db);
  return { ok: true, property: p };
}

// Remise au catalogue de l’État (libération complète)
function resetPropertyToState(propertyId) {
  const db = loadDB();
  const raw = db[propertyId];
  if (!raw) return { ok: false, reason: 'PROP_NOT_FOUND' };
  const p = ensureProperty(raw, propertyId);

  p.ownerPlayerId = null;
  p.tenantId      = null;
  p.landlordId    = null;
  p.agencyId      = null;

  p.status        = 'AGENCE_ONLY';
  p.salePrice     = null;
  p.rentAmount    = null;
  p.nextRentTs    = null;

  p.keyholders    = [];
  p.storage.items = [];
  p.storage.cash  = 0;

  db[propertyId] = p;
  saveDB(db);
  return { ok: true, property: p };
}

// ──────────────────────────────────────────────
// Loyers

function markRentPaid(propertyId, fromTs, days) {
  const db = loadDB();
  const raw = db[propertyId];
  if (!raw) return { ok: false, reason: 'PROP_NOT_FOUND' };
  const p = ensureProperty(raw, propertyId);

  const base = typeof fromTs === 'number' ? fromTs : Date.now();
  const d    = typeof days === 'number' ? days : (p.rentEveryDays || 7);
  const next = base + d * 24 * 60 * 60 * 1000;

  p.nextRentTs = next;
  db[propertyId] = p;
  saveDB(db);
  return { ok: true, property: p };
}

// ──────────────────────────────────────────────
// Exports

module.exports = {
  getProperty,
  setProperty,
  getAllProperties,
  listPropertiesForUser,
  userHasAccessToProperty,

  addKeyholder,
  removeKeyholder,

  storageTotalWeight,
  canStoreItem,
  addItemToProperty,
  removeItemFromProperty,
  wipeStorage,
  resetPropertyToState,

  markRentPaid,
};
