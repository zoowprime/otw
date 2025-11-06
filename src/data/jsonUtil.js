// src/data/jsonUtil.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '/data';
function ensureDir() { try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {} }
ensureDir();

function file(p) { return path.join(DATA_DIR, p); }

function loadJSON(relPath, fallback = {}) {
  const p = file(relPath);
  try {
    if (!fs.existsSync(p)) return fallback;
    const txt = fs.readFileSync(p, 'utf8');
    return txt ? JSON.parse(txt) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(relPath, obj) {
  const p = file(relPath);
  try {
    fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
  } catch {}
}

module.exports = { DATA_DIR, loadJSON, saveJSON, file };
