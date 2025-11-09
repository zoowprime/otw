// src/data/heistData.js
const { loadJSON, saveJSON } = require('./jsonUtil');

const FILE = 'heists.json';

function _db() {
  return loadJSON(FILE, { active: {} });
}
function _save(db) {
  saveJSON(FILE, db);
}

function isUserHeistActive(userId) {
  const db = _db();
  return !!db.active[userId];
}

function startHeist(userId, context = {}) {
  const db = _db();
  db.active[userId] = {
    startedAt: Date.now(),
    ...context,
  };
  _save(db);
}

function endHeist(userId) {
  const db = _db();
  delete db.active[userId];
  _save(db);
}

module.exports = {
  isUserHeistActive,
  startHeist,
  endHeist,
};
