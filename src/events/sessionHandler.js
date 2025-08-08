// src/events/sessionHandler.js
const fs   = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Fichier persistant (sur Render, /data persiste)
const DATA_DIR  = '/data';
const DATA_FILE = path.join(DATA_DIR, 'sessions.json');

// --- helpers persistance ----
function ensureStore() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR); } catch {}
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
  }
}
function loadStore() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {};
  }
}
function saveStore(store) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2)); } catch {}
}

module.exports = (client) => {
  // Chargement en mémoire
  let sessions = loadStore();

  client.on('ready', () => {
    // Recharge au boot (au cas où)
    sessions = loadStore();
    console.log('🟢 SessionHandler prêt, sessions connues :', Object.keys(sessions).length);
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const parts = interaction.customId.split(':');    // ["session","present","1234567890"]
    if (parts[0] !== 'session') return;

    const vote     = parts[1];        // present | late | maybe | absent
    const messageId = parts[2];       // id du message "session"

    // Normalisation des catégories
    const cats = ['present', 'late', 'maybe', 'absent'];
    if (!cats.includes(vote)) return;

    // Init de la session si inconnue
    if (!sessions[messageId]) {
      sessions[messageId] = { present: [], late: [], maybe: [], absent: [] };
    }

    const record = sessions[messageId];
    const uid    = interaction.user.id;

    // Retirer des autres catégories
    for (const c of cats) {
      record[c] = record[c].filter(id => id !== uid);
    }
    // Ajouter dans la bonne
    if (!record[vote].includes(uid)) {
      record[vote].push(uid);
    }

    // Sauvegarde
    saveStore(sessions);

    // Recréer les champs de l’embed
    const toList = (arr) => arr.length ? arr.map(id => `<@${id}>`).join(' ') : 'Aucun';
    const fields = [
      { name: `Membres présents (${record.present.length}) :`, value: toList(record.present) },
      { name: `Membres en retard (${record.late.length}) :`,  value: toList(record.late) },
      { name: `Membres indécis (${record.maybe.length}) :`,   value: toList(record.maybe) },
      { name: `Membres absents (${record.absent.length}) :`,  value: toList(record.absent) },
    ];

    // Repart de l'embed existant (on conserve titre/desc/couleur)
    const baseEmbed = interaction.message.embeds[0]
      ? EmbedBuilder.from(interaction.message.embeds[0])
      : new EmbedBuilder().setColor(0xFF0000).setTitle('📅 Session RP Old Town Western');

    const updated = baseEmbed.setFields(fields);

    // Reconstruit la rangée de boutons (pour être robuste)
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`session:present:${messageId}`)
        .setLabel('Oui')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`session:late:${messageId}`)
        .setLabel('En retard')
        .setEmoji('🕦')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`session:maybe:${messageId}`)
        .setLabel('Je ne sais pas')
        .setEmoji('🤷')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`session:absent:${messageId}`)
        .setLabel('Absent')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger),
    );

    // Met à jour le message (pas d’éphémère ici)
    await interaction.update({ embeds: [updated], components: [row] });
  });
};
