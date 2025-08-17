// src/agri/agriStorage.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '/data';
const FILE_SESSIONS = path.join(DATA_DIR, 'harvest_sessions.json');
const FILE_MSGS     = path.join(DATA_DIR, 'agri_stock_msg.json');
const FILE_DELIV    = path.join(DATA_DIR, 'deliveries.json');

function ensureDir() { try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {} }
ensureDir();

function stockFileForField(fieldKey) {
  return path.join(DATA_DIR, `stock_${fieldKey}.json`);
}

function loadJSON(p, fallback = {}) { try { return JSON.parse(fs.readFileSync(p, 'utf8') || JSON.stringify(fallback)); } catch { return fallback; } }
function saveJSON(p, obj) { try { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); } catch {} }

// STOCK per field
function loadStock(fieldKey) {
  const p = stockFileForField(fieldKey);
  const s = loadJSON(p, {});
  if (!s.raw) s.raw = { 'Maïs': 0, 'Coton': 0, 'Blé': 0 };
  if (!s.refined) s.refined = { 'Maïs': 0, 'Coton': 0, 'Blé': 0 };
  return s;
}
function saveStock(fieldKey, stock) {
  const p = stockFileForField(fieldKey);
  saveJSON(p, stock);
}

// LIVE stock messages map
function loadStockMsgMap() { return loadJSON(FILE_MSGS, {}); }
function saveStockMsgMap(map) { saveJSON(FILE_MSGS, map); }

// Sessions harvesting/transform per guild+field+user
function loadSessions() { return loadJSON(FILE_SESSIONS, {}); }
function saveSessions(s) { saveJSON(FILE_SESSIONS, s); }

// Deliveries
function loadDeliveries() { return loadJSON(FILE_DELIV, {}); }
function saveDeliveries(d) { saveJSON(FILE_DELIV, d); }

module.exports = {
  loadStock, saveStock,
  loadStockMsgMap, saveStockMsgMap,
  loadSessions, saveSessions,
  loadDeliveries, saveDeliveries,
};
