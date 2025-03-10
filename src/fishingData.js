// src/fishingData.js
const fishingSessions = new Map();
/*
 fishingSessions stocke pour chaque userId un objet :
  {
    fishName: "Nom du poisson",
    fishPrice: 2.50,
    quantity: 3,
    startTime: 167... (Date.now())
  }
*/
module.exports = { fishingSessions };
