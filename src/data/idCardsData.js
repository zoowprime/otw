// src/data/idCardsData.js
const fs   = require('fs');
const path = require('path');

const DATA_DIR   = '/data';
const CARDS_DIR  = path.join(DATA_DIR, 'idcards');
const FILE_PATH  = path.join(DATA_DIR, 'idcards.json');

if (!fs.existsSync(DATA_DIR))  fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(CARDS_DIR)) fs.mkdirSync(CARDS_DIR, { recursive: true });

function load() {
  try {
    if (!fs.existsSync(FILE_PATH)) return { cards: {} };
    const raw  = fs.readFileSync(FILE_PATH, 'utf8');
    const json = JSON.parse(raw || '{}');
    if (!json.cards) json.cards = {};
    return json;
  } catch {
    return { cards: {} };
  }
}

function save(db) {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Erreur sauvegarde idcards.json:', err);
  }
}

function getCard(userId) {
  const db = load();
  return db.cards[userId] || null;
}

function setCard(userId, data) {
  const db = load();
  db.cards[userId] = {
    userId,
    lastUpdated: Date.now(),
    nom: data.nom || '',
    prenom: data.prenom || '',
    birthDate: data.birthDate || '',
    size: data.size || '',
    address: data.address || '',
    photoPath: data.photoPath || null,
  };
  save(db);
  return db.cards[userId];
}

function deleteCard(userId) {
  const db = load();
  const card = db.cards[userId];
  if (card?.photoPath && fs.existsSync(card.photoPath)) {
    try { fs.unlinkSync(card.photoPath); } catch {}
  }
  const cardImg = path.join(CARDS_DIR, `${userId}_card.png`);
  if (fs.existsSync(cardImg)) {
    try { fs.unlinkSync(cardImg); } catch {}
  }
  delete db.cards[userId];
  save(db);
}

function getPhotoPath(userId) {
  const card = getCard(userId);
  return card?.photoPath || null;
}

function getCardImagePath(userId) {
  return path.join(CARDS_DIR, `${userId}_card.png`);
}

module.exports = {
  DATA_DIR,
  CARDS_DIR,
  FILE_PATH,
  load,
  save,
  getCard,
  setCard,
  deleteCard,
  getPhotoPath,
  getCardImagePath,
};
