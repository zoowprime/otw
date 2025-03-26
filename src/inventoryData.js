// src/inventoryData.js
const fs = require('fs');
const path = require('path');

const dataDir = process.env.DATA_DIR || '/data';
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Dossier ${dataDir} créé avec succès.`);
  } catch (err) {
    console.error(`Erreur lors de la création du dossier ${dataDir} :`, err);
  }
} else {
  console.log(`Le dossier ${dataDir} existe déjà.`);
}

const dataPath = path.join(dataDir, 'inventoryData.json');

function loadInventoryData() {
  if (fs.existsSync(dataPath)) {
    try {
      const rawData = fs.readFileSync(dataPath, 'utf8');
      console.log(`Fichier ${dataPath} lu avec succès.`);
      return JSON.parse(rawData);
    } catch (err) {
      console.error("Erreur de lecture/parsing de inventoryData.json :", err);
      return {};
    }
  }
  console.log(`Le fichier ${dataPath} n'existe pas. Un nouvel objet sera créé.`);
  return {};
}

function saveInventoryData(data) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Données sauvegardées dans ${dataPath}`);
  } catch (err) {
    console.error("Erreur lors de la sauvegarde de inventoryData.json :", err);
  }
}

const invData = loadInventoryData();

function getOrCreateInventory(userId) {
  if (!invData[userId]) {
    invData[userId] = {
      cheval: {},
      arme: {},
      accessoire: {}
    };
    saveInventoryData(invData);
  }
  return invData[userId];
}

function updateInventory(userId, inventory) {
  invData[userId] = inventory;
  saveInventoryData(invData);
}

function getInventory(userId) {
  return invData[userId] || null;
}

module.exports = { getOrCreateInventory, updateInventory, getInventory };
