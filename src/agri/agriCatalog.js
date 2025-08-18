// src/agri/agriCatalog.js
// Catalogue unique : items bruts, items transformés, prix unitaires (pour transformés),
// et liste des champs où on peut travailler.

const RAW_ITEMS = [
  "Canne à sucre",
  "Riz",
  "Tabac",
  "Maïs",
  "Coton",
  "Blé",
];

// le transformé est juste "<brut> Transformé"
const PROCESSED_ITEMS = RAW_ITEMS.map(n => `${n} Transformé`);

// prix fixes ($ / unité) UNIQUEMENT pour les transformés
const ITEM_PRICES = {
  "Canne à sucre Transformé": 0.10,
  "Riz Transformé": 0.08,
  "Tabac Transformé": 0.60,
  "Maïs Transformé": 0.015,
  "Coton Transformé": 0.30,
  "Blé Transformé": 0.03,
};

// champs pris en charge
const FIELDS = ["Domaine Shimazu", "Caliga Hall"];

module.exports = { RAW_ITEMS, PROCESSED_ITEMS, ITEM_PRICES, FIELDS };
