// src/economyData.js
const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, 'economyData.json');

// Charger les données depuis le fichier, ou initialiser un objet vide
function loadEconomyData() {
  if (fs.existsSync(dataPath)) {
    try {
      const rawData = fs.readFileSync(dataPath);
      return JSON.parse(rawData);
    } catch (err) {
      console.error("Erreur de lecture/parsing de economyData.json :", err);
      return {};
    }
  }
  return {};
}

// Sauvegarder les données dans le fichier
function saveEconomyData(data) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Erreur lors de la sauvegarde de economyData.json :", err);
  }
}

const bankData = loadEconomyData();

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

function updateAccount(userId, account) {
  bankData[userId] = account;
  saveEconomyData(bankData);
}

module.exports = { getOrCreateAccount, updateAccount };
