// src/levelData.js
const fs = require('fs');
const path = require('path');

// Utilisez la variable d'environnement DATA_DIR ou "/data" par défaut
const dataDir = process.env.DATA_DIR || '/data';

// Vérifier que le dossier existe, sinon le créer
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

// Chemin complet vers le fichier des données de niveau
const levelDataPath = path.join(dataDir, 'levelsData.json');

/**
 * Charge les données de niveau depuis le fichier JSON.
 */
function loadLevelData() {
  if (fs.existsSync(levelDataPath)) {
    try {
      const rawData = fs.readFileSync(levelDataPath, 'utf8');
      console.log(`Fichier ${levelDataPath} lu avec succès.`);
      return JSON.parse(rawData);
    } catch (err) {
      console.error("Erreur de lecture/parsing du fichier levelsData.json :", err);
      return {};
    }
  }
  console.log("Le fichier levelsData.json n'existe pas. Création d'un nouvel objet.");
  return {};
}

/**
 * Sauvegarde les données de niveau dans le fichier JSON.
 */
function saveLevelData(data) {
  try {
    fs.writeFileSync(levelDataPath, JSON.stringify(data, null, 2), 'utf8');
    console.log("Données de niveau sauvegardées dans", levelDataPath);
  } catch (err) {
    console.error("Erreur lors de la sauvegarde de levelsData.json :", err);
  }
}

module.exports = { loadLevelData, saveLevelData };
