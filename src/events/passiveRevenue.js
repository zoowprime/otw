// src/events/passiveRevenue.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { getOrCreateAccount, updateAccount } = require('../economyData');

const DATA_DIR = process.env.DATA_DIR || '/data';
const STATE_FILE = path.join(DATA_DIR, 'passive_revenue_state.json');
function ensureDir() { try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {} }
ensureDir();

function loadState() { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8') || '{}'); } catch { return {}; } }
function saveState(obj) { try { fs.writeFileSync(STATE_FILE, JSON.stringify(obj, null, 2), 'utf8'); } catch {} }

const REVENUS_PASSIFS_CHANNEL = process.env.REVENUS_PASSIFS_CHANNEL;

// Comptes existants
const SHIMAZU_USER         = process.env.SHIMAZU_USER;
const TETSURYU_USER        = process.env.TETSURYU_USER;
const KINUMA_ECURIE_USER   = process.env.KINUMA_ECURIE_USER;
const TETSU_IRONWORKS_USER = process.env.TETSU_IRONWORKS_USER;
const CALIGA_HALL_USER     = process.env.CALIGA_HALL_USER;
const GOUVERNEMENT_USER    = process.env.GOUVERNEMENT_USER;

// ✨ Nouveaux comptes (ajoute ces variables dans id.env)
const HOCKLEYS_INDUSTRIES_USER = process.env.HOCKLEYS_INDUSTRIES_USER;
const HOCKLEYS_HORSES_USER     = process.env.HOCKLEYS_HORSES_USER;
const WINCHESTER_BANK_USER     = process.env.WINCHESTER_BANK_USER;
const MEIYO_BANK_USER          = process.env.MEIYO_BANK_USER;
const LE_GARRISON_USER         = process.env.LE_GARRISON_USER;

// target: 'entreprise' => crédit sur account.entreprise.liquide
// target: 'courant'    => crédit sur account.courant.liquide
const entreprises = [
  { name: "Kokuryu Holdings",                  min: 250,   max: 600,  account: SHIMAZU_USER,              target: 'entreprise' },
  { name: "Tetsuryu Freight & Co.",            min: 0,    max: 350,  account: TETSURYU_USER,             target: 'entreprise' },
  { name: "Kinuma Stable",                     min: 0,    max: 150,  account: KINUMA_ECURIE_USER,        target: 'entreprise' },
  { name: "Tetsu Ironworks",                   min: 0,    max: 190,  account: TETSU_IRONWORKS_USER,      target: 'entreprise' },
  { name: "La plantation Shimazu",             min: 0,    max: 100,  account: SHIMAZU_USER,              target: 'entreprise' },
  { name: "La plantation de Caliga Hall",      min: 0,    max: 120,  account: CALIGA_HALL_USER,          target: 'entreprise' },
  { name: "Entreprises de Belleshore (Total)", min: 1000, max: 3000, account: GOUVERNEMENT_USER,         target: 'courant'    },

  // 🔥 Nouvelles entreprises
  { name: "Hockley's Industries & Co.",        min: 100,  max: 500,  account: HOCKLEYS_INDUSTRIES_USER,  target: 'entreprise' },
  { name: "Hockley's Horses",                  min: 0,    max: 150,  account: HOCKLEYS_HORSES_USER,      target: 'entreprise' },
  { name: "Winchester Bank",                   min: 300,  max: 1000, account: WINCHESTER_BANK_USER,      target: 'entreprise' },
  { name: "Meiyo Bank",                        min: 150,  max: 650,  account: MEIYO_BANK_USER,           target: 'entreprise' },
  { name: "Le Garrison",                       min: 100,    max: 200,  account: LE_GARRISON_USER,          target: 'entreprise' },
];

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// --- Europe/Paris time helpers ---
function parisNowParts() {
  const fmt = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
  });
  const map = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  return { year:+map.year, month:+map.month, day:+map.day, hour:+map.hour, minute:+map.minute, second:+map.second };
}
function parisISODateOnly() {
  const { year, month, day } = parisNowParts();
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function msUntilNext18hParis() {
  const now = new Date();
  const { year, month, day, hour, minute, second } = parisNowParts();
  const currentSec = hour*3600 + minute*60 + second;
  const cutoff = 18*3600;

  let tY = year, tM = month, tD = day;
  if (currentSec >= cutoff) {
    const tmp = new Date(Date.UTC(year, month-1, day, 12, 0, 0));
    tmp.setUTCDate(tmp.getUTCDate() + 1);
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone:'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit'
    }).formatToParts(tmp);
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    tY = +map.year; tM = +map.month; tD = +map.day;
  }
  const target = new Date(tY, tM-1, tD, 18, 0, 0);
  return Math.max(0, target.getTime() - now.getTime());
}

// --- Crédit sur la bonne “poche” ---
function creditAccountPocket(userId, amount, target) {
  if (!userId || amount <= 0) return { ok:false, msg:'no account' };
  const acc = getOrCreateAccount(userId);
  acc.courant    = acc.courant    || { liquide: 0, banque: 0 };
  acc.entreprise = acc.entreprise || { liquide: 0, banque: 0 };
  if (target === 'entreprise') acc.entreprise.liquide = (acc.entreprise.liquide ?? 0) + amount;
  else                         acc.courant.liquide    = (acc.courant.liquide ?? 0) + amount;
  updateAccount(userId, acc);
  return { ok:true };
}

// --- Mutex anti double-exécution simultanée ---
let inFlight = false;

async function generateRevenues(client, { markRun = true } = {}) {
  if (inFlight) return;
  inFlight = true;

  try {
    if (!REVENUS_PASSIFS_CHANNEL) return;
    const channel = await client.channels.fetch(REVENUS_PASSIFS_CHANNEL).catch(() => null);
    if (!channel) return;

    for (const e of entreprises) {
      const amount = randomInt(e.min, e.max);
      let credited = false;

      if (e.account) {
        try { creditAccountPocket(e.account, amount, e.target); credited = true; }
        catch (err) { console.error(`Erreur crédit ${e.name} (${e.account}) :`, err); }
      }

      const footer =
        credited
          ? (e.target === 'entreprise' ? 'Crédité sur le compte ENTREPRISE (liquide).' : 'Crédité sur le compte COURANT (liquide).')
          : '⚠️ Compte non configuré (aucun crédit).';

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('💰 Revenus passifs')
        .setDescription(`**${e.name}** a généré **$${amount}** aujourd’hui.`)
        .setFooter({ text: footer })
        .setTimestamp();

      await channel.send({ embeds: [embed] }).catch(() => {});
    }

    if (markRun) {
      const st = loadState();
      st.lastRunParis = parisISODateOnly();
      saveState(st);
    }
  } finally {
    inFlight = false;
  }
}

function scheduleDailyAt18Paris(client) {
  const initialDelay = msUntilNext18hParis();
  setTimeout(async () => {
    const st = loadState();
    const today = parisISODateOnly();
    if (st.lastRunParis !== today) {
      await generateRevenues(client, { markRun: true });
    }
    setInterval(() => generateRevenues(client, { markRun: true }), 24*60*60*1000);
  }, initialDelay);
}

module.exports = (client) => {
  scheduleDailyAt18Paris(client);
};

// Export pour la commande de test (ne modifie pas le timer quotidien)
module.exports._internal = { generateRevenues };
