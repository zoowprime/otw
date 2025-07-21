// src/commands/session.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/sessions.json');

function saveSessions(map) {
  const out = {};
  for (const [msgId, sess] of map.entries()) {
    out[msgId] = {
      meta: sess.meta,
      votes: Object.fromEntries(
        Object.entries(sess.votes).map(([k, s]) => [k, Array.from(s)])
      )
    };
  }
  fs.writeFileSync(DATA_PATH, JSON.stringify(out, null, 2), 'utf-8');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setDescription('Crée une session de RP et collecte les présences.')
    .addStringOption(o => o
      .setName('date')
      .setDescription('Date (ex : vendredi 07 mars 2025)')
      .setRequired(true))
    .addStringOption(o => o
      .setName('horaire')
      .setDescription('Horaire (ex : 19h30)')
      .setRequired(true))
    .addStringOption(o => o
      .setName('psn')
      .setDescription('PSN du lanceur')
      .setRequired(true)),

  async execute(interaction) {
    const date    = interaction.options.getString('date');
    const horaire = interaction.options.getString('horaire');
    const psn     = interaction.options.getString('psn');
    const CITIZEN = '1308118795285565530';

    // construit l'embed
    const embed = new EmbedBuilder()
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
        { name: 'Membres présents (0) :',  value: 'Aucun' },
        { name: 'Membres en retard (0) :', value: 'Aucun' },
        { name: 'Membres indécis (0) :',   value: 'Aucun' },
        { name: 'Membres absents (0) :',  value: 'Aucun' }
      );

    // crée les boutons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('present')
        .setLabel('Oui')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('late')
        .setLabel('En retard')
        .setEmoji('🕦')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('maybe')
        .setLabel('Indécis')
        .setEmoji('🤷')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('absent')
        .setLabel('Absent')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger)
    );

    // envoie la réponse et récupère le message avec withResponse + fetchReply
    await interaction.reply({
      content: `<@&${CITIZEN}>`,
      embeds: [embed],
      components: [row],
      withResponse: true
    });
    const msg = await interaction.fetchReply();

    // initialise la map en mémoire
    const sessions = interaction.client.sessionVotes;
    sessions.set(msg.id, {
      meta: { date, horaire, psn },
      votes: {
        present: new Set(),
        late:    new Set(),
        maybe:   new Set(),
        absent:  new Set()
      }
    });

    // sauve en JSON
    saveSessions(sessions);
  }
};
