// src/economyData.js
const fs = require('fs');
const path = require('path');

// Utilisez la variable d'environnement DATA_DIR, sinon "C:\data" par défaut.
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

// Chemin complet vers le fichier de données
const dataPath = path.join(dataDir, 'economyData.json');

function loadEconomyData() {
  if (fs.existsSync(dataPath)) {
    try {
      const rawData = fs.readFileSync(dataPath, 'utf8');
      console.log(`Fichier ${dataPath} lu avec succès.`);
      return JSON.parse(rawData);
    } catch (err) {
      console.error("Erreur de lecture ou de parsing de economyData.json :", err);
      return {};
    }
  }
  console.log(`Fichier ${dataPath} n'existe pas. Un nouvel objet sera créé.`);
  return {};
}

function saveEconomyData(data) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Données sauvegardées dans ${dataPath}`);
  } catch (err) {
    console.error("Erreur lors de la sauvegarde de economyData.json :", err);
  }
}

const bankData = loadEconomyData();

/**
 * Retourne le compte de l'utilisateur. S'il n'existe pas ou est incomplet,
 * la structure est créée ou complétée.
 */
function getOrCreateAccount(userId) {
  if (!bankData[userId]) {
    bankData[userId] = {
      courant: { liquide: 0, banque: 0 },
      entreprise: { liquide: 0, banque: 0 },
      epargne: 0
    };
    console.log(`Création d'un compte pour l'utilisateur ${userId}`);
    saveEconomyData(bankData);
  } else {
    // Mise à jour de la structure existante si nécessaire
    if (!bankData[userId].courant) {
      bankData[userId].courant = { liquide: 0, banque: 0 };
    } else {
      if (typeof bankData[userId].courant.liquide !== 'number') {
        bankData[userId].courant.liquide = 0;
      }
      if (typeof bankData[userId].courant.banque !== 'number') {
        bankData[userId].courant.banque = 0;
      }
    }
    if (!bankData[userId].entreprise) {
      bankData[userId].entreprise = { liquide: 0, banque: 0 };
    } else {
      if (typeof bankData[userId].entreprise.liquide !== 'number') {
        bankData[userId].entreprise.liquide = 0;
      }
      if (typeof bankData[userId].entreprise.banque !== 'number') {
        bankData[userId].entreprise.banque = 0;
      }
    }
    if (typeof bankData[userId].epargne !== 'number') {
      bankData[userId].epargne = 0;
    }
    saveEconomyData(bankData);
  }
  return bankData[userId];
}

/**
 * Retourne le compte de l'utilisateur s'il existe, sinon null.
 */
function getAccount(userId) {
  return bankData[userId] || null;
}

/**
 * Met à jour le compte de l'utilisateur et sauvegarde les données.
 */
function updateAccount(userId, account) {
  bankData[userId] = account;
  console.log(`Mise à jour du compte pour l'utilisateur ${userId}:`, account);
  saveEconomyData(bankData);
}

module.exports = { getOrCreateAccount, getAccount, updateAccount };
