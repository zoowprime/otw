// src/data/jsonUtil.js
// Utilitaire de lecture/écriture JSON persistant pour l’économie OTW

const fs = require('fs');
const path = require('path');

// Répertoire où les fichiers seront stockés
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');

// Vérifie que le dossier existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`📁 Dossier créé : ${DATA_DIR}`);
}

/**
 * Charge un fichier JSON. Retourne une valeur par défaut si le fichier n’existe pas.
 * @param {string} filename Nom du fichier
 * @param {any} defaultValue Valeur par défaut si le fichier est introuvable
 */
function loadJSON(filename, defaultValue = {}) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) return defaultValue;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`❌ Erreur lecture ${filename}:`, err);
    return defaultValue;
  }
}

/**
 * Sauvegarde un objet dans un fichier JSON (formaté et stable)
 * @param {string} filename Nom du fichier
 * @param {any} data Données à écrire
 */
function saveJSON(filename, data) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`❌ Erreur écriture ${filename}:`, err);
  }
}

module.exports = { loadJSON, saveJSON };
