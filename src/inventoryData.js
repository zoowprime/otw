// src/inventoryData.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '/data';
const INV_FILE = path.join(DATA_DIR, 'inventory.json');

function ensureDir() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}
ensureDir();

function loadJSON(p, fallback = {}) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8') || JSON.stringify(fallback));
  } catch { return fallback; }
}
function saveJSON(p, obj) {
  try { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); } catch {}
}

function blankInventory() {
  // Tu peux activer l’affichage Agricole plus tard si tu veux les sections visibles
  return {
    armes: [],        // { name, quantity }
    chevaux: [],
    charrettes: [],
    minerais: [],
    autres: [],
    agricole_brut: [],
    agricole_transforme: [],
  };
}

function loadAll() { return loadJSON(INV_FILE, {}); }
function saveAll(db) { saveJSON(INV_FILE, db); }

function getOrCreateInventory(userId) {
  const db = loadAll();
  if (!db[userId]) db[userId] = blankInventory();
  saveAll(db);
  return db[userId];
}
function setInventory(userId, inv) {
  const db = loadAll();
  db[userId] = inv;
  saveAll(db);
}

function _ensure(inv) {
  const def = blankInventory();
  for (const k of Object.keys(def)) {
    if (!Array.isArray(inv[k])) inv[k] = [];
  }
  return inv;
}

function findItemIndex(list, name) {
  return list.findIndex(it => (it?.name || '').toLowerCase() === name.toLowerCase());
}
function addItem(userId, category, name, qty = 1) {
  const db = loadAll();
  const inv = _ensure(db[userId] || blankInventory());
  const list = inv[category] || [];
  let idx = findItemIndex(list, name);
  if (idx === -1) { list.push({ name, quantity: qty }); }
  else { list[idx].quantity = Math.max(0, (list[idx].quantity || 0) + qty); }
  inv[category] = list.filter(x => (x.quantity || 0) > 0);
  db[userId] = inv; saveAll(db);
  return inv;
}
function removeItem(userId, category, name, qty = 1) {
  const db = loadAll();
  const inv = _ensure(db[userId] || blankInventory());
  const list = inv[category] || [];
  const idx = findItemIndex(list, name);
  if (idx === -1) return { ok: false, reason: 'not_found', inv };
  const cur = list[idx].quantity || 0;
  if (cur < qty) return { ok: false, reason: 'insufficient', inv, have: cur };
  list[idx].quantity = cur - qty;
  inv[category] = list.filter(x => (x.quantity || 0) > 0);
  db[userId] = inv; saveAll(db);
  return { ok: true, inv };
}

/** ———————— Catégorisation (vendeurs/farm brancheront ici) ———————— */
const WEAPONS = new Set([
  // Ajoute tous tes libellés d’armes ici
  'Revolver Cattleman','Revolver double action','Revolver Schofield','Revolver navy','Revolver LeMat','Pistolet volcanic',
  'Carabine à répétition','Carabine Lancaster','Carabine Evans Rifle','Carabine Litchfield Rifle',
  'Fusil Springfield','Fusil à verrou','Fusil à petit gibier',
  'Arc','Arc amélioré','Couteau de lancer','Lasso',
  'Couteau','Couteau de chasse','Couteau en os','Cisaille','Hache','Hachette','Machette','Marteau'
]);
const CARTS = new Set(['Chasseur de prime','Charette de commerce']);
const HORSE_PREFIXES = [
  'American Paint','Appaloosa','Hollandais à Sang Chaud','Chevaux de Guerre — Ardennais',
  'Chevaux de Guerre — Andalou','Demi-Sang Hongrois','Mustang','Chevaux Polyvalents',
  'Breton','Turkoman','Criollo','Cob Gypsy Pie','Chevaux de Trait',
  'Chevaux de Course','Pur-Sang','Trotteur Américain','Pur-Sang Arabe'
];
const MINERALS = new Set(['Fer','Cuivre','Or','Charbon','Étain','Zinc']); // élargis si besoin
const AGRI_BRUT = new Set(['Canne à sucre','Riz','Tabac','Maïs','Coton','Blé']);
const AGRI_REF  = new Set(['Sucre','Riz raffiné','Tabac séché','Maïs raffiné','Coton traité','Farine']);

function categorizeItem(name) {
  if (WEAPONS.has(name)) return 'armes';
  if (CARTS.has(name) || /charr?ette/i.test(name)) return 'charrettes';
  if (HORSE_PREFIXES.some(p => name.startsWith(p)) || /cheval|jument|étalon/i.test(name)) return 'chevaux';
  if (MINERALS.has(name)) return 'minerais';
  if (AGRI_BRUT.has(name)) return 'agricole_brut';
  if (AGRI_REF.has(name)) return 'agricole_transforme';
  return 'autres';
}

/** Checker “Sacoche” (à utiliser côté métiers/farm) */
function hasBag(userId) {
  const inv = getOrCreateInventory(userId);
  const idx = findItemIndex(inv.autres, 'Sacoche');
  return idx !== -1 && (inv.autres[idx].quantity || 0) > 0;
}

module.exports = {
  getOrCreateInventory, setInventory,
  addItem, removeItem,
  categorizeItem, hasBag,
};
