// src/events/qcmSession.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

// Charge tes 30 questions depuis JSON
const QUESTIONS = require('../data/qcmQuestions.json');

const sessions = new Map();
// structure : sessions.set(userId, { channelId, index, score, timeoutCollector });

module.exports = (client) => {
  client.on('interactionCreate', async interaction => {
    // only handle our QCM menus/buttons
    if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

    const [ type, userId, answer ] = interaction.customId.split('_');
    if (!sessions.has(userId)) return;

    const session = sessions.get(userId);
    if (interaction.channelId !== session.channelId) return;

    // 1) Lancement ou annulation
    if (type === 'qcm' && answer === 'start') {
      if (interaction.values[0] === 'non') {
        // annuler
        await interaction.update({ content: "❌ QCM annulé.", embeds: [], components: [] });
        await interaction.member.roles.remove(process.env.QCM_EN_COURS);
        await interaction.member.roles.add(process.env.ORAL_A_FAIRE);
        return setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
      } else {
        // oui -> première question
        session.index = 0;
        session.score = 0;
        return sendQuestion(interaction, session);
      }
    }

    // 2) Réponse à une question
    if (type === 'qcm' && answer === 'ans') {
      clearTimeout(session.timeoutCollector);
      // Vérifier la bonne réponse
      const q = QUESTIONS[session.index];
      if (interaction.values[0] === q.correct) {
        session.score++;
        await interaction.reply({ content: '✅ Bonne réponse !', ephemeral: true });
      } else {
        await interaction.reply({ content: `❌ Mauvaise réponse. C’était “${q.correct}”.`, ephemeral: true });
      }
      // Passer à la suivante ou terminer
      session.index++;
      if (session.index < QUESTIONS.length) {
        return sendQuestion(interaction, session);
      } else {
        return finishQCM(interaction, session);
      }
    }

    // 3) Bouton “terminer le QCM”
    if (type === 'qcm' && answer === 'end') {
      // déplacer salon
      await interaction.channel.setParent(process.env.QCM_END_CATEGORY);
      return interaction.update({ content: '📌 QCM terminé, salon archivé.', embeds: [], components: [] });
    }
  });
};

async function sendQuestion(interaction, session) {
  const q = QUESTIONS[session.index];
  // Mélanger les options
  const opts = shuffle([ ...q.choices ]).map(ch => ({
    label: ch, value: ch
  }));

  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle(`Question ${session.index+1} / ${QUESTIONS.length}`)
    .setDescription(q.question);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`qcm_ans_${session.userId}`)
    .setPlaceholder('Votre réponse...')
    .addOptions(opts.slice(0, 3)); // si tu veux 3 choix

  // Timeout si pas de réponse en 2 min
  session.timeoutCollector = setTimeout(async () => {
    session.index++;
    if (session.index < QUESTIONS.length) {
      await interaction.channel.send('⌛ Temps écoulé, on passe à la question suivante…');
      return sendQuestion(interaction, session);
    } else {
      return finishQCM(interaction, session);
    }
  }, 2*60*1000);

  await interaction.channel.send({ embeds: [embed], components: [ new ActionRowBuilder().addComponents(menu) ] });
}

async function finishQCM(interaction, session) {
  const passed = session.score >= 20;
  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('QCM terminé')
    .setDescription(
      passed
      ? `🎉 Vous avez obtenu ${session.score}/${QUESTIONS.length}, félicitations !`
      : `😢 Vous avez obtenu ${session.score}/${QUESTIONS.length}. Vous pouvez réessayer dans 24h.`
    );

  const btn = new ButtonBuilder()
    .setCustomId('qcm_end_' + session.userId)
    .setLabel('Terminer le QCM')
    .setStyle(ButtonStyle.Primary);

  await interaction.channel.send({ embeds: [embed], components: [ new ActionRowBuilder().addComponents(btn) ] });

  // rôles
  const member = interaction.guild.members.cache.get(session.userId);
  if (passed) {
    await member.roles.add(process.env.CITIZEN_ROLE_ID);
  } else {
    await member.roles.remove(process.env.QCM_EN_COURS);
    await member.roles.add(process.env.ORAL_A_FAIRE);
    // cooldown 24h :
    setTimeout(() => {
      member.send("Vous pouvez à nouveau faire le QCM avec /qcm.");
    }, 24*60*60*1000);
  }

  sessions.delete(session.userId);
}

function shuffle(a) {
  for (let i = a.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
