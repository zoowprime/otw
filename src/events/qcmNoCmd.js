// src/events/qcmNoCmd.js
require('dotenv').config({ path: './id.env' });
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  ComponentType,
  MessageFlags,
} = require('discord.js');

const QUESTIONS = require('../data/qcmQuestions.json');

// ====== Émojis ======
const EMOJI_BOOKS = '📚';
const EMOJI_START = '🚀';
const EMOJI_WARN  = '⚠️';
const EMOJI_OK    = '✅';
const EMOJI_NO    = '❌';
const EMOJI_QMARK = '❓';
const EMOJI_NEXT  = '⏭️';
const EMOJI_CHECK = '🧪';

const NUM_EMOJIS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];

// ====== État des sessions en mémoire ======
/**
 * Map<channelId, {
 *   userId: string,
 *   pool: Array<{question, choices, answer}>,
 *   index: number, // 0..29
 *   score: number,
 *   messageId?: string, // message courant QCM
 *   pendingAnswerIdx?: number // index choisi en attente de confirmation
 * }>
 */
const sessions = new Map();

// ====== Helpers ======
function shufflePick30(arr){
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, 30);
}

function buildLaunchEmbed(){
  return new EmbedBuilder()
    .setColor(0x5865F2) // blurple
    .setTitle(`${EMOJI_BOOKS} Bienvenue pour le QCM`)
    .setDescription(
      `Avant de commencer, consulte les salons utiles :\n` +
      `• <#${process.env.SALON_1}>\n` +
      `• <#${process.env.SALON_2}>\n\n` +
      `${EMOJI_START} Quand tu es prêt, ouvre le menu ci-dessous et sélectionne **Débuter le QCM**.`
    )
    .setFooter({ text: 'OTW — Module QCM' });
}

function buildStartRow(){
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('qcm_launcher')
      .setPlaceholder('Débuter le QCM')
      .addOptions([{ label: 'Débuter le QCM', value: 'launch', emoji: EMOJI_START }])
  );
}

function questionEmbed(q, idx, total){
  return new EmbedBuilder()
    .setColor(0x00B894) // teal
    .setTitle(`${EMOJI_QMARK} Question ${idx + 1} / ${total}`)
    .setDescription(`${q.question}`)
    .setFooter({ text: 'Sélectionne ta réponse ci-dessous' });
}

function answersRow(q, userId, channelId){
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`qcm_ans_${userId}_${channelId}`)
    .setPlaceholder('Choisis ta réponse')
    .addOptions(q.choices.slice(0, 9).map((c, i) => ({
      label: c,
      value: String(i),
      emoji: NUM_EMOJIS[i] || '➡️'
    })));
  return new ActionRowBuilder().addComponents(menu);
}

function confirmEmbed(selectedText){
  return new EmbedBuilder()
    .setColor(0xF1C40F) // yellow
    .setTitle(`${EMOJI_CHECK} Confirmer ta réponse`)
    .setDescription(
      `Tu as choisi : **${selectedText}**\n\n` +
      `Es-tu sûr de cette réponse ?`
    );
}

function confirmRow(userId, channelId){
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`qcm_confirm_${userId}_${channelId}`)
    .setPlaceholder('Confirme ton choix')
    .addOptions(
      { label: 'Oui, je confirme', value: 'yes', emoji: EMOJI_OK },
      { label: 'Non, revenir à la question', value: 'no', emoji: EMOJI_NO }
    );
  return new ActionRowBuilder().addComponents(menu);
}

function resultEmbed(score, total){
  const passed = score >= 20;
  return new EmbedBuilder()
    .setColor(passed ? 0x2ECC71 : 0xE74C3C)
    .setTitle(`${passed ? EMOJI_OK : EMOJI_NO} QCM terminé`)
    .setDescription(
      `Tu as obtenu **${score} / ${total}** bonnes réponses.\n` +
      (passed
        ? '🎉 Bravo, tu as **réussi** ! Clique sur **Terminer le QCM**.'
        : '❌ Tu n’as pas atteint 20 bonnes réponses. Tu pourras réessayer dans 24h.')
    );
}

function finishRow(userId){
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`qcm_finish_${userId}`)
      .setLabel('Terminer le QCM')
      .setStyle(ButtonStyle.Primary)
  );
}

async function logAnswer(client, user, qIndex, total, question, selected, answer){
  const logChId = process.env.QCM_LOGS_CHANNEL;
  if (!logChId) return;
  const ch = await client.channels.fetch(logChId).catch(() => null);
  if (!ch) return;

  const correct = (selected === answer);
  const emb = new EmbedBuilder()
    .setColor(correct ? 0x2ECC71 : 0xE74C3C)
    .setTitle(`📝 QCM — Réponse ${qIndex + 1}/${total}`)
    .setDescription(
      `**Joueur :** ${user?.tag ?? user?.username ?? 'inconnu'} (${user?.id ?? '??'})\n` +
      `**Question :** ${question}\n` +
      `**Réponse choisie :** ${selected}\n` +
      `**Réponse correcte :** ${answer}\n` +
      `**Résultat :** ${correct ? '✅ Correct' : '❌ Faux'}`
    )
    .setTimestamp();

  ch.send({ embeds: [emb] }).catch(() => {});
}

