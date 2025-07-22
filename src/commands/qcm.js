// src/commands/qcm.js
require('dotenv').config({ path: './id.env' });
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags
} = require('discord.js');
const QUESTIONS = require('../data/qcmQuestions.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('qcm')
    .setDescription('Démarre votre QCM RP')
    // On ne veut pas que tout le monde puisse spammer /qcm
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guild  = interaction.guild;

    // 1) Déférer la réponse (utiliser flags désormais)
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // 2) Vérifier le rôle QCM_EN_COURS
    const qcRole = guild.roles.cache.get(process.env.QCM_EN_COURS);
    if (!qcRole || !interaction.member.roles.cache.has(qcRole.id)) {
      return interaction.editReply({
        content: '❌ Vous n’avez pas le rôle **QCM EN COURS** pour lancer ce QCM.'
      });
    }

    // 3) Créer un salon privé
    let channel;
    try {
      channel = await guild.channels.create({
        name: `qcm-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: process.env.QCM_START_CATEGORY,
        permissionOverwrites: [
          { id: guild.id, deny: ['ViewChannel'] },
          { id: userId,   allow: ['ViewChannel','SendMessages','ReadMessageHistory'] },
          { id: process.env.STAFF_ROLE_ID, allow: ['ViewChannel','ReadMessageHistory'] },
          { id: interaction.client.user.id, allow: ['ViewChannel','SendMessages','ReadMessageHistory'] }
        ]
      });
      console.log('📔 Salon QCM créé:', channel.id);
    } catch (err) {
      console.error('❌ Erreur création du salon QCM :', err);
      return interaction.editReply({
        content: '❌ Impossible de créer le salon du QCM.'
      });
    }

    // 4) Confirmer la création au joueur
    await interaction.editReply({
      content: `✅ Salon créé : ${channel}`
    });

    // 5) Envoyer l’embed de lancement DANS le salon
    const startEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('Souhaitez-vous lancer le QCM ?')
      .setDescription('Sélectionnez **Oui** pour débuter, **Non** pour annuler.');

    const startRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`qcm_start_${userId}`)
        .setPlaceholder('Votre choix…')
        .addOptions([
          { label: 'Oui', value: 'start_yes' },
          { label: 'Non', value: 'start_no' }
        ])
    );

    let startMsg;
    try {
      startMsg = await channel.send({ embeds: [startEmbed], components: [startRow] });
    } catch (err) {
      console.error('❌ Erreur envoi startEmbed :', err);
      return;
    }

    // 6) Attendre la sélection (2 min max)
    const startSelection = await startMsg.awaitMessageComponent({
      componentType: 'SELECT_MENU',
      time: 120_000,
      max: 1
    }).catch(() => null);

    if (!startSelection || startSelection.user.id !== userId) {
      console.log('⚠️ QCM non démarré (pas de réponse ou mauvais user).');
      return;
    }

    // 7) Si annulation
    if (startSelection.values[0] === 'start_no') {
      await startSelection.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('QCM annulé')
            .setDescription('Vous avez annulé le QCM.')
        ],
        components: []
      });
      await interaction.member.roles.remove(process.env.QCM_EN_COURS);
      await interaction.member.roles.add(process.env.ORAL_A_FAIRE);
      return setTimeout(() => channel.delete().catch(() => {}), 10_000);
    }

    // 8) Démarrer le QCM
    await startSelection.update({ content: '🎬 Le QCM démarre…', embeds: [], components: [] });
    let score = 0;
    const shuffled = QUESTIONS.sort(() => Math.random() - 0.5).slice(0, 30);

    for (let i = 0; i < shuffled.length; i++) {
      const q = shuffled[i];
      const qEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`Question ${i + 1}`)
        .setDescription(q.question);

      const qRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`qcm_question_${userId}_${i}`)
          .setPlaceholder('Votre réponse…')
          .addOptions(
            q.choices.map((c, idx) => ({ label: c, value: `opt_${idx}` }))
          )
      );

      let qMsg;
      try {
        qMsg = await channel.send({ embeds: [qEmbed], components: [qRow] });
      } catch (err) {
        console.error(`❌ Erreur envoi question ${i+1} :`, err);
        continue;
      }

      const collected = await qMsg.awaitMessageComponent({
        componentType: 'SELECT_MENU',
        time: 120_000,
        max: 1
      }).catch(() => null);

      if (
        collected &&
        collected.user.id === userId &&
        collected.values[0] === `opt_${q.choices.findIndex(c => c === q.answer)}`
      ) {
        score++;
      }

      // Désactiver le menu
      await qMsg.edit({ components: [] });
    }

    // 9) Envoyer le bilan + bouton “Terminer”  
    const passed = score >= 20;
    const endEmbed = new EmbedBuilder()
      .setColor(passed ? 0x00ff00 : 0xff0000)
      .setTitle('QCM terminé')
      .setDescription(
        `Vous avez obtenu **${score} / 30** réponses correctes.\n` +
        (passed
          ? '🎉 Félicitations ! Cliquez sur **Terminer le QCM**.'
          : '❌ Vous n’avez pas atteint 20 bonnes réponses. Vous pourrez réessayer dans 24h.')
      );

    const endRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`qcm_finish_${userId}`)
        .setLabel('Terminer le QCM')
        .setStyle(ButtonStyle.Primary)
    );

    let endMsg;
    try {
      endMsg = await channel.send({ embeds: [endEmbed], components: [endRow] });
    } catch (err) {
      console.error('❌ Erreur envoi bilan :', err);
      return;
    }

    // 10) Attendre “Terminer” (24 h max)
    const finishBtn = await endMsg.awaitMessageComponent({
      componentType: 'BUTTON',
      time: 86_400_000,
      max: 1
    }).catch(() => null);

    if (!finishBtn || finishBtn.user.id !== userId) return;

    // 11) Retirer/ajouter les rôles + archiver le salon
    await interaction.member.roles.remove(process.env.QCM_EN_COURS);
    if (passed) {
      await interaction.member.roles.add(process.env.CITIZEN_ROLE_ID);
    } else {
      await interaction.member.roles.add(process.env.ORAL_A_FAIRE);
      // stocker timestamp pour cooldown si besoin
    }

    await channel.setParent(process.env.QCM_END_CATEGORY);

    await finishBtn.update({
      content: `✅ QCM terminé (score : **${score} / 30**) – salon archivé.`,
      embeds: [],
      components: []
    });
  }
};
