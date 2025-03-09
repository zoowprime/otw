// src/economyData.js
const fs = require('fs');
const path = require('path');

// Utilisez la variable d'environnement DATA_DIR, sinon utilisez "/data" par défaut.
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

// Charger les données en mémoire
const bankData = loadEconomyData();

/**
 * Crée un compte par défaut pour l'utilisateur s'il n'existe pas déjà.
 */
function getOrCreateAccount(userId) {
  if (!bankData[userId]) {
    bankData[userId] = {
      courant: 0,
      epargne: 0,
      investissement: 0,
    };
    console.log(`Création d'un compte pour l'utilisateur ${userId}`);
    saveEconomyData(bankData);
  }
  return bankData[userId];
}

/**
 * Récupère le compte d'un utilisateur sans rien créer.
 * Renvoie null si aucun compte n'existe.
 */
function getAccount(userId) {
  return bankData[userId] || null;
}

/**
 * Met à jour un compte d’utilisateur et sauvegarde sur disque.
 */
function updateAccount(userId, account) {
  bankData[userId] = account;
  console.log(`Mise à jour du compte pour l'utilisateur ${userId}:`, account);
  saveEconomyData(bankData);
}

// Export des fonctions nécessaires
module.exports = { getOrCreateAccount, getAccount, updateAccount };
