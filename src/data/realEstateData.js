// src/data/realEstateData.js
// Persistance des agences immobilières + catalogue de l'État

const fs   = require('fs');
const path = require('path');

const DB_FILE = path.join('/data', 'real_estate.json');

// ─────────────────────────────────────────────
// Catalogue de l'État (propriétés disponibles)
// Chaque bien a un id "propre", un nom RP, une catégorie et un prix.

const PROPERTY_CATEGORIES = {
  MAISON: 'Maison',
  TERRAIN: 'Terrain',
  LOCAL: 'Local commercial',
  IMMEUBLE: 'Immeuble',
};

// Helper slug
function slugify(str) {
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const STATE_PROPERTIES_CATALOG = [
  // 🏠 Maisons
  { name: 'Bronx Manor', price: 15000, category: PROPERTY_CATEGORIES.MAISON },
  { name: 'Bellerive Manor', price: 20000, category: PROPERTY_CATEGORIES.MAISON },
  { name: 'Maison Ouest de Saint-Denis - Bayou', price: 3000, category: PROPERTY_CATEGORIES.MAISON },
  { name: 'Winchester Manor', price: 10000, category: PROPERTY_CATEGORIES.MAISON },
  { name: 'Vieille maison dans le Bayou', price: 350, category: PROPERTY_CATEGORIES.MAISON },
  { name: 'Roulotte de voyageur - nord de Rhodes', price: 350, category: PROPERTY_CATEGORIES.MAISON },
  { name: 'Maison sud de Rhodes', price: 950, category: PROPERTY_CATEGORIES.MAISON },
  { name: 'Local - Sud de Saint-Denis', price: 850, category: PROPERTY_CATEGORIES.MAISON },
  { name: 'Cabane de pêche - Bayou', price: 400, category: PROPERTY_CATEGORIES.MAISON },
  { name: 'Petit bateau - Lemoyne', price: 600, category: PROPERTY_CATEGORIES.MAISON },
  { name: 'Cabane du bayou', price: 350, category: PROPERTY_CATEGORIES.MAISON },
  { name: 'Cabane artistique du Bayou', price: 500, category: PROPERTY_CATEGORIES.MAISON },
  { name: 'Maison du bayou', price: 950, category: PROPERTY_CATEGORIES.MAISON },

  // 🌾 Terrains
  { name: "Ferme Ouest d'Emerald Ranch - New Hanover", price: 1500, category: PROPERTY_CATEGORIES.TERRAIN },
  { name: 'Maison d’Hermite dans New Hanover', price: 350, category: PROPERTY_CATEGORIES.TERRAIN },
  { name: 'Grande ferme Ouest de Valentine', price: 3000, category: PROPERTY_CATEGORIES.TERRAIN },
  { name: 'Vieille ferme Cumberland Forest', price: 750, category: PROPERTY_CATEGORIES.TERRAIN },
  { name: 'Ferme Southfield Flats - Lemoyne', price: 1000, category: PROPERTY_CATEGORIES.TERRAIN },
  { name: 'Hill Haven Ranch - Lemoyne', price: 4500, category: PROPERTY_CATEGORIES.TERRAIN },
  { name: 'Ferme Van Horn', price: 1000, category: PROPERTY_CATEGORIES.TERRAIN },
  { name: 'Emerald Ranch', price: 8000, category: PROPERTY_CATEGORIES.TERRAIN },

  // 🏚 Locaux commerciaux
  { name: 'Armurerie – Saint-Denis', price: 6500, category: PROPERTY_CATEGORIES.LOCAL },
  { name: 'Cabinet de médecin – Saint-Denis', price: 5000, category: PROPERTY_CATEGORIES.LOCAL },
  { name: 'Écurie – Saint-Denis', price: 9000, category: PROPERTY_CATEGORIES.LOCAL },
  { name: 'Opéra de Saint-Denis', price: 25000, category: PROPERTY_CATEGORIES.LOCAL },
  { name: 'Banque Winchester – Saint-Denis', price: 18000, category: PROPERTY_CATEGORIES.LOCAL },
  { name: 'Bastille Saloon – Saint-Denis', price: 7500, category: PROPERTY_CATEGORIES.LOCAL },
  { name: 'Ales Wines Cigars Saloon – Saint-Denis', price: 6000, category: PROPERTY_CATEGORIES.LOCAL },
  { name: 'Banque de Rhodes', price: 8500, category: PROPERTY_CATEGORIES.LOCAL },
  { name: 'Écurie (Lemoyne) – Rhodes', price: 4000, category: PROPERTY_CATEGORIES.LOCAL },
  { name: 'Armurerie de Rhodes', price: 2000, category: PROPERTY_CATEGORIES.LOCAL },
  { name: 'Saloon de Rhodes', price: 2500, category: PROPERTY_CATEGORIES.LOCAL },
  { name: 'Saints Hotel – Valentine', price: 3750, category: PROPERTY_CATEGORIES.LOCAL },
  { name: 'Saloon de Valentine', price: 3500, category: PROPERTY_CATEGORIES.LOCAL },
  { name: 'Le Bar de Valentine', price: 2000, category: PROPERTY_CATEGORIES.LOCAL },
  { name: 'Écurie de Valentine', price: 3750, category: PROPERTY_CATEGORIES.LOCAL },
  { name: 'Cabinet de médecin – Valentine', price: 2500, category: PROPERTY_CATEGORIES.LOCAL },
  { name: 'Écurie de Van Horn', price: 1100, category: PROPERTY_CATEGORIES.LOCAL },
  { name: 'Saloon Van Horn', price: 900, category: PROPERTY_CATEGORIES.LOCAL },
  { name: 'Ancienne distillerie inexploitable – Bayou', price: 850, category: PROPERTY_CATEGORIES.LOCAL },

  // 🏢 Immeubles
  { name: 'Mines d’Annesburg', price: 35000, category: PROPERTY_CATEGORIES.IMMEUBLE },
  { name: 'Sites d’exploitation pétrolière de Belleshore', price: 30000, category: PROPERTY_CATEGORIES.IMMEUBLE },
  { name: 'Usines sud-est de Saint-Denis', price: 15000, category: PROPERTY_CATEGORIES.IMMEUBLE },
  { name: 'Scierie de Saint-Denis', price: 10500, category: PROPERTY_CATEGORIES.IMMEUBLE },
  { name: 'Usine agroalimentaire de Saint-Denis', price: 12000, category: PROPERTY_CATEGORIES.IMMEUBLE },
  { name: 'Usines de production ferroviaire de Saint-Denis', price: 22000, category: PROPERTY_CATEGORIES.IMMEUBLE },
  { name: 'Usines agroalimentaires de Rhodes', price: 6500, category: PROPERTY_CATEGORIES.IMMEUBLE },
  { name: 'Docks de Saint-Denis (Import/Export)', price: 20000, category: PROPERTY_CATEGORIES.IMMEUBLE },
  { name: 'Quai ferroviaire Saint-Denis', price: 7000, category: PROPERTY_CATEGORIES.IMMEUBLE },
  { name: 'Quai ferroviaire Emerald Ranch', price: 4500, category: PROPERTY_CATEGORIES.IMMEUBLE },
  { name: 'Quai ferroviaire Rhodes', price: 3500, category: PROPERTY_CATEGORIES.IMMEUBLE },
  { name: 'Quai ferroviaire Valentine', price: 3000, category: PROPERTY_CATEGORIES.IMMEUBLE },
  { name: 'Quai ferroviaire Van Horn', price: 2000, category: PROPERTY_CATEGORIES.IMMEUBLE },
].map((p) => ({ ...p, id: slugify(p.name) }));

// ─────────────────────────────────────────────
// I/O

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      const initial = { agencies: {}, properties: {} };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8') || '{}';
    const db  = JSON.parse(raw);

    db.agencies   = db.agencies   || {};
    db.properties = db.properties || {};

    // Initialiser les propriétés de l'État manquantes
    for (const prop of STATE_PROPERTIES_CATALOG) {
      if (!db.properties[prop.id]) {
        db.properties[prop.id] = {
          id: prop.id,
          name: prop.name,
          category: prop.category,
          basePrice: prop.price,
          ownerAgencyId: null, // null = encore à l'État
          status: 'etat',      // etat | agence_catalogue | en_vente | en_location | vendu | loue | saisie
          currentPriceSale: null,
          currentPriceRent: null,
          history: [],
        };
      }
    }

    return db;
  } catch (e) {
    console.error('Erreur loadDB real_estate:', e);
    return { agencies: {}, properties: {} };
  }
}

