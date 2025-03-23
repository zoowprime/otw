// src/warehouseData.js
const warehouseData = {};

function getUserWarehouse(userId) {
  if (!warehouseData[userId]) {
    warehouseData[userId] = {
      maisBrut: 0,
      maisTrans: 0,
      cotonBrut: 0,
      cotonTrans: 0
    };
  }
  return warehouseData[userId];
}

module.exports = { warehouseData, getUserWarehouse };