// ====== Module principal ======
module.exports = (client) => {
  // 1) Panneau de lancement (posté une seule fois)
  client.once('ready', async () => {
    const chId = process.env.QCM_LANCEMENT_CHANNEL;
    if (!chId) return console.error('QCM_LANCEMENT_CHANNEL non défini');
    const ch = await client.channels.fetch(chId).catch(() => null);
    if (!ch || !ch.isTextBased()) return console.error('Salon QCM non trouvé');

    const msgs = await ch.messages.fetch({ limit: 50 }).catch(() => null);
    if (msgs?.some(m => m.components.length && m.components[0]?.components?.[0]?.customId === 'qcm_launcher')) {
      return; // déjà posté
    }

    await ch.send({ embeds: [buildLaunchEmbed()], components: [buildStartRow()] }).catch(() => {});
  });

  // 2) Interactions
  client.on('interactionCreate', async (interaction) => {
    // 2.1 — Menu de lancement
    if (interaction.isStringSelectMenu() && interaction.customId === 'qcm_launcher') {
      const member = interaction.member;

      try {
        await member.roles.add(process.env.QCM_EN_COURS).catch(() => {});
        await member.roles.remove(process.env.ORAL_A_FAIRE).catch(() => {});
        await interaction.reply({ content: `${EMOJI_OK} Préparation de ton QCM…`, flags: MessageFlags.Ephemeral });
      } catch (e) {
        return interaction.reply({ content: `${EMOJI_NO} Impossible de préparer ton QCM (permissions ?).`, flags: MessageFlags.Ephemeral }).catch(() => {});
      }

      // Création du salon privé
      let channel;
      try {
        channel = await interaction.guild.channels.create({
          name: `qcm-${member.user.username}`,
          type: ChannelType.GuildText,
          parent: process.env.QCM_START_CATEGORY,
          permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: member.id,            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
            { id: process.env.STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory] }
          ],
        });
      } catch (e) {
        return interaction.followUp({ content: `${EMOJI_NO} Impossible de créer le salon du QCM (permissions ?).`, flags: MessageFlags.Ephemeral }).catch(() => {});
      }

      // Menu Oui/Non démarrage
      const startEmbed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle(`${EMOJI_START} Lancer le QCM ?`)
        .setDescription(`Sélectionne **Oui** pour démarrer, **Non** pour annuler.`);

      const startRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`qcm_start_${member.id}`)
          .setPlaceholder('Ton choix…')
          .addOptions(
            { label: 'Oui', value: 'yes', emoji: EMOJI_OK },
            { label: 'Non', value: 'no', emoji: EMOJI_NO },
          )
      );

      await channel.send({ embeds: [startEmbed], components: [startRow] }).catch(() => {});
      return;
    }

    // 2.2 — Confirmation de démarrage Oui/Non
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('qcm_start_')) {
      const userId = interaction.customId.split('_')[2];
      if (interaction.user.id !== userId) {
        return interaction.reply({ content: `${EMOJI_NO} Ce menu n’est pas pour toi.`, flags: MessageFlags.Ephemeral });
      }

      const choice = interaction.values[0];
      const channel = interaction.channel;

      if (choice === 'no') {
        await interaction.update({
          embeds: [ new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle(`${EMOJI_NO} QCM annulé`)
            .setDescription('Tu as annulé le QCM.')
          ],
          components: []
        }).catch(() => {});
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (member) {
          await member.roles.remove(process.env.QCM_EN_COURS).catch(() => {});
          await member.roles.add(process.env.ORAL_A_FAIRE).catch(() => {});
        }
        setTimeout(() => channel?.delete().catch(() => {}), 10_000);
        return;
      }

      // Lancement de la session
      await interaction.update({ content: `${EMOJI_START} Le QCM démarre…`, embeds: [], components: [] }).catch(() => {});
      const pool = shufflePick30(QUESTIONS);
      const state = { userId, pool, index: 0, score: 0 };
      sessions.set(channel.id, state);

      // Envoi première question
      const q = state.pool[state.index];
      const msg = await channel.send({
        embeds: [questionEmbed(q, state.index, state.pool.length)],
        components: [answersRow(q, userId, channel.id)]
      }).catch(() => null);

      if (msg) state.messageId = msg.id;
      return;
    }

    // 2.3 — Sélection d’une réponse
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('qcm_ans_')) {
      const parts = interaction.customId.split('_'); // qcm, ans, userId, channelId
      const userId = parts[2];
      const chId = parts[3];

      if (interaction.user.id !== userId) {
        return interaction.reply({ content: `${EMOJI_NO} Ce menu n’est pas pour toi.`, flags: MessageFlags.Ephemeral });
      }
      if (interaction.channelId !== chId) {
        return interaction.reply({ content: `${EMOJI_NO} Contexte invalide.`, flags: MessageFlags.Ephemeral });
      }

      const state = sessions.get(chId);
      if (!state) return interaction.reply({ content: `${EMOJI_NO} Session expirée.`, flags: MessageFlags.Ephemeral });

      const selectedIdx = parseInt(interaction.values[0], 10);
      const q = state.pool[state.index];
      const selectedText = q.choices[selectedIdx];

      state.pendingAnswerIdx = selectedIdx;

      // Remplacer l’embed par la confirmation
      await interaction.update({
        embeds: [confirmEmbed(selectedText)],
        components: [confirmRow(userId, chId)]
      }).catch(() => {});
      return;
    }

    // 2.4 — Confirmation Oui/Non de la réponse
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('qcm_confirm_')) {
      const parts = interaction.customId.split('_'); // qcm, confirm, userId, channelId
      const userId = parts[2];
      const chId = parts[3];

      if (interaction.user.id !== userId) {
        return interaction.reply({ content: `${EMOJI_NO} Ce menu n’est pas pour toi.`, flags: MessageFlags.Ephemeral });
      }
      if (interaction.channelId !== chId) {
        return interaction.reply({ content: `${EMOJI_NO} Contexte invalide.`, flags: MessageFlags.Ephemeral });
      }

      const state = sessions.get(chId);
      if (!state) return interaction.reply({ content: `${EMOJI_NO} Session expirée.`, flags: MessageFlags.Ephemeral });
      const choice = interaction.values[0];

      // Revenir à la question
      if (choice === 'no') {
        const q = state.pool[state.index];
        state.pendingAnswerIdx = undefined;
        return interaction.update({
          embeds: [questionEmbed(q, state.index, state.pool.length)],
          components: [answersRow(q, userId, chId)]
        }).catch(() => {});
      }

      // Oui => on valide et on passe à la suite
      const q = state.pool[state.index];
      const selectedIdx = state.pendingAnswerIdx ?? 0;
      const selectedText = q.choices[selectedIdx];

      // Log en temps réel
      const user = interaction.user;
      await logAnswer(client, user, state.index, state.pool.length, q.question, selectedText, q.answer);

      if (selectedText === q.answer) state.score++;

      state.index++;
      state.pendingAnswerIdx = undefined;

      // Fin si plus de questions
      if (state.index >= state.pool.length) {
        sessions.delete(chId);
        return interaction.update({
          embeds: [resultEmbed(state.score, state.pool.length)],
          components: [finishRow(userId)]
        }).catch(() => {});
      }

      // Question suivante
      const nq = state.pool[state.index];
      return interaction.update({
        embeds: [questionEmbed(nq, state.index, state.pool.length)],
        components: [answersRow(nq, userId, chId)]
      }).catch(() => {});
    }

    // 2.5 — Bouton "Terminer le QCM"
    if (interaction.isButton() && interaction.customId.startsWith('qcm_finish_')) {
      const userId = interaction.customId.split('_')[2];
      if (interaction.user.id !== userId) {
        return interaction.reply({ content: `${EMOJI_NO} Ce bouton n’est pas pour toi.`, flags: MessageFlags.Ephemeral });
      }

      await interaction.deferUpdate().catch(() => {});
      const channel = interaction.channel;

      // Le score est déjà affiché, mais on peut inférer en relisant l’embed si besoin
      // Ici, on applique seulement la logique de rôles et d’archivage comme avant
      let permsIssue = false;
      try {
        const member = await interaction.guild.members.fetch(userId);
        await member.roles.remove(process.env.QCM_EN_COURS).catch(() => {});
        // Le rôle final dépend du dernier embed (réussi ou non). On le déduit via le titre/ couleur :
        const lastEmb = interaction.message.embeds?.[0];
        const passed = lastEmb?.title?.includes('QCM terminé') && lastEmb.color === 0x2ECC71;

        if (passed) {
          await member.roles.add(process.env.CITIZEN_ROLE_ID).catch(() => { permsIssue = true; });
        } else {
          await member.roles.add(process.env.ORAL_A_FAIRE).catch(() => { permsIssue = true; });
        }
      } catch {
        permsIssue = true;
      }

      try {
        await channel.setParent(process.env.QCM_END_CATEGORY).catch(() => { permsIssue = true; });
      } catch {
        permsIssue = true;
      }

      try {
        await interaction.message.edit({ content: `${EMOJI_OK} QCM terminé, salon archivé.`, embeds: [], components: [] });
      } catch {
        await channel.send(`${EMOJI_OK} QCM terminé, salon archivé.`).catch(() => {});
      }

      if (permsIssue) {
        await channel.send(`${EMOJI_WARN} Certaines actions n’ont pas pu être appliquées (permissions / hiérarchie de rôles ?).`).catch(() => {});
      }
      return;
    }
  });
};
