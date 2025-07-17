// src/data/habitationData.js
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../data/habitationData.json');

let data = {};
// Charge ou initialise
try {
  if (fs.existsSync(filePath)) {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
} catch (err) {
  console.error('Erreur lecture habitationData:', err);
}

function save() {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getHabitation(userId) {
  if (!data[userId]) {
    data[userId] = { argent: 0, items: {} };
    save();
  }
  return data[userId];
}

function updateHabitation(userId, habitation) {
  data[userId] = habitation;
  save();
}

module.exports = { getHabitation, updateHabitation };
