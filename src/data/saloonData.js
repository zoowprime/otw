// src/data/saloonData.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/data';
const FILE = path.join(DATA_DIR, 'saloons.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function load() {
  try {
    if (!fs.existsSync(FILE)) return { saloons: {} };
    const raw = fs.readFileSync(FILE, 'utf8');
    const json = JSON.parse(raw || '{}');
    if (!json.saloons) json.saloons = {};
    return json;
  } catch {
    return { saloons: {} };
  }
}

function save(db) {
  try {
    fs.writeFileSync(FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch {
    // ignore
  }
}

function ensure() {
  const db = load();
  save(db);
  return db;
}

// ─────────────────────────────────────────────────────────────
// CRUD saloon

function createSaloon(ownerId, name) {
  const db = ensure();
  if (db.saloons[ownerId]) throw new Error('ALREADY_EXISTS');

  db.saloons[ownerId] = {
    ownerId,
    name,
    type: 'saloon',
    employees: [],
    revenues: 0,
    prices: {},           // { businessItemId: salePrice }
    stock: {
      drinks: {},         // { businessItemId: qty }
      foods: {},          // { businessItemId: qty }
    },
    createdAt: Date.now(),
  };

  save(db);
  return db.saloons[ownerId];
}

function deleteSaloon(ownerId) {
  const db = ensure();
  delete db.saloons[ownerId];
  save(db);
}

function getSaloonByOwner(ownerId) {
  const db = ensure();
  return db.saloons[ownerId] || null;
}

function getSaloonByMember(userId) {
  const db = ensure();
  for (const s of Object.values(db.saloons)) {
    if (s.ownerId === userId) return s;
    if (s.employees?.includes(userId)) return s;
  }
  return null;
}

function isOwner(saloon, userId) {
  return saloon?.ownerId === userId;
}

function isMember(saloon, userId) {
  return saloon?.ownerId === userId || saloon?.employees?.includes(userId);
}

// ─────────────────────────────────────────────────────────────
// Employés

function addEmployee(ownerId, userId) {
  const db = ensure();
  const s = db.saloons[ownerId];
  if (!s) throw new Error('NOT_FOUND');
  if (s.employees.includes(userId)) throw new Error('ALREADY_EMP');
  if (s.employees.length >= 3) throw new Error('MAX_EMP');
  s.employees.push(userId);
  save(db);
  return s;
}

function removeEmployee(ownerId, userId) {
  const db = ensure();
  const s = db.saloons[ownerId];
  if (!s) throw new Error('NOT_FOUND');
  s.employees = s.employees.filter(id => id !== userId);
  save(db);
  return s;
}

// ─────────────────────────────────────────────────────────────
// Banque / revenus (les fonds eux-mêmes sont gérés dans economyData,
// ici on ne stocke que le cumul des revenus)

function addRevenue(ownerId, amount) {
  const db = ensure();
  const s = db.saloons[ownerId];
  if (!s) throw new Error('NOT_FOUND');
  s.revenues = (s.revenues || 0) + Number(amount || 0);
  save(db);
  return s.revenues;
}

// ─────────────────────────────────────────────────────────────
// Stock

function addStock(ownerId, businessItemId, qty, bucket) {
  const db = ensure();
  const s = db.saloons[ownerId];
  if (!s) throw new Error('NOT_FOUND');

  const box = bucket === 'foods' ? s.stock.foods : s.stock.drinks;
  box[businessItemId] = (box[businessItemId] || 0) + qty;
  save(db);
}

function decStock(ownerId, businessItemId, qty, bucket) {
  const db = ensure();
  const s = db.saloons[ownerId];
  if (!s) throw new Error('NOT_FOUND');

  const box = bucket === 'foods' ? s.stock.foods : s.stock.drinks;
  if ((box[businessItemId] || 0) < qty) throw new Error('NO_STOCK');
  box[businessItemId] -= qty;
  if (box[businessItemId] <= 0) delete box[businessItemId];
  save(db);
}

// ─────────────────────────────────────────────────────────────
// Prix de vente

function setPrice(ownerId, businessItemId, price) {
  const db = ensure();
  const s = db.saloons[ownerId];
  if (!s) throw new Error('NOT_FOUND');
  s.prices[businessItemId] = Number(price || 0);
  save(db);
}

function getPrice(ownerId, businessItemId) {
  const s = getSaloonByOwner(ownerId);
  return s?.prices?.[businessItemId] || null;
}

// ─────────────────────────────────────────────────────────────
// Catalogue fournisseur saloon
// businessItemId -> { label, importPrice, baseItemId, category }

const SUPPLIER_DRINKS = {
  whiskey_rye: {
    label: 'Whiskey Rye',
    importPrice: 4.50,
    baseItemId: 'alcool_bouteille',
    category: 'drinks',
  },
  bourbon: {
    label: 'Bourbon',
    importPrice: 7.00,
    baseItemId: 'alcool_bouteille',
    category: 'drinks',
  },
  lager_allemande: {
    label: 'Lager Allemande',
    importPrice: 1.20,
    baseItemId: 'alcool_bouteille',
    category: 'drinks',
  },
  vin_californien: {
    label: 'Vin Californien',
    importPrice: 2.00,
    baseItemId: 'alcool_bouteille',
    category: 'drinks',
  },
  champagne_importe: {
    label: 'Champagne Importé',
    importPrice: 8.00,
    baseItemId: 'alcool_bouteille',
    category: 'drinks',
  },
  absinthe: {
    label: 'Absinthe',
    importPrice: 4.00,
    baseItemId: 'alcool_bouteille',
    category: 'drinks',
  },
};

const SUPPLIER_FOODS = {
  jerky: {
    label: 'Jerky',
    importPrice: 0.50,
    baseItemId: 'conserve_nourriture',
    category: 'foods',
  },
  beans_bowl: {
    label: 'Beans Bowl',
    importPrice: 0.80,
    baseItemId: 'conserve_nourriture',
    category: 'foods',
  },
  biscuits_gravy: {
    label: 'Biscuits & Gravy',
    importPrice: 2.00,
    baseItemId: 'conserve_nourriture',
    category: 'foods',
  },
  sardines_conserve: {
    label: 'Sardines en conserve',
    importPrice: 1.00,
    baseItemId: 'conserve_nourriture',
    category: 'foods',
  },
  rabbit_stew_cup: {
    label: 'Rabbit Stew Cup',
    importPrice: 4.00,
    baseItemId: 'conserve_nourriture',
    category: 'foods',
  },
};

module.exports = {
  load,
  save,
  createSaloon,
  deleteSaloon,
  getSaloonByOwner,
  getSaloonByMember,
  isOwner,
  isMember,
  addEmployee,
  removeEmployee,
  addRevenue,
  addStock,
  decStock,
  setPrice,
  getPrice,
  SUPPLIER_DRINKS,
  SUPPLIER_FOODS,
};
