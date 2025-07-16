const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  ChannelType
} = require('discord.js');
const fs   = require('fs');
const path = require('path');
const QUESTIONS = require('../data/qcmQuestions.json');

const COOLDOWN_FILE = path.join(process.env.DATA_DIR || '/data', 'qcmCooldowns.json');
function loadCooldowns() {
  try { return JSON.parse(fs.readFileSync(COOLDOWN_FILE)); }
  catch { return {}; }
}
function saveCooldowns(d) {
  fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(d, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('qcm')
    .setDescription('Démarre votre QCM RP'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // 1) Vérif rôle
    if (!interaction.member.roles.cache.has(process.env.QCM_EN_COURS)) {
      return interaction.editReply('❌ Vous n’avez pas le rôle **QCM EN COURS**.');
    }

    // 2) Vérif cooldown 24h
    const cds = loadCooldowns();
    const last = cds[interaction.user.id];
    if (last && Date.now() - last < 24 * 3600 * 1000) {
      return interaction.editReply('❌ Vous devez attendre 24 h avant de retenter le QCM.');
    }

    // 3) Création du salon temporaire
    const guild = interaction.guild;
    const name  = `qcm-${interaction.user.username}`.slice(0, 32);
    const channel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: process.env.QCM_START_CATEGORY,
      permissionOverwrites: [
        { id: guild.id, deny: ['ViewChannel'] },
        { id: interaction.user.id, allow: ['ViewChannel','SendMessages','ReadMessageHistory'] },
        { id: process.env.STAFF_ROLE_ID, allow: ['ViewChannel','ReadMessageHistory'] }
      ]
    });

    // 4) Message de lancement dans ce salon
    const startEmbed = new EmbedBuilder()
      .setTitle('Souhaitez-vous lancer le QCM ?')
      .setDescription('Choisissez **Oui** pour démarrer, **Non** pour annuler.')
      .setColor(0xff0000);

    const startMenu = new StringSelectMenuBuilder()
      .setCustomId('qcm_start')
      .addOptions(
        { label: 'Oui', value: 'yes' },
        { label: 'Non', value: 'no' }
      );

    const startRow = new ActionRowBuilder().addComponents(startMenu);
    const msg = await channel.send({ embeds: [startEmbed], components: [startRow] });

    // 5) Confirmation dans l’éphemère
    await interaction.editReply(`Votre QCM commence ici : ${channel}`);

    // 6) Collecteur pour Oui/Non
    const coll = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120_000,
      max: 1
    });

    coll.on('collect', async sel => {
      if (sel.user.id !== interaction.user.id) {
        return sel.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });
      }
      await sel.deferUpdate();
      if (sel.values[0] === 'no') {
        // Annulation
        await channel.send('❌ QCM annulé.');
        await interaction.member.roles.remove(process.env.QCM_EN_COURS);
        await interaction.member.roles.add(process.env.ORAL_A_FAIRE);
        return setTimeout(() => channel.delete().catch(()=>{}), 5_000);
      }

      // 7) Lancer les questions
      const pool = QUESTIONS.sort(() => Math.random() - .5).slice(0, 30);
      guild.client.qcmSessions = guild.client.qcmSessions || new Map();
      guild.client.qcmSessions.set(interaction.user.id, {
        channel,
        questions: pool,
        index: 0,
        score: 0
      });
      sendNextQuestion(interaction.client, interaction.user.id);
    });
  }
};

/**
 * Envoie la question suivante ou termine le QCM.
 */
async function sendNextQuestion(client, userId) {
  const sess = client.qcmSessions.get(userId);
  if (!sess) return;
  const { channel, questions, index, score } = sess;

  // Si toutes les questions ont été posées
  if (index >= questions.length) {
    const passed = score >= 20;
    const endEmbed = new EmbedBuilder()
      .setTitle(passed ? '🎉 QCM réussi' : '❌ QCM échoué')
      .setDescription(`Vous avez obtenu **${score}/${questions.length}**.`)
      .setColor(passed ? 0x00ff00 : 0xff0000);

    const finishBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('qcm_finish')
        .setLabel('Terminer le QCM')
        .setStyle(ButtonStyle.Primary)
    );

    const endMsg = await channel.send({ embeds: [endEmbed], components: [finishBtn] });
    const fColl = endMsg.createMessageComponentCollector({ componentType: ComponentType.Button, max: 1, time: 86_400_000 });

    return fColl.on('collect', async btn => {
      if (btn.user.id !== userId) {
        return btn.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });
      }
      await btn.deferUpdate();
      // Retrait et attribution des rôles
      const member = await channel.guild.members.fetch(userId);
      await member.roles.remove(process.env.QCM_EN_COURS);
      if (passed) {
        await member.roles.add(process.env.CITIZEN_ROLE_ID);
      } else {
        await member.roles.add(process.env.ORAL_A_FAIRE);
        // Enregistrer le cooldown
        const cds = loadCooldowns();
        cds[userId] = Date.now();
        saveCooldowns(cds);
      }
      // Déplacer le salon en fin de QCM
      await channel.setParent(process.env.QCM_END_CATEGORY);
      sess.channel = null; // optional cleanup
    });
  }

  // Sinon on pose la question n°index+1
  const q = questions[index];
  const qEmbed = new EmbedBuilder()
    .setTitle(`Question ${index + 1}`)
    .setDescription(q.question)
    .setColor(0xff0000);

  const menu = new StringSelectMenuBuilder()
    .setCustomId('qcm_answer')
    .setPlaceholder('Votre réponse…')
    .addOptions(
      q.choices.map((c, i) => ({ label: c, value: String(i) }))
    );

  const row = new ActionRowBuilder().addComponents(menu);

  const qMsg = await channel.send({ embeds: [qEmbed], components: [row] });
  const coll = qMsg.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    max: 1,
    time: 120_000
  });

  coll.on('collect', async sel => {
    if (sel.user.id !== userId) {
      return sel.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });
    }
    await sel.deferUpdate();

    const choice = Number(sel.values[0]);
    if (q.choices[choice] === q.answer) {
      sess.score++;
    }
    sess.index++;
    // Nettoyer l’ancien menu
    await qMsg.edit({ components: [] });
    // Passer à la suivante
    sendNextQuestion(client, userId);
  });

  coll.on('end', async (_, reason) => {
    if (reason === 'time') {
      // Timeout -> on saute
      sess.index++;
      await qMsg.edit({ components: [] });
      sendNextQuestion(client, userId);
    }
  });
}
