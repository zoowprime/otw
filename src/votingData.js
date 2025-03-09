// src/votingData.js
const votingData = {
  active: false,
  candidates: [], // stocke les IDs des candidats
  votes: {} // key: candidateId, value: nombre de votes
};

module.exports = votingData;
