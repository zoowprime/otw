// src/commands/qcm.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType
} = require('discord.js');
const QUESTIONS = require('../data/qcmQuestions.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('qcm')
    .setDescription('Démarre votre QCM RP')
    // On suppose que seul le rôle QCM_EN_COURS peut l’utiliser
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guild  = interaction.guild;

    // 1) On défère la réponse immédiatement (ephemeral)
    await interaction.deferReply({ ephemeral: true });

    // 2) Vérifie le rôle QCM_EN_COURS
    const qcRole = guild.roles.cache.get(process.env.QCM_EN_COURS);
    if (!qcRole || !interaction.member.roles.cache.has(qcRole.id)) {
      return interaction.editReply({
        content: '❌ Vous n’avez pas le rôle **QCM EN COURS** pour lancer ce QCM.',
      });
    }

    // 3) Création du salon privé
    let channel;
    try {
      channel = await guild.channels.create({
        name: `qcm-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: process.env.QCM_START_CATEGORY,
        permissionOverwrites: [
          { id: guild.id,             deny: ['ViewChannel'] },
          { id: userId,               allow: ['ViewChannel','SendMessages','ReadMessageHistory'] },
          { id: process.env.STAFF_ROLE_ID, allow: ['ViewChannel','ReadMessageHistory'] }
        ],
      });
    } catch (err) {
      console.error('Erreur création du salon QCM :', err);
      return interaction.editReply({ content: '❌ Impossible de créer le salon du QCM.' });
    }

    // 4) On confirme la création du salon
    await interaction.editReply({
      content: `✅ Salon créé : ${channel}`,
    });

    // 5) Envoi de l’embed de lancement DANS le salon privé
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

    const startMsg = await channel.send({ embeds: [startEmbed], components: [startRow] });

    // 6) Collecteur pour début / annulation
    const startCollector = startMsg.createMessageComponentCollector({
      componentType: 3, // StringSelectMenu
      time: 120_000
    });

    startCollector.on('collect', async sel => {
      if (sel.user.id !== userId) return sel.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });
      startCollector.stop();

      if (sel.values[0] === 'start_no') {
        // Annulation
        await sel.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff0000)
              .setTitle('QCM annulé')
              .setDescription('Vous avez annulé le QCM.')
          ],
          components: []
        });
        // Retire le rôle et supprime le salon
        await interaction.member.roles.remove(process.env.QCM_EN_COURS);
        await interaction.member.roles.add(process.env.ORAL_A_FAIRE);
        return setTimeout(() => channel.delete().catch(() => {}), 10_000);
      }

      // 7) Démarrage du QCM
      await sel.update({ content: '🎬 Le QCM démarre…', embeds: [], components: [] });

      let score = 0;
      const shuffled = QUESTIONS.sort(() => Math.random() - .5).slice(0, 30);

      for (let i = 0; i < shuffled.length; i++) {
        const q = shuffled[i];
        const qEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle(`Question ${i + 1}`)
          .setDescription(q.question);

        const qRow = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`qcm_question_${userId}_${i}`)
            .setPlaceholder('Réponse…')
            .addOptions(
              q.choices.map((c, idx) => ({
                label: c,
                value: `opt_${idx}`
              }))
            )
        );

        const qMsg = await channel.send({ embeds: [qEmbed], components: [qRow] });
        const answerIndex = q.choices.findIndex(c => c === q.answer);

        // On attend la réponse ou le timeout
        const collected = await qMsg.awaitMessageComponent({
          componentType: 3,
          time: 120_000
        }).catch(() => null);

        // Si c’est l’utilisateur et bonne réponse
        if (collected && collected.user.id === userId && collected.values[0] === `opt_${answerIndex}`) {
          score++;
        }

        // Désactive les menus
        await qMsg.edit({ components: [] });
      }

      // 8) Bilan final
      const passed = score >= 20;
      const endEmbed = new EmbedBuilder()
        .setColor(passed ? 0x00ff00 : 0xff0000)
        .setTitle('QCM terminé')
        .setDescription(
          `Vous avez obtenu **${score} / 30** réponses correctes.\n` +
          (passed
            ? '🎉 Félicitations, vous avez réussi ! Cliquez sur **Terminer le QCM**.'
            : '❌ Vous n’avez pas atteint 20 bonnes réponses. Vous pourrez réessayer dans 24h.')
        );

      const endRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`qcm_finish_${userId}`)
          .setLabel('Terminer le QCM')
          .setStyle(ButtonStyle.Primary)
      );

      const endMsg = await channel.send({ embeds: [endEmbed], components: [endRow] });

      // 9) Collecteur pour « Terminer »
      const finishBtn = await endMsg.awaitMessageComponent({
        componentType: 2,
        time: 86_400_000
      }).catch(() => null);

      if (!finishBtn || finishBtn.user.id !== userId) return;

      // Roles & archivage
      await interaction.member.roles.remove(process.env.QCM_EN_COURS);
      if (passed) await interaction.member.roles.add(process.env.CITIZEN_ROLE_ID);
      else        await interaction.member.roles.add(process.env.ORAL_A_FAIRE);

      await channel.setParent(process.env.QCM_END_CATEGORY);

      await finishBtn.update({
        content: `✅ QCM terminé (score : **${score}/30**) – salon archivé.`,
        embeds: [],
        components: []
      });
    });
  }
};
