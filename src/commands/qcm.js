const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  MessageFlags
} = require('discord.js');
const QUESTIONS = require('../data/qcmQuestions.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('qcm')
    .setDescription('Démarre votre QCM RP'),

  async execute(interaction) {
    // 1) On retire l’option /force et on différé tout de suite
    await interaction.deferReply();

    // 2) Vérifie que le membre a le rôle QCM_EN_COURS
    if (!interaction.member.roles.cache.has(process.env.QCM_EN_COURS)) {
      return interaction.editReply({ content: '❌ Vous n’avez pas le rôle requis pour démarrer le QCM.' });
    }

    // 3) Crée la session et mélange les questions
    const shuffled = QUESTIONS.sort(() => Math.random() - 0.5).slice(0, 30);
    interaction.client.qcmSessions = interaction.client.qcmSessions || new Map();
    interaction.client.qcmSessions.set(interaction.user.id, { questions: shuffled, index: 0, score: 0 });

    // 4) Envoie la première question **en public dans le salon courant**
    await sendQuestion(interaction);
  }
};

/**
 * Envoie ou met à jour la question courante.
 */
async function sendQuestion(interaction) {
  const session = interaction.client.qcmSessions.get(interaction.user.id);
  if (!session) return;

  const { index, questions, score } = session;
  // Si terminé :
  if (index >= questions.length) {
    const passed = score >= 20;
    const endEmbed = new EmbedBuilder()
      .setTitle(passed ? '🎉 QCM réussi' : '❌ QCM échoué')
      .setDescription(`Vous obtenez **${score} / ${questions.length}** bonnes réponses.`)
      .setColor(passed ? 0x00ff00 : 0xff0000);

    return interaction.editReply({ embeds: [endEmbed], components: [] });
  }

  // Question N°index + 1
  const q = questions[index];
  const embed = new EmbedBuilder()
    .setTitle(`Question ${index + 1}`)
    .setDescription(q.question)
    .setColor(0xff0000);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`qcm_answer`)
    .setPlaceholder('Choisissez votre réponse…')
    .addOptions(
      q.choices.map((c, i) => ({ label: c, value: String(i) }))
    );

  const row = new ActionRowBuilder().addComponents(menu);

  // On update (si déjà différé) ou on reply si c’est la toute première fois
  const payload = { embeds: [embed], components: [row] };
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload);
  } else {
    await interaction.reply(payload);
  }

  // Collector 2 minutes
  const msg = await interaction.fetchReply();
  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    max: 1,
    time: 120_000
  });

  collector.on('collect', async sel => {
    // Ignore si ce n’est pas la bonne personne
    if (sel.user.id !== interaction.user.id) {
      return sel.reply({ content: '❌ Ce QCM n’est pas pour vous.', flags: MessageFlags.EphemerAL });
    }

    await sel.deferUpdate();
    const choiceIdx = Number(sel.values[0]);
    if (q.choices[choiceIdx] === q.answer) {
      session.score++;
    }
    session.index++;
    // Passe à la suivante
    sendQuestion(interaction);
  });

  collector.on('end', (_, reason) => {
    if (reason === 'time' && session.index < questions.length) {
      // Timeout, on saute la question
      session.index++;
      sendQuestion(interaction);
    }
  });
}
