// src/data/entreprisesData.js
const fs = require('fs');
const path = require('path');

// === Économie : on PROXY la banque entreprise vers le compte du patron ===
const { getOrCreateAccount, updateAccount } = require('../economyData');

const DATA_DIR = '/data';
const FILE = path.join(DATA_DIR, 'entreprises.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------------------------- Utils JSON -----------------------------
function load() {
  try {
    if (!fs.existsSync(FILE)) return { enterprises: {} };
    const raw = fs.readFileSync(FILE, 'utf8');
    const json = JSON.parse(raw || '{}');
    if (!json.enterprises) json.enterprises = {};
    return json;
  } catch {
    return { enterprises: {} };
  }
}
function save(db) {
  try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2), 'utf8'); } catch {}
}
function ensure() {
  const db = load();
  save(db);
  return db;
}

function normalizeType(t) {
  return (String(t || '').toLowerCase() === 'armurerie') ? 'armurerie' : 'ecurie';
}

// ------------------------- Entreprises CRUD --------------------------
function createEnterprise(ownerId, name, type) {
  const db = ensure();
  if (db.enterprises[ownerId]) throw new Error('ALREADY_EXISTS');
  const kind = normalizeType(type);

  db.enterprises[ownerId] = {
    ownerId,
    name,
    type: kind,                 // 'armurerie' | 'ecurie'
    employees: [],
    // bank: 0,                  // ⛔ obsolète : banque gérée par economyData
    revenues: 0,                // cumul ventes (tracking)
    prices: {},                 // { itemId: price }
    stock: kind === 'armurerie'
      ? { weapons: {} }         // { id: qty }
      : { horses: {}, carts: {} }, // { id: qty } / { id: qty }
    createdAt: Date.now(),
  };
  save(db);

  // S’assurer que le compte du patron a bien le sous-compte "entreprise"
  const acc = getOrCreateAccount(ownerId);
  acc.courant ||= {};
  acc.courant.entreprise = Number(acc.courant.entreprise || 0);
  updateAccount(ownerId, acc);

  return db.enterprises[ownerId];
}

function deleteEnterprise(ownerId) {
  const db = ensure();
  delete db.enterprises[ownerId];
  save(db);
}

function getEnterpriseByOwner(ownerId) {
  const db = ensure();
  return db.enterprises[ownerId] || null;
}
function getEnterpriseByMember(userId) {
  const db = ensure();
  for (const e of Object.values(db.enterprises)) {
    if (e.ownerId === userId) return e;
    if (e.employees?.includes(userId)) return e;
  }
  return null;
}

function isOwner(e, userId)  { return e?.ownerId === userId; }
function isMember(e, userId) { return e?.ownerId === userId || e?.employees?.includes(userId); }

function addEmployee(ownerId, userId) {
  const db = ensure();
  const e = db.enterprises[ownerId];
  if (!e) throw new Error('NOT_FOUND');
  if (e.employees.length >= 4) throw new Error('MAX_EMP');
  if (e.employees.includes(userId)) throw new Error('ALREADY_EMP');
  e.employees.push(userId);
  save(db);
  return e;
}
function removeEmployee(ownerId, userId) {
  const db = ensure();
  const e = db.enterprises[ownerId];
  if (!e) throw new Error('NOT_FOUND');
  e.employees = e.employees.filter(id => id !== userId);
  save(db);
  return e;
}

// -------------------- Banque entreprise (via economy) ----------------
function getBank(ownerId) {
  const acc = getOrCreateAccount(ownerId);
  const val = Number(acc?.courant?.entreprise || 0);
  // normalisation décimales
  return Math.round(val * 100) / 100;
}
function setBank(ownerId, newAmount) {
  const acc = getOrCreateAccount(ownerId);
  acc.courant ||= {};
  acc.courant.entreprise = Math.max(0, Math.round(Number(newAmount || 0) * 100) / 100);
  updateAccount(ownerId, acc);
  return acc.courant.entreprise;
}
function incBank(ownerId, amount) {
  const cur = getBank(ownerId);
  return setBank(ownerId, cur + Number(amount || 0));
}
function decBank(ownerId, amount) {
  const cur = getBank(ownerId);
  const a = Math.round(Number(amount || 0) * 100) / 100;
  if (cur < a) throw new Error('NO_FUNDS');
  return setBank(ownerId, cur - a);
}

// ----------------------------- Revenus -------------------------------
function addRevenue(ownerId, amount) {
  const db = ensure();
  const e = db.enterprises[ownerId]; if (!e) throw new Error('NOT_FOUND');
  e.revenues = Math.round(((e.revenues || 0) + Number(amount || 0)) * 100) / 100;
  save(db); 
  return e.revenues;
}

// ------------------------------- Stock -------------------------------
function addStock(ownerId, itemId, qty, bucket = null) {
  const db = ensure();
  const e = db.enterprises[ownerId]; if (!e) throw new Error('NOT_FOUND');

  const q = Math.max(0, Number(qty || 0));
  if (e.type === 'armurerie') {
    const b = e.stock.weapons;
    b[itemId] = (b[itemId] || 0) + q;
  } else {
    if (bucket === 'horses') {
      e.stock.horses[itemId] = (e.stock.horses[itemId] || 0) + q;
    } else {
      e.stock.carts[itemId] = (e.stock.carts[itemId] || 0) + q;
    }
  }
  save(db);
}
function decStock(ownerId, itemId, qty, bucket = null) {
  const db = ensure();
  const e = db.enterprises[ownerId]; if (!e) throw new Error('NOT_FOUND');
  const q = Math.max(0, Number(qty || 0));

  if (e.type === 'armurerie') {
    const b = e.stock.weapons;
    if ((b[itemId] || 0) < q) throw new Error('NO_STOCK');
    b[itemId] -= q; if (b[itemId] <= 0) delete b[itemId];
  } else {
    const box = bucket === 'horses' ? e.stock.horses : e.stock.carts;
    if ((box[itemId] || 0) < q) throw new Error('NO_STOCK');
    box[itemId] -= q; if (box[itemId] <= 0) delete box[itemId];
  }
  save(db);
}

