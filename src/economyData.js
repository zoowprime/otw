// src/economyData.js
const fs = require('fs');
const path = require('path');

// Vérifier que le dossier C:\data existe, sinon le créer
const dataDir = 'C:\\data';
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Dossier ${dataDir} créé avec succès.`);
  } catch (err) {
    console.error(`Erreur lors de la création du dossier ${dataDir} :`, err);
  }
}

// Chemin complet vers le fichier
const dataPath = path.join(dataDir, 'economyData.json');

/**
 * Charge les données depuis le fichier JSON.
 * Retourne un objet vide si le fichier n'existe pas ou en cas d'erreur de parsing.
 */
function loadEconomyData() {
  if (fs.existsSync(dataPath)) {
    try {
      const rawData = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(rawData);
    } catch (err) {
      console.error("Erreur de lecture ou de parsing de economyData.json :", err);
      return {};
    }
  }
  return {};
}

/**
 * Sauvegarde les données dans le fichier JSON.
 * @param {object} data - L'objet à sauvegarder.
 */
function saveEconomyData(data) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Erreur lors de la sauvegarde de economyData.json :", err);
  }
}

// Charger les données existantes (ou un objet vide si le fichier n'existe pas)
const bankData = loadEconomyData();

/**
 * Retourne le compte pour un userId donné,
 * le crée si nécessaire.
 * @param {string} userId - L'identifiant de l'utilisateur.
 */
function getOrCreateAccount(userId) {
  if (!bankData[userId]) {
    bankData[userId] = {
      epargne: 0,
      courant: 0,
      investissement: 0,
    };
    saveEconomyData(bankData);
  }
  return bankData[userId];
}

/**
 * Met à jour le compte d'un utilisateur et sauvegarde les données.
 * @param {string} userId - L'identifiant de l'utilisateur.
 * @param {object} account - L'objet représentant le compte (epargne, courant, investissement).
 */
function updateAccount(userId, account) {
  bankData[userId] = account;
  saveEconomyData(bankData);
}

module.exports = { getOrCreateAccount, updateAccount };