function saveDB(db) {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error('Erreur saveDB real_estate:', e);
  }
}

// ─────────────────────────────────────────────
// Helpers agences

function newAgencyId() {
  return 'AG_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e5).toString(36);
}

function createAgency({ name, ownerId }) {
  const db = loadDB();

  // Un owner ne peut avoir qu'une agence pour l'instant
  const already = Object.values(db.agencies).find(a => a.ownerId === ownerId);
  if (already) {
    return { ok: false, reason: 'OWNER_ALREADY_HAS_AGENCY', agency: already };
  }

  const id = newAgencyId();
  const agency = {
    id,
    name,
    type: 'Agence Immobilière',
    ownerId,
    agents: [],
    catalogProperties: [], // array d'id de propriétés
    soldCount: 0,
    rentedCount: 0,
  };

  db.agencies[id] = agency;
  saveDB(db);
  return { ok: true, agency };
}

function getAgencyById(id) {
  const db = loadDB();
  return db.agencies[id] || null;
}

function getAgencyByOwner(ownerId) {
  const db = loadDB();
  return Object.values(db.agencies).find(a => a.ownerId === ownerId) || null;
}

function getAgencyForUser(userId) {
  const db = loadDB();
  return Object.values(db.agencies).find(a =>
    a.ownerId === userId || a.agents.includes(userId)
  ) || null;
}

