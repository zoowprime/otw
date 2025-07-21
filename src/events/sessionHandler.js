// src/events/sessionHandler.js
const fs   = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
  const DATA_PATH = path.join(__dirname, '../data/sessions.json');

  // 1) Crée et charge la map
  client.sessionVotes = new Map();
  if (fs.existsSync(DATA_PATH)) {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    const obj = JSON.parse(raw);
    for (const [msgId, sess] of Object.entries(obj)) {
      client.sessionVotes.set(msgId, {
        votes: Object.fromEntries(
          Object.entries(sess.votes)
                .map(([k, arr]) => [k, new Set(arr)])
        ),
        meta: sess.meta
      });
    }
  } else {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, '{}', 'utf-8');
  }

  function save() {
    const out = {};
    for (const [msgId, sess] of client.sessionVotes.entries()) {
      out[msgId] = {
        votes: Object.fromEntries(
          Object.entries(sess.votes)
                .map(([k, s]) => [k, Array.from(s)])
        ),
        meta: sess.meta
      };
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(out, null, 2), 'utf-8');
  }

  // 2) Sur chaque clic de bouton…
  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const sess = client.sessionVotes.get(interaction.message.id);
    if (!sess) {
      return interaction.reply({
        content: `❌ Ce message n'est pas une session active.`,
        ephemeral: true
      });
    }

    const uid = interaction.user.id;
    // retire de toutes les catégories
    for (const set of Object.values(sess.votes)) {
      set.delete(uid);
    }
    // ajoute dans la bonne catégorie
    if (sess.votes[interaction.customId]) {
      sess.votes[interaction.customId].add(uid);
    } else {
      return interaction.reply({ content: `❌ Option invalide.`, ephemeral: true });
    }

    // reconstruit l'embed
    const { date, horaire, psn } = sess.meta;
    const e = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('📅 Session RP Old Town Western')
      .setDescription(
        `**Date :** ${date}\n` +
        `**Horaire :** ${horaire}\n` +
        `**PSN :** ${psn}\n\n` +
        `✅ = Présents\n🕦 = En retard\n🤷 = Indécis\n❌ = Absents\n\n` +
        `Merci de cliquer pour indiquer votre présence.`
      )
      .addFields(
        { name: `Membres présents (${sess.votes.present.size}) :`,  value: sess.votes.present.size  ? Array.from(sess.votes.present).map(i=>`<@${i}>`).join(' ') : 'Aucun' },
        { name: `Membres en retard (${sess.votes.late.size}) :`,    value: sess.votes.late.size    ? Array.from(sess.votes.late).map(i=>`<@${i}>`).join(' ') : 'Aucun' },
        { name: `Membres indécis (${sess.votes.maybe.size}) :`,     value: sess.votes.maybe.size   ? Array.from(sess.votes.maybe).map(i=>`<@${i}>`).join(' ') : 'Aucun' },
        { name: `Membres absents (${sess.votes.absent.size}) :`,    value: sess.votes.absent.size  ? Array.from(sess.votes.absent).map(i=>`<@${i}>`).join(' ') : 'Aucun' }
      );

    // met à jour
    await interaction.update({ embeds: [e] });
    save();
  });
};
