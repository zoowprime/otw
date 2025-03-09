// src/recensementData.js
const fs = require('fs');
const path = require('path');

// Utilisez DATA_DIR défini dans l'environnement, sinon un chemin par défaut (exemple sous Windows)
const dataDir = process.env.DATA_DIR || 'C:\\data';

// Créer le dossier s'il n'existe pas
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Dossier ${dataDir} créé avec succès.`);
} else {
  console.log(`Le dossier ${dataDir} existe déjà.`);
}

const dataPath = path.join(dataDir, 'recensements.json');

function loadRecensements() {
  if (fs.existsSync(dataPath)) {
    try {
      const rawData = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(rawData);
    } catch (err) {
      console.error("Erreur de lecture ou de parsing de recensements.json :", err);
      return {};
    }
  }
  console.log(`Fichier ${dataPath} n'existe pas. Un nouvel objet sera créé.`);
  return {};
}

function saveRecensements(data) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Erreur lors de la sauvegarde de recensements.json :", err);
  }
}

const recensements = loadRecensements();

function setRecensement(userId, recensement) {
  recensements[userId] = recensement;
  saveRecensements(recensements);
}

function getRecensement(userId) {
  return recensements[userId] || null;
}

function deleteRecensement(userId) {
  if (recensements[userId]) {
    delete recensements[userId];
    saveRecensements(recensements);
    return true;
  }
  return false;
}

module.exports = { setRecensement, getRecensement, deleteRecensement };
