// src/interaction/trainStock.js
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/trainStock.json');

function loadTrainStock() {
  if (!fs.existsSync(filePath)) return { chevaux: {}, armes: {} };
  return JSON.parse(fs.readFileSync(filePath));
}

function saveTrainStock(stock) {
  fs.writeFileSync(filePath, JSON.stringify(stock, null, 2));
}

function addItem(category, name, qty = 1) {
  const stock = loadTrainStock();
  if (!stock[category][name]) stock[category][name] = 0;
  stock[category][name] += qty;
  saveTrainStock(stock);
  return stock;
}

function clearStock() {
  const stock = { chevaux: {}, armes: {} };
  saveTrainStock(stock);
  return stock;
}

module.exports = { loadTrainStock, addItem, clearStock };
