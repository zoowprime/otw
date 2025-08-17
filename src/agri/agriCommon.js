// src/agri/agriCommon.js
const { EmbedBuilder, ChannelType } = require('discord.js');

const FIELDS = [
  { key: 'shimazu', label: 'Domaine Shimazu', env: 'HARVEST_CHANNEL_SHIMAZU' },
  { key: 'caliga',  label: 'Caliga Hall',     env: 'HARVEST_CHANNEL_CALIGA'  },
];

const RAW_ITEMS = ['Maïs', 'Coton', 'Blé'];
const REF_ITEMS = ['Maïs', 'Coton', 'Blé']; // mêmes noms côté transformés

// Timings
const SESSION_MS = 5 * 60 * 1000; // 5 min
const TICK_MS = 20 * 1000;        // 20 s
const YIELD_PER_TICK = 4;         // 4 par tick → cap récolte 50, on stoppe dès 50

function fieldByKey(key) { return FIELDS.find(f => f.key === key); }
function fieldLabel(key)  { return fieldByKey(key)?.label || key; }
function fieldKeyFromLabel(label) { return FIELDS.find(f => f.label === label)?.key || null; }

function harvestChannelIdForField(key) {
  const envName = fieldByKey(key)?.env;
  return envName ? process.env[envName] : null;
}

function stockEmbed(fieldKey, stock) {
  // stock format:
  // { raw: { "Maïs": n, "Coton": n, "Blé": n }, refined: { "Maïs": n, "Coton": n, "Blé": n } }
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

function randomPayment() {
  // 30 → 50 inclus
  return Math.floor(Math.random() * 21) + 30;
}

module.exports = {
  FIELDS, RAW_ITEMS, REF_ITEMS,
  SESSION_MS, TICK_MS, YIELD_PER_TICK,
  fieldByKey, fieldLabel, fieldKeyFromLabel, harvestChannelIdForField,
  stockEmbed, randomDest, randomPayment
};
