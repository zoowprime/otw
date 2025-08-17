// src/interaction/trainStock.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '/data';
const FILE = path.join(DATA_DIR, 'trainStock.json');

function ensureDir() { try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {} }
ensureDir();

function load() {
  try {
    if (!fs.existsSync(FILE)) return { chevaux: {}, armes: {} };
    return JSON.parse(fs.readFileSync(FILE, 'utf8') || '{"chevaux":{},"armes":{}}');
  } catch { return { chevaux: {}, armes: {} }; }
}
function save(obj) { try { fs.writeFileSync(FILE, JSON.stringify(obj, null, 2), 'utf8'); } catch {} }

function addItem(cat, name, qty=1) {
  const s = load();
  s[cat] = s[cat] || {};
  s[cat][name] = (s[cat][name] ?? 0) + qty;
  save(s);
  return s;
}
function clearAll() {
  const s = { chevaux: {}, armes: {} };
  save(s);
  return s;
}
function getSummaryLines() {
  const s = load();
  const chev = Object.entries(s.chevaux).map(([k,v]) => `• ${k} x${v}`).join('\n') || '—';
  const arm  = Object.entries(s.armes).map(([k,v]) => `• ${k} x${v}`).join('\n') || '—';
  return { chev, arm, s };
}

module.exports = { load, save, addItem, clearAll, getSummaryLines };
