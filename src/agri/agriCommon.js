// src/agri/agriCommon.js
const { EmbedBuilder } = require('discord.js');

const FIELDS = [
  { key: 'Rosenfeld Ranch', label: 'Emerald Ranch', env: 'HARVEST_CHANNEL_SHIMAZU' },
  { key: 'Rosenfeld Manor',  label: 'Braithwaite Manor',     env: 'HARVEST_CHANNEL_SHIMAZU'  },
];

// ⬇️ AJOUT des nouveaux items + on garde les anciens
const RAW_ITEMS = ['Canne à sucre', 'Riz', 'Tabac', 'Maïs', 'Coton', 'Blé'];
// Les transformés partagent le même nom (ton stockage utilise les mêmes clés)
const REF_ITEMS = ['Canne à sucre', 'Riz', 'Tabac', 'Maïs', 'Coton', 'Blé'];

// ⬇️ PRIX unitaires ($) pour les **transformés**
// (clé = nom de base côté transformé)
const UNIT_PRICES = {
  'Canne à sucre': 0.10,
  'Riz':           0.08,
  'Tabac':         0.60,
  'Maïs':          0.015,
  'Coton':         0.30,
  'Blé':           0.03,
};

// Timings
const SESSION_MS = 5 * 60 * 1000; // 5 min
const TICK_MS = 20 * 1000;        // 20 s
const YIELD_PER_TICK = 4;         // 4 par tick → cap récolte 50

function fieldByKey(key) { return FIELDS.find(f => f.key === key); }
function fieldLabel(key)  { return fieldByKey(key)?.label || key; }
function fieldKeyFromLabel(label) { return FIELDS.find(f => f.label === label)?.key || null; }

function harvestChannelIdForField(key) {
  const envName = fieldByKey(key)?.env;
  return envName ? process.env[envName] : null;
}

function stockEmbed(fieldKey, stock) {
  const lines = [];
  lines.push(`**${fieldLabel(fieldKey)} — Stock**\n`);
  lines.push(`**Bruts :**`);
  RAW_ITEMS.forEach(n => lines.push(`• ${n} x ${stock.raw?.[n] ?? 0}`));
  lines.push(`\n**Transformés :**`);
  REF_ITEMS.forEach(n => lines.push(`• ${n} x ${stock.refined?.[n] ?? 0}`));

  return new EmbedBuilder()
    .setColor(0xAA8F66)
    .setTitle('📦 Agriculture — Stock')
    .setDescription(lines.join('\n'));
}

const DELIVERY_DESTINATIONS = [
  'Gouvernement de Saint-Denis',
  'Gare de Rhodes',
  'Saloon de Valentine',
  'Gare de Saint-Denis',
  'Saloon de Rhodes',
  'Docks de Saint-Denis',
  'Gare de Valentine',
  'Emerald Ranch',
];

function randomDest() {
  return DELIVERY_DESTINATIONS[Math.floor(Math.random() * DELIVERY_DESTINATIONS.length)];
}

module.exports = {
  FIELDS, RAW_ITEMS, REF_ITEMS, UNIT_PRICES,
  SESSION_MS, TICK_MS, YIELD_PER_TICK,
  fieldByKey, fieldLabel, fieldKeyFromLabel, harvestChannelIdForField,
  stockEmbed, randomDest
};
