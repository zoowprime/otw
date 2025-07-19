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

    // Vérifie le rôle QCM_EN_COURS
    const qcRole = guild.roles.cache.get(process.env.QCM_EN_COURS);
    if (!qcRole || !interaction.member.roles.cache.has(qcRole.id)) {
      return interaction.reply({
        content: '❌ Vous n’avez pas le rôle nécessaire pour démarrer le QCM.',
        ephemeral: true
      });
    }

    // On a 3s pour répondre à Discord, on différre la réponse
    await interaction.deferReply({ ephemeral: true });

    // Création du salon privé
    const channel = await guild.channels.create({
      name: `qcm-${interaction.user.username}`,
      type: 0,
      parent: process.env.QCM_START_CATEGORY,
      permissionOverwrites: [
        { id: guild.id, deny: ['ViewChannel'] },
        { id: userId,   allow: ['ViewChannel','SendMessages','ReadMessageHistory'] },
        { id: process.env.STAFF_ROLE_ID, allow: ['ViewChannel','ReadMessageHistory'] }
      ],
    });

    // On confirme à l'utilisateur
    await interaction.editReply({
      content: `✅ Salon QCM créé : ${channel}`,
      ephemeral: true
    });

    // Embed de lancement
    const startEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('Souhaitez-vous lancer le QCM ?')
      .setDescription('Sélectionnez **Oui** pour débuter, **Non** pour annuler et revenir en arrière.');

    const startRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`qcm_start_${userId}`)
        .setPlaceholder('Faites un choix…')
        .addOptions([
          { label: 'Oui',  value: 'start_yes' },
          { label: 'Non',  value: 'start_no' }
        ])
    );

    const msg = await channel.send({ embeds: [startEmbed], components: [startRow] });

    // Choix Oui/Non
    const startColl = msg.createMessageComponentCollector({
      componentType: 3, // menu déroulant
      time: 120_000
    });

    startColl.on('collect', async sel => {
      if (sel.user.id !== userId) {
        return sel.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });
      }
      startColl.stop();

      if (sel.values[0] === 'start_no') {
        // Annulation
        await sel.update({
          content: '\u200B',
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

      // Démarrage
      await sel.update({
        content: '🎬 Le QCM démarre…',
        embeds: [],
        components: []
      });

      let score = 0;
      const shuffled = QUESTIONS
        .map(q => ({ ...q }))           // copie
        .sort(() => Math.random() - .5) // mélange
        .slice(0, 30);

      for (let i = 0; i < shuffled.length; i++) {
        const q = shuffled[i];

        const qEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle(`Question ${i + 1}`)
          .setDescription(q.question);

        const qRow = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`qcm_question_${userId}_${i}`)
            .setPlaceholder('Choisissez une réponse…')
            .addOptions(
              q.choices.map((c, idx) => ({
                label: c,
                value: `opt_${idx}`
              }))
            )
        );

        const qMsg = await channel.send({ embeds: [qEmbed], components: [qRow] });
        const correctIndex = q.choices.indexOf(q.answer);

        const qColl = qMsg.createMessageComponentCollector({
          componentType: 3,
          max: 1,
          time: 120_000
        });

        await new Promise(resolve => {
          qColl.on('collect', async selQ => {
            if (selQ.user.id === userId && selQ.values[0] === `opt_${correctIndex}`) {
              score++;
            }
            // désactiver le menu immédiatement
            await selQ.update({ components: [] }).catch(() => {});
            resolve();
          });
          qColl.on('end', async () => {
            // si pas de réponse, on désactive aussi
            await qMsg.edit({ components: [] }).catch(() => {});
            resolve();
          });
        });
      }

      // Bilan
      const passed = score >= 20;
      const endEmbed = new EmbedBuilder()
        .setColor(passed ? 0x00ff00 : 0xff0000)
        .setTitle('QCM terminé')
        .setDescription(
          `Vous avez obtenu **${score} / 30** réponses correctes.\n` +
          (passed
            ? '🎉 Félicitations, vous avez réussi ! Cliquez sur **Terminer le QCM**.'
            : '❌ Vous n’avez pas atteint 20 bonnes réponses. Vous pourrez réessayer dans 24h.')
        );

      const endRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`qcm_finish_${userId}`)
          .setLabel('Terminer le QCM')
          .setStyle(ButtonStyle.Primary)
      );

      const endMsg = await channel.send({ embeds: [endEmbed], components: [endRow] });

      const finishColl = endMsg.createMessageComponentCollector({
        componentType: 2, // bouton
        max: 1,
        time: 86_400_000 // 24h
      });

      finishColl.on('collect', async btn => {
        if (btn.user.id !== userId) {
          return btn.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });
        }
        // rôles
        await interaction.member.roles.remove(process.env.QCM_EN_COURS);
        if (passed) {
          await interaction.member.roles.add(process.env.CITIZEN_ROLE_ID);
        } else {
          await interaction.member.roles.add(process.env.ORAL_A_FAIRE);
          // ici, on pourrait enregistrer un timestamp pour le cooldown
        }
        await channel.setParent(process.env.QCM_END_CATEGORY);
        await btn.update({
          content: '✅ QCM terminé, salon archivé.',
          embeds: [],
          components: []
        });
      });
    });
  }
};
