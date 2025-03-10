const fs = require('fs');
const path = require('path');

// Utilisez la variable d'environnement DATA_DIR ou "C:\data" par défaut.
const dataDir = process.env.DATA_DIR || 'C:\\data';

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
 * S'assure que la structure du compte est complète et retourne le compte.
 */
function getOrCreateAccount(userId) {
  if (!bankData[userId]) {
    bankData[userId] = {
      courant: { liquide: 0, banque: 0 },
      entreprise: { liquide: 0, banque: 0 },
      epargne: 0
    };
    console.log(`Création d'un compte pour l'utilisateur ${userId}`);
  } else {
    // Vérifier et compléter la structure existante
    if (!bankData[userId].courant || typeof bankData[userId].courant.liquide !== 'number' || typeof bankData[userId].courant.banque !== 'number') {
      bankData[userId].courant = {
        liquide: (bankData[userId].courant && typeof bankData[userId].courant.liquide === 'number') ? bankData[userId].courant.liquide : 0,
        banque: (bankData[userId].courant && typeof bankData[userId].courant.banque === 'number') ? bankData[userId].courant.banque : 0
      };
    }
    if (!bankData[userId].entreprise || typeof bankData[userId].entreprise.liquide !== 'number' || typeof bankData[userId].entreprise.banque !== 'number') {
      bankData[userId].entreprise = {
        liquide: (bankData[userId].entreprise && typeof bankData[userId].entreprise.liquide === 'number') ? bankData[userId].entreprise.liquide : 0,
        banque: (bankData[userId].entreprise && typeof bankData[userId].entreprise.banque === 'number') ? bankData[userId].entreprise.banque : 0
      };
    }
    if (typeof bankData[userId].epargne !== 'number') {
      bankData[userId].epargne = 0;
    }
  }
  saveEconomyData(bankData);
  return bankData[userId];
}

function getAccount(userId) {
  return bankData[userId] || null;
}

function updateAccount(userId, account) {
  bankData[userId] = account;
  console.log(`Mise à jour du compte pour l'utilisateur ${userId}:`, account);
  saveEconomyData(bankData);
}

module.exports = { getOrCreateAccount, getAccount, updateAccount };
