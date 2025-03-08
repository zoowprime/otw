// src/economyData.js
const fs = require('fs');
const path = require('path');

// Définir le dossier de stockage sur votre disque C:
const dataDir = 'C:\\data';

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

// Fonction pour charger les données depuis le fichier JSON
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
  } else {
    console.log(`Fichier ${dataPath} n'existe pas. Un nouvel objet sera créé.`);
    return {};
  }
}

// Fonction pour sauvegarder les données dans le fichier JSON
function saveEconomyData(data) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Données sauvegardées dans ${dataPath}`);
  } catch (err) {
    console.error("Erreur lors de la sauvegarde de economyData.json :", err);
  }
}

const bankData = loadEconomyData();

// Fonction pour obtenir ou créer un compte pour un utilisateur
function getOrCreateAccount(userId) {
  if (!bankData[userId]) {
    bankData[userId] = {
      epargne: 0,
      courant: 0,
      investissement: 0,
    };
    console.log(`Création d'un compte pour l'utilisateur ${userId}`);
    saveEconomyData(bankData);
  }
  return bankData[userId];
}

// Fonction pour mettre à jour un compte et sauvegarder les données
function updateAccount(userId, account) {
  bankData[userId] = account;
  console.log(`Mise à jour du compte pour l'utilisateur ${userId}:`, account);
  saveEconomyData(bankData);
}

module.exports = { getOrCreateAccount, updateAccount };
