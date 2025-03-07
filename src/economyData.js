// src/economyData.js
const fs = require('fs');
const path = require('path');

// Utiliser le chemin absolu pour le dossier data sur votre disque C:
const dataPath = path.join('C:\\data', 'economyData.json');

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

function saveEconomyData(data) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
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
