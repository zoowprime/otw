// src/data/agencyStore.js
// Stockage persistant des agences immobilières

const fs   = require('fs');
const path = require('path');

const DB_FILE = path.join('/data', 'agencies.json');

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

function normalizeAgency(raw, id) {
  const a = raw && typeof raw === 'object' ? { ...raw } : {};
  a.id          = a.id || id || `ag_${Math.random().toString(36).slice(2, 10)}`;
  a.name        = a.name || 'Agence sans nom';
  a.type        = a.type || 'Agence Immobilière';
  a.patronId    = a.patronId || null;
  a.agents      = Array.isArray(a.agents) ? a.agents : [];
  a.properties  = Array.isArray(a.properties) ? a.properties : [];
  a.soldCount   = typeof a.soldCount === 'number' ? a.soldCount : 0;
  a.rentedCount = typeof a.rentedCount === 'number' ? a.rentedCount : 0;
  return a;
}

function getAgency(id) {
  const db = loadDB();
  const raw = db[id];
  if (!raw) return null;
  const a = normalizeAgency(raw, id);
  if (db[id] !== a) {
    db[id] = a;
    saveDB(db);
  }
  return a;
}

function setAgency(agency) {
  const db = loadDB();
  const a = normalizeAgency(agency, agency.id);
  db[a.id] = a;
  saveDB(db);
  return a;
}

function listAgencies() {
  const db = loadDB();
  return Object.values(db).map((a) => normalizeAgency(a, a.id));
}

function createAgency(patronId, name) {
  const db = loadDB();
  const id = `ag_${Math.random().toString(36).slice(2, 10)}`;
  const agency = normalizeAgency({
    id,
    name,
    type: 'Agence Immobilière',
    patronId,
    agents: [],
    properties: [],
    soldCount: 0,
    rentedCount: 0,
  }, id);
  db[id] = agency;
  saveDB(db);
  return agency;
}

// Trouve l’agence dont l’utilisateur est patron ou agent
function getAgencyByUser(userId) {
  const all = listAgencies();
  return all.find(a => a.patronId === userId || a.agents.includes(userId)) || null;
}

module.exports = {
  getAgency,
  setAgency,
  listAgencies,
  createAgency,
  getAgencyByUser,
};
