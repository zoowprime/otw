// src/events/passiveRevenue.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { getOrCreateAccount, updateAccount } = require('../economyData');

const DATA_DIR = process.env.DATA_DIR || '/data';
const STATE_FILE = path.join(DATA_DIR, 'passive_revenue_state.json');
function ensureDir() { try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {} }
ensureDir();

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8') || '{}'); } catch { return {}; }
}
function saveState(obj) { try { fs.writeFileSync(STATE_FILE, JSON.stringify(obj, null, 2), 'utf8'); } catch {} }

// ENV
const REVENUS_PASSIFS_CHANNEL = process.env.REVENUS_PASSIFS_CHANNEL;

const SHIMAZU_USER         = process.env.SHIMAZU_USER;              // 473438661120360459
const TETSURYU_USER        = process.env.TETSURYU_USER;             // (optionnel pour l’instant)
const KINUMA_ECURIE_USER   = process.env.KINUMA_ECURIE_USER;        // 1078615385970065458
const TETSU_IRONWORKS_USER = process.env.TETSU_IRONWORKS_USER;      // 1277109722775949317
const CALIGA_HALL_USER     = process.env.CALIGA_HALL_USER;          // 792775346327912469
const GOUVERNEMENT_USER    = process.env.GOUVERNEMENT_USER;         // 276060004262477825

// Entreprises et plages de revenus
const entreprises = [
  { name: "Kokuryu Holdings",                min: 50,   max: 450,  account: SHIMAZU_USER },
  { name: "Tetsuryu Freight & Co.",          min: 0,    max: 250,  account: TETSURYU_USER },
  { name: "Kinuma Stable",                   min: 0,    max: 150,  account: KINUMA_ECURIE_USER },
  { name: "Tetsu Ironworks",                 min: 0,    max: 190,  account: TETSU_IRONWORKS_USER },
  { name: "La plantation Shimazu",           min: 0,    max: 100,  account: SHIMAZU_USER },
  { name: "La plantation de Caliga Hall",    min: 0,    max: 120,  account: CALIGA_HALL_USER },
  { name: "Entreprises de Belleshore (Total)", min: 1000, max: 3000, account: GOUVERNEMENT_USER },
];

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ---- Utilitaires temps Europe/Paris (sans dépendance externe) ----
function parisNowDate() {
  // Obtenir l'heure/date locale Europe/Paris en composants
  const fmt = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  // parts: {year:'2025', month:'08', day:'17', hour:'18', minute:'00', second:'00'}
  return {
    year: +parts.year, month: +parts.month, day: +parts.day,
    hour: +parts.hour, minute: +parts.minute, second: +parts.second
  };
}

function parisISODateOnly() {
  const { year, month, day } = parisNowDate();
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`; // YYYY-MM-DD
}

function msUntilNext18hParis() {
  const now = new Date();
  const { year, month, day, hour, minute, second } = parisNowDate();

  // construire la Date du "aujourd'hui 18:00:00" en Europe/Paris => obtenir son UTC équivalent
  const targetLocal = new Date(Date.UTC(year, month - 1, day, 18, 0, 0)); // 18h "locale" approximée
  // Ajustement : ce hack UTC ne tient pas compte de l'écart TZ directement; on recalcule via toLocaleString
  // On convertit l'horodatage cible "Europe/Paris 18:00" vers offset réel en comparant heures locales.
  // Méthode simple : si l'heure locale actuelle (Europe/Paris) est >= 18, alors prendre demain 18h.
  const currentSecondsLocal = hour * 3600 + minute * 60 + second;
  const cutoffLocalSeconds  = 18 * 3600;
  let targetDay = day, targetMonth = month, targetYear = year;

  if (currentSecondsLocal >= cutoffLocalSeconds) {
    // passer au lendemain 18h
    const tmp = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    tmp.setUTCDate(tmp.getUTCDate() + 1);
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit'
    }).formatToParts(tmp);
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    targetYear = +map.year; targetMonth = +map.month; targetDay = +map.day;
  }

  // Construire une date cible 18:00 locale → obtenir son timestamp UTC en passant par string locale
  const targetLocalString = `${String(targetDay).padStart(2,'0')}/${String(targetMonth).padStart(2,'0')}/${targetYear} 18:00:00`;
  const parsed = Date.parse(
    new Date(targetYear, targetMonth - 1, targetDay, 18, 0, 0)
      .toLocaleString('en-US', { timeZone: 'Europe/Paris' })
  );
  // Fallback si parse retourne NaN (rare) : approx locale
  const targetTs = isNaN(parsed) ? new Date(targetYear, targetMonth - 1, targetDay, 18, 0, 0).getTime() : parsed;

  const wait = Math.max(0, targetTs - now.getTime());
  return wait;
}

// ---- Génération des revenus ----
async function generateRevenues(client, { markRun = true } = {}) {
  if (!REVENUS_PASSIFS_CHANNEL) return;
  const channel = await client.channels.fetch(REVENUS_PASSIFS_CHANNEL).catch(() => null);
  if (!channel) return;

  for (const e of entreprises) {
    const amount = randomInt(e.min, e.max);

    // Crédit si compte défini
    if (e.account) {
      try {
        const acc = getOrCreateAccount(e.account);
        acc.courant.liquide = (acc.courant.liquide ?? 0) + amount;
        updateAccount(e.account, acc);
      } catch (err) {
        console.error(`Erreur crédit ${e.name} (${e.account}) :`, err);
      }
    }

    const footer = e.account ? 'Crédité sur le compte entreprise (liquide).' : '⚠️ Compte non configuré (aucun crédit).';
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
    st.lastRunParis = parisISODateOnly(); // YYYY-MM-DD jour “Europe/Paris”
    saveState(st);
  }
}

// ---- Planification fixe 18:00 Europe/Paris ----
function scheduleDailyAt18Paris(client) {
  // Au démarrage : si on a déjà exécuté aujourd’hui, on attend demain 18h ; sinon on regarde l’heure
  const st = loadState();
  const todayParis = parisISODateOnly();
  const now = parisNowDate();
  const alreadyToday = (st.lastRunParis === todayParis);

  let initialDelay;
  if (alreadyToday) {
    // déjà exécuté aujourd’hui => attendre demain 18h
    initialDelay = msUntilNext18hParis();
  } else {
    // pas exécuté aujourd’hui : si l’heure locale Paris >= 18h → attendre demain ; sinon exécuter à 18h aujourd’hui
    const currentSec = now.hour * 3600 + now.minute * 60 + now.second;
    if (currentSec >= 18 * 3600) {
      initialDelay = msUntilNext18hParis();
    } else {
      initialDelay = msUntilNext18hParis();
    }
  }

  setTimeout(async () => {
    // Double garde-fou : éviter double run si reboot pile à 18:00
    const st2 = loadState();
    const today = parisISODateOnly();
    if (st2.lastRunParis !== today) {
      await generateRevenues(client, { markRun: true });
    }
    // Ensuite, toutes les 24h
    setInterval(() => generateRevenues(client, { markRun: true }), 24 * 60 * 60 * 1000);
  }, initialDelay);
}

module.exports = (client) => {
  // Planifie l’exécution quotidienne à 18:00 Europe/Paris, robuste aux redémarrages
  scheduleDailyAt18Paris(client);

  // La commande de test est définie dans src/commands/revenus_test.js et n’influence pas ce timer
};

// Export util si besoin ailleurs
module.exports._internal = { generateRevenues };