function listAgencies() {
  const db = loadDB();
  return Object.values(db.agencies);
}

function addAgent(agencyId, userId, maxAgents = 3) {
  const db = loadDB();
  const agency = db.agencies[agencyId];
  if (!agency) return { ok: false, reason: 'AGENCY_NOT_FOUND' };

  if (agency.ownerId === userId) {
    return { ok: false, reason: 'IS_OWNER' };
  }
  if (agency.agents.includes(userId)) {
    return { ok: false, reason: 'ALREADY_AGENT' };
  }
  if (agency.agents.length >= maxAgents) {
    return { ok: false, reason: 'MAX_AGENTS' };
  }

  agency.agents.push(userId);
  saveDB(db);
  return { ok: true, agency };
}

function removeAgent(agencyId, userId) {
  const db = loadDB();
  const agency = db.agencies[agencyId];
  if (!agency) return { ok: false, reason: 'AGENCY_NOT_FOUND' };

  const idx = agency.agents.indexOf(userId);
  if (idx === -1) return { ok: false, reason: 'NOT_AGENT' };

  agency.agents.splice(idx, 1);
  saveDB(db);
  return { ok: true, agency };
}

// ─────────────────────────────────────────────
// Propriétés

function listStatePropertiesByCategory(category) {
  const db = loadDB();
  return Object.values(db.properties).filter(
    p => p.category === category && p.ownerAgencyId === null
  );
}

function getPropertyById(id) {
  const db = loadDB();
  return db.properties[id] || null;
}

function assignPropertyToAgency(propertyId, agencyId) {
  const db = loadDB();
  const prop   = db.properties[propertyId];
  const agency = db.agencies[agencyId];

  if (!prop)   return { ok: false, reason: 'PROPERTY_NOT_FOUND' };
  if (!agency) return { ok: false, reason: 'AGENCY_NOT_FOUND' };
  if (prop.ownerAgencyId && prop.ownerAgencyId !== agencyId) {
    return { ok: false, reason: 'ALREADY_OWNED' };
  }

  prop.ownerAgencyId = agencyId;
  prop.status = 'agence_catalogue';

  if (!agency.catalogProperties.includes(propertyId)) {
    agency.catalogProperties.push(propertyId);
  }

  prop.history.push({
    type: 'ACQUISITION_AGENCE',
    agencyId,
    at: Date.now(),
    price: prop.basePrice,
  });

  saveDB(db);
  return { ok: true, property: prop, agency };
}

function listAgencyProperties(agencyId) {
  const db = loadDB();
  const agency = db.agencies[agencyId];
  if (!agency) return [];
  return agency.catalogProperties
    .map(id => db.properties[id])
    .filter(Boolean);
}

function summarizeAgencyCatalog(agencyId) {
  const props = listAgencyProperties(agencyId);
  let vente = 0, location = 0, vendus = 0, loues = 0;
  for (const p of props) {
    if (p.status === 'en_vente') vente++;
    else if (p.status === 'en_location') location++;
    else if (p.status === 'vendu') vendus++;
    else if (p.status === 'loue') loues++;
  }
  return { vente, location, vendus, loues, total: props.length };
}

// ─────────────────────────────────────────────

module.exports = {
  PROPERTY_CATEGORIES,
  STATE_PROPERTIES_CATALOG,

  loadDB,
  saveDB,

  // agences
  createAgency,
  getAgencyById,
  getAgencyByOwner,
  getAgencyForUser,
  listAgencies,
  addAgent,
  removeAgent,
  summarizeAgencyCatalog,

  // properties
  listStatePropertiesByCategory,
  getPropertyById,
  assignPropertyToAgency,
  listAgencyProperties,
};
