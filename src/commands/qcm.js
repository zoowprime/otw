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
    const guild  = interaction.guild;

    // 1️⃣ Vérification du rôle QCM_EN_COURS
    const qcmRoleId = process.env.QCM_EN_COURS;
    if (!qcmRoleId || !interaction.member.roles.cache.has(qcmRoleId)) {
      return interaction.reply({
        content: '❌ Vous n’avez pas le rôle **QCM_EN_COURS**.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    // 2️⃣ Création du salon temporaire
    const channel = await guild.channels.create({
      name: `qcm-${interaction.user.username}`,
      type: 0,
      parent: process.env.QCM_START_CATEGORY,
      permissionOverwrites: [
        { id: guild.id, deny: ['ViewChannel'] },
        { id: userId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
        { id: process.env.STAFF_ROLE_ID, allow: ['ViewChannel', 'ReadMessageHistory'] }
      ]
    });

    await interaction.editReply({
      content: `✅ Salon QCM créé : ${channel}`,
      ephemeral: true
    });

    // 3️⃣ Embed de lancement + menu déroulant
    const startEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('Souhaitez-vous lancer le QCM ?')
      .setDescription('Sélectionnez **Oui** pour débuter, **Non** pour annuler.');

    const startMenu = new StringSelectMenuBuilder()
      .setCustomId(`qcm_start_${userId}`)
      .setPlaceholder('Choisissez...')
      .addOptions([
        { label: 'Oui', value: 'start_yes' },
        { label: 'Non', value: 'start_no' }
      ]);

    const startRow = new ActionRowBuilder().addComponents(startMenu);

    const startMsg = await channel.send({ embeds: [startEmbed], components: [startRow] });

    // 4️⃣ Collecteur lancement
    const startColl = startMsg.createMessageComponentCollector({
      componentType: 3, // SELECT_MENU
      max: 1,
      time: 120_000
    });

    startColl.on('collect', async sel => {
      if (sel.user.id !== userId)
        return sel.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });

      await sel.deferUpdate();
      const choice = sel.values[0];
      if (choice === 'start_no') {
        // Annulation
        await sel.editReply({
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

      // 5️⃣ Lancement du QCM
      await sel.editReply({ embeds: [], components: [] });
      let score = 0;
      // Mélange et sélection des 30 premières questions
      const shuffled = QUESTIONS.sort(() => Math.random() - 0.5).slice(0, 30);

      // Boucle sur chaque question
      for (let i = 0; i < shuffled.length; i++) {
        const q = shuffled[i];
        const qEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle(`Question ${i + 1}`)
          .setDescription(q.question);

        const qMenu = new StringSelectMenuBuilder()
          .setCustomId(`qcm_q_${userId}_${i}`)
          .setPlaceholder('Choisissez une réponse...')
          .addOptions(
            q.choices.map((c, idx) => ({
              label: c,
              value: `opt_${idx}`
            }))
          );

        const qRow = new ActionRowBuilder().addComponents(qMenu);
        const qMsg = await channel.send({ embeds: [qEmbed], components: [qRow] });

        // Collecteur unique pour chaque question
        const qColl = qMsg.createMessageComponentCollector({
          componentType: 3,
          max: 1,
          time: 120_000
        });

        const correctIndex = q.choices.findIndex(c => c === q.answer);

        await new Promise(resolve => {
          qColl.on('collect', async ans => {
            if (ans.user.id !== userId)
              return ans.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });

            if (ans.values[0] === `opt_${correctIndex}`) {
              score++;
            }
            await ans.deferUpdate();
            resolve();
          });
          qColl.on('end', () => resolve());
        });

        // Désactive le menu
        await qMsg.edit({ components: [] });
      }

      // 6️⃣ Bilan et embed final avec bouton
      const passed = score >= 20;
      const resultEmbed = new EmbedBuilder()
        .setColor(passed ? 0x00ff00 : 0xff0000)
        .setTitle('QCM terminé')
        .setDescription(
          `Vous avez obtenu **${score} / 30**.` +
          (passed
            ? '\n🎉 Félicitations, vous avez réussi ! Cliquez sur **Terminer le QCM**.'
            : '\n❌ Vous n’avez pas atteint 20 bonnes réponses. Vous pourrez réessayer dans 24 h.')
        );

      const finishBtn = new ButtonBuilder()
        .setCustomId(`qcm_finish_${userId}`)
        .setLabel('Terminer le QCM')
        .setStyle(ButtonStyle.Primary);

      const finishRow = new ActionRowBuilder().addComponents(finishBtn);
      const finMsg = await channel.send({ embeds: [resultEmbed], components: [finishRow] });

      // 7️⃣ Collecteur pour Terminer le QCM
      const finColl = finMsg.createMessageComponentCollector({ componentType: 2, max: 1, time: 86_400_000 });
      finColl.on('collect', async btn => {
        if (btn.user.id !== userId)
          return btn.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });

        await btn.deferUpdate();
        await interaction.member.roles.remove(process.env.QCM_EN_COURS);
        if (passed) {
          await interaction.member.roles.add(process.env.CITIZEN_ROLE_ID);
        } else {
          await interaction.member.roles.add(process.env.ORAL_A_FAIRE);
          // Ici on enregistrerait le timestamp pour le cooldown 24 h
        }

        // Déplace le salon dans la catégorie de fin
        await channel.setParent(process.env.QCM_END_CATEGORY);
        // On désactive le bouton
        await btn.editReply({ embeds: [resultEmbed], components: [] });
      });
    });
  }
};
