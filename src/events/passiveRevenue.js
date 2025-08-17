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

const SHIMAZU_USER         = process.env.SHIMAZU_USER;              // 473438661120360459
const TETSURYU_USER        = process.env.TETSURYU_USER;             // (optionnel)
const KINUMA_ECURIE_USER   = process.env.KINUMA_ECURIE_USER;        // 1078615385970065458
const TETSU_IRONWORKS_USER = process.env.TETSU_IRONWORKS_USER;      // 1277109722775949317
const CALIGA_HALL_USER     = process.env.CALIGA_HALL_USER;          // 792775346327912469
const GOUVERNEMENT_USER    = process.env.GOUVERNEMENT_USER;         // 276060004262477825

// target: 'entreprise' => crédit sur account.entreprise.liquide
// target: 'courant'    => crédit sur account.courant.liquide
const entreprises = [
  { name: "Kokuryu Holdings",                 min: 50,   max: 450,  account: SHIMAZU_USER,         target: 'entreprise' },
  { name: "Tetsuryu Freight & Co.",           min: 0,    max: 250,  account: TETSURYU_USER,        target: 'entreprise' },
  { name: "Kinuma Stable",                    min: 0,    max: 150,  account: KINUMA_ECURIE_USER,   target: 'entreprise' },
  { name: "Tetsu Ironworks",                  min: 0,    max: 190,  account: TETSU_IRONWORKS_USER, target: 'entreprise' },
  { name: "La plantation Shimazu",            min: 0,    max: 100,  account: SHIMAZU_USER,         target: 'entreprise' },
  { name: "La plantation de Caliga Hall",     min: 0,    max: 120,  account: CALIGA_HALL_USER,     target: 'entreprise' },
  { name: "Entreprises de Belleshore (Total)",min: 1000, max: 3000, account: GOUVERNEMENT_USER,    target: 'courant'    },
];

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ---- Europe/Paris helpers ----
function parisNowParts() {
  const fmt = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
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

// Crédit au bon “porte-monnaie”
function creditAccountPocket(userId, amount, target) {
  if (!userId || amount <= 0) return { ok:false, msg:'no account' };
  const acc = getOrCreateAccount(userId);
  // sécurise les structures
  acc.courant    = acc.courant    || { liquide: 0, banque: 0 };
  acc.entreprise = acc.entreprise || { liquide: 0, banque: 0 };

  if (target === 'entreprise') {
    acc.entreprise.liquide = (acc.entreprise.liquide ?? 0) + amount;
  } else {
    acc.courant.liquide = (acc.courant.liquide ?? 0) + amount;
  }
  updateAccount(userId, acc);
  return { ok:true };
}

async function generateRevenues(client, { markRun = true } = {}) {
  if (!REVENUS_PASSIFS_CHANNEL) return;
  const channel = await client.channels.fetch(REVENUS_PASSIFS_CHANNEL).catch(() => null);
  if (!channel) return;

  for (const e of entreprises) {
    const amount = randomInt(e.min, e.max);
    let credited = false;

    if (e.account) {
      try {
        creditAccountPocket(e.account, amount, e.target);
        credited = true;
      } catch (err) {
        console.error(`Erreur crédit ${e.name} (${e.account}) :`, err);
      }
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
}

function scheduleDailyAt18Paris(client) {
  const initialDelay = msUntilNext18hParis();
  setTimeout(async () => {
    // garde-fou anti-doublon à l’instant T
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

  // /revenus_test (n'impacte pas le timer)
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'revenus_test') return;
    try {
      await generateRevenues(client, { markRun: false }); // pas de marquage
      await interaction.reply({ content: '⚡ Revenus générés (test).', ephemeral: true });
    } catch (e) {
      console.error('revenus_test:', e);
      await interaction.reply({ content: '❌ Erreur lors de la génération.', ephemeral: true });
    }
  });
};

// Export interne pour d'autres usages si besoin
module.exports._internal = { generateRevenues };