// ------------------------------ Prix --------------------------------
function setPrice(ownerId, itemId, price) {
  const db = ensure();
  const e = db.enterprises[ownerId]; if (!e) throw new Error('NOT_FOUND');
  e.prices[itemId] = Math.max(0, Math.round(Number(price || 0) * 100) / 100);
  save(db);
}
function getPrice(ownerId, itemId) {
  const e = getEnterpriseByOwner(ownerId);
  return e?.prices?.[itemId] ?? null;
}

// -------------------- Fournisseurs (prix d’achat) --------------------
// IDs = ceux utilisés par catalogWeapons.js / catalogHorses.js
const SUPPLIER_WEAPONS = {
  revolver_cattleman: 18,
  revolver_navy: 18.50,
  revolver_double_action: 19,
  revolver_schofield: 20.50,
  revolver_lemat: 25.25,
  pistolet_volcanic: 26.50,
  carabine_litchfield: 30,
  carabine_evans: 32.25,
  carabine_lancaster: 28,
  carabine_repetition: 23,
  fusil_a_petit_gibier: 15,
  fusil_springfield: 35,
  fusil_verrou: 35.50,
  couteau_de_lancer: 3,
  lasso: 2,
  arc: 9,
  arc_ameliorer: 14,
  couteau: 3,
  cisaille: 3.50,
  couteau_de_chasse: 5,
  marteau: 6,
  hachette: 8,
  hache: 10,
  machette: 12,
};

// Chevaux / Charrettes — IDs synchronisés avec catalogHorses.js
const SUPPLIER_HORSES = {
  american_paint_tobiano: 45,
  american_paint_overo: 45,
  american_paint_balzane: 50,
  american_paint_overo_gris: 60,

  appaloosa_cape_leopard: 45,
  appaloosa_capee: 45,
  appaloosa_leopard: 60,
  appaloosa_leopard_brun: 60,

  hollandais_sang_chaud_isabelle_sooty: 90,
  hollandais_sang_chaud_noir_pangare: 90,
  hollandais_sang_chaud_rouan_chocolat: 100,

  ardennais_bai_rouanne: 65,
  ardennais_rouan_fraise: 65,

  andalou_bai_brun: 70,
  andalou_alezan_grisonnant: 70,
  andalou_perlino: 70,

  demi_sang_hongrois_alezan_crins_laves: 60,
  demi_sang_hongrois_pie_tobiano: 60,

  mustang_bai_sauvage: 25,
  mustang_grullo: 25,
  mustang_bai_tigre: 30,
  mustang_isabelle: 105,
  mustang_tovero_alezan: 105,
  mustang_overo_alezan_dun: 110,
  mustang_overo_noir: 115,

  polyvalent_pinto_pommele_silver: 225,
  polyvalent_champagne_ambre: 225,
  polyvalent_tovero_noir: 300,
  polyvalent_gris_pommele: 350,
  polyvalent_isabelle_brinje: 350,
  polyvalent_noir_rouanne: 350,

  breton_oseille: 35,
  breton_rubican: 35,
  breton_grullo: 105,
  breton_pangare: 105,
  breton_bai_pommele_pangare: 350,
  breton_gris_fer: 350,

  turkoman_bai_brun: 300,
  turkoman_argente: 350,
  turkoman_dore: 350,
  turkoman_alzane: 400,
  turkoman_gris: 400,
  turkoman_noir: 430,
  turkoman_perlino: 400,

  criollo_dun: 25,
  criollo_noir_rouanne: 25,
  criollo_bai_brinje: 105,
  criollo_overo_oseille: 105,
  criollo_frame_overo: 350,
  criollo_sabino_marmore: 350,

  cob_gypsy_kentucky: 40,
  cob_gypsy_morgan: 40,
  cob_gypsy_tennessee_walker: 30,

  trait_belge: 70,
  trait_shire: 70,
  trait_suffolk_punch: 65,
  trait_pie: 30,
  trait_blagdon_blanc: 30,
  trait_skewbald: 105,
  trait_blagdon_palomino: 105,
  trait_bai_balzan: 350,
  trait_pie_balzan: 350,

  course_noir_rouanne: 100,
  course_rouan_blanc: 100,
  course_rouan_pommele_inverse: 100,

  pur_sang_bai_acajou: 135,
  pur_sang_bringee: 135,
  pur_sang_gris_pommele: 135,

  trotteur_americain_isabelle: 135,
  trotteur_americain_noir: 135,
  trotteur_americain_palomino_pommele: 135,
  trotteur_americain_isabelle_queue_argentee: 135,
  trotteur_americain_gris_pommele_fonce: 85,

  pur_sang_arabe_noir: 480,
  pur_sang_arabe_blanc: 450,
  pur_sang_arabe_rouge: 400,
};

const SUPPLIER_CARTS = {
  charrette_prime: 480,
  charrette_commerce: 270,
};

// ---------------------------------------------------------------------
module.exports = {
  load, save,
  createEnterprise, deleteEnterprise,
  getEnterpriseByOwner, getEnterpriseByMember,
  isOwner, isMember,
  addEmployee, removeEmployee,

  // banque (proxy economy)
  getBank, setBank, incBank, decBank,

  addRevenue,
  addStock, decStock,
  setPrice, getPrice,

  SUPPLIER_WEAPONS, SUPPLIER_HORSES, SUPPLIER_CARTS,
};
