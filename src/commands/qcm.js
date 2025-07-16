// src/commands/qcm.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');
const QUESTIONS = require('../data/qcmQuestions.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('qcm')
    .setDescription('Démarre votre QCM RP')
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guild = interaction.guild;

    // 1️⃣ Vérification du rôle QCM_EN_COURS
    const qcRoleId = process.env.QCM_EN_COURS;
    if (!qcRoleId || !interaction.member.roles.cache.has(qcRoleId)) {
      return interaction.reply({
        content: '❌ Vous n’avez pas le rôle nécessaire pour démarrer le QCM.',
        ephemeral: true
      });
    }

    // 2️⃣ Ack de la commande (pour avoir plus de 3s)
    await interaction.deferReply({ ephemeral: true });

    // 3️⃣ Création du salon éphémère sous la catégorie QCM_START_CATEGORY
    const channel = await guild.channels.create({
      name: `qcm-${interaction.user.username}`,
      type: 0, // textuel
      parent: process.env.QCM_START_CATEGORY,
      permissionOverwrites: [
        { id: guild.id, deny: ['ViewChannel'] },
        { id: userId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
        { id: process.env.STAFF_ROLE_ID, allow: ['ViewChannel', 'ReadMessageHistory'] }
      ]
    });

    // 4️⃣ On informe en éphémère que le salon est prêt
    await interaction.editReply({
      content: `✅ Votre salon de QCM a été créé : ${channel}`,
      ephemeral: true
    });

    // 5️⃣ Envoi de l’embed de lancement dans le salon QCM
    const startEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('Souhaitez-vous lancer le QCM ?')
      .setDescription('Sélectionnez **Oui** pour débuter, **Non** pour annuler et revenir en arrière.');

    const startRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`qcm_start_${userId}`)
        .addOptions([
          { label: 'Oui', value: 'start_yes' },
          { label: 'Non', value: 'start_no' }
        ])
    );

    const startMsg = await channel.send({ embeds: [startEmbed], components: [startRow] });

    // 6️⃣ Collecteur pour accepter ou annuler
    const startCollector = startMsg.createMessageComponentCollector({
      componentType: 3, // StringSelectMenu
      time: 120_000
    });

    startCollector.on('collect', async sel => {
      if (sel.user.id !== userId)
        return sel.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });

      // ack le clic
      await sel.deferUpdate();
      startCollector.stop();

      if (sel.values[0] === 'start_no') {
        // annulation
        await sel.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff0000)
              .setTitle('QCM annulé')
              .setDescription('Vous avez annulé le QCM.')
          ],
          components: []
        });
        // on retire/ajoute les rôles
        await interaction.member.roles.remove(process.env.QCM_EN_COURS);
        await interaction.member.roles.add(process.env.ORAL_A_FAIRE);
        // et on supprime le salon dans 10s
        return setTimeout(() => channel.delete().catch(() => {}), 10_000);
      }

      // -------------------
      // 🟢 DÉBUT DU QCM 🟢
      // vider le message de lancement
      await sel.editReply({ embeds: [], components: [] });

      let score = 0;
      // on mélange et on prend 30 questions
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
            .addOptions(
              q.choices.map((c, idx) => ({
                label: c,
                value: `opt_${idx}`
              }))
            )
        );

        const qMsg = await channel.send({ embeds: [qEmbed], components: [qRow] });

        // collecteur pour la question
        const qColl = qMsg.createMessageComponentCollector({
          componentType: 3,
          max: 1,
          time: 120_000
        });

        const answerIndex = q.choices.findIndex(c => c === q.answer);

        await new Promise(resolve => {
          qColl.on('collect', async selQ => {
            if (selQ.user.id !== userId)
              return selQ.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });

            await selQ.deferUpdate();
            if (selQ.values[0] === `opt_${answerIndex}`) score++;
            resolve();
          });
          qColl.on('end', () => resolve());
        });

        // on désactive le menu
        await qMsg.edit({ components: [] });
      }

      // 7️⃣ Bilan
      const passed = score >= 20;
      const endEmbed = new EmbedBuilder()
        .setColor(passed ? 0x00ff00 : 0xff0000)
        .setTitle('QCM terminé')
        .setDescription(
          `Vous avez obtenu **${score} / 30** réponses correctes.\n` +
          (passed
            ? '🎉 Félicitations, vous avez réussi ! Cliquez sur **Terminer le QCM**.'
            : '❌ Vous n’avez pas atteint 20 bonnes réponses. Vous pourrez réessayer dans 24 h.')
        );

      const endRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`qcm_finish_${userId}`)
          .setLabel('Terminer le QCM')
          .setStyle(ButtonStyle.Primary)
      );

      const endMsg = await channel.send({ embeds: [endEmbed], components: [endRow] });

      // collecte du clic “Terminer le QCM”
      const fColl = endMsg.createMessageComponentCollector({ max: 1, time: 86_400_000 });

      fColl.on('collect', async btn => {
        if (btn.user.id !== userId)
          return btn.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });

        await btn.deferUpdate();
        // gestion des rôles finaux
        await interaction.member.roles.remove(process.env.QCM_EN_COURS);
        if (passed) {
          await interaction.member.roles.add(process.env.CITIZEN_ROLE_ID);
        } else {
          await interaction.member.roles.add(process.env.ORAL_A_FAIRE);
          // ici tu peux enregistrer le timestamp pour cooldown 24h
        }
        // on déplace le salon
        await channel.setParent(process.env.QCM_END_CATEGORY);
        // on désactive le bouton
        await btn.editReply({ embeds: [endEmbed], components: [] });
      });
    });
  }
};
