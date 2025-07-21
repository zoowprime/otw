const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder } = require('discord.js');

const SESSIONS_FILE = path.join(__dirname, '../data/sessions.json');
const OPTIONS = [
  { id: 'present', category: 'présents' },
  { id: 'late',    category: 'en retard' },
  { id: 'maybe',   category: 'indécis' },
  { id: 'absent',  category: 'absents' }
];

function loadSessions() {
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE,'[]');
  return JSON.parse(fs.readFileSync(SESSIONS_FILE,'utf-8'));
}
function saveSessions(sessions) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

module.exports = (client) => {
  client.sessionVotes = new Map();

  // au démarrage, recharge toutes les sessions en mémoire
  client.once('ready', () => {
    const sessions = loadSessions();
    for (const s of sessions) {
      client.sessionVotes.set(s.messageId, s);
    }
    console.log(`🔄 Chargées ${sessions.length} session(s) en mémoire.`);
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    const sess = client.sessionVotes.get(interaction.message.id);
    if (!sess) {
      return interaction.reply({ content: '❌ Ce message n’est pas une session active.', ephemeral: true });
    }
    const uid = interaction.user.id;
    const choice = interaction.customId; // 'present' | 'late' | ...

    // retire partout, puis ajoute
    for (const o of OPTIONS) {
      const arr = sess.votes[o.id];
      const idx = arr.indexOf(uid);
      if (idx !== -1) arr.splice(idx,1);
    }
    sess.votes[choice].push(uid);

    // met à jour le embed
    const channel = await client.channels.fetch(sess.channelId);
    const msg     = await channel.messages.fetch(sess.messageId);
    const old    = msg.embeds[0];
    const fields = OPTIONS.map(o => {
      const users = sess.votes[o.id];
      return {
        name: `Membres ${o.category} (${users.length}) :`,
        value: users.length ? users.map(id=>`<@${id}>`).join(' ') : 'Aucun'
      };
    });
    const newEmbed = EmbedBuilder.from(old).setFields(fields);
    const buttons = interaction.message.components; // on réutilise la row

    // update sur le même message
    await interaction.update({ embeds: [newEmbed], components: buttons });

    // enfin on sauvegarde la nouvelle session
    const all = loadSessions();
    const ix  = all.findIndex(s=>s.messageId===sess.messageId);
    if (ix !== -1) {
      all[ix] = sess;
      saveSessions(all);
    }
  });
};
