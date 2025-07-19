// src/events/heistSessions.js
module.exports = (client) => {
  // stockera pour chaque utilisateur actif { intervalId, timeoutId }
  client.heistSessions = new Map();
};
