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
const fs = require('fs');
const path = require('path');

// Charge le fichier JSON des questions
const QUESTIONS = require('../data/qcmQuestions.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('qcm')
    .setDescription('Démarre votre QCM RP')
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .addBooleanOption(opt =>
      opt.setName('force')
         .setDescription('Passer outre le cooldown de 24h (staff uniquement)')
         .setRequired(false)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guild  = interaction.guild;

    // Vérifie que l'utilisateur a le rôle QCM_EN_COURS
    const qcRole = guild.roles.cache.get(process.env.QCM_EN_COURS);
    if (!qcRole || !interaction.member.roles.cache.has(qcRole.id)) {
      return interaction.reply({
        content: '❌ Vous n’avez pas le rôle nécessaire pour démarrer le QCM.',
        ephemeral: true
      });
    }

    // Ici vous pouvez vérifier le cooldown 24h… (omitted)

    // Crée un salon éphémère sous la catégorie QCM_START_CATEGORY
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

    // Envoie la question de lancement
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

    const msg = await channel.send({ embeds: [startEmbed], components: [startRow] });

    // Collecteur pour lancement ou annulation
    const collector = msg.createMessageComponentCollector({
      componentType: 3,
      time: 120_000
    });

    collector.on('collect', async sel => {
      if (sel.user.id !== userId) return sel.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });

      collector.stop();

      if (sel.values[0] === 'start_no') {
        // annulation
        await sel.update({ 
          embeds: [new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('QCM annulé')
            .setDescription('Vous avez annulé le QCM.')
          ],
          components: []
        });
        // retire rôle / remet oral à faire
        await interaction.member.roles.remove(process.env.QCM_EN_COURS);
        await interaction.member.roles.add(process.env.ORAL_A_FAIRE);
        // supprime après 10s
        setTimeout(() => channel.delete().catch(() => {}), 10_000);
        return;
      }

      // Début du QCM
      await sel.update({ embeds: [], components: [] });

      let score = 0;
      // Mélange des questions :
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
            .addOptions(
              q.choices.map((c, idx) => ({
                label: c,
                value: `opt_${idx}`
              }))
            )
        );

        const qMsg = await channel.send({ embeds: [qEmbed], components: [qRow] });

        // Collecteur pour chaque question
        const qColl = qMsg.createMessageComponentCollector({
          time: 120_000,
          max: 1,
          componentType: 3
        });

        const answerIndex = q.choices.findIndex(c => c === q.answer);

        const answered = await new Promise(resolve => {
          qColl.on('collect', async selQ => {
            if (selQ.user.id !== userId) return selQ.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });
            if (selQ.values[0] === `opt_${answerIndex}`) score++;
            resolve();
          });
          qColl.on('end', () => resolve());
        });

        // retire le menu précédent
        await qMsg.edit({ components: [] });
      }

      // Bilan
      const passed = score >= 20;
      const endEmbed = new EmbedBuilder()
        .setColor(passed ? 0x00ff00 : 0xff0000)
        .setTitle('QCM terminé')
        .setDescription(`Vous avez obtenu **${score} / 30** réponses correctes.\n` +
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

      // Finish collector
      const fColl = endMsg.createMessageComponentCollector({ max: 1, time: 86400_000 });
      fColl.on('collect', async btn => {
        if (btn.user.id !== userId) return btn.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });
        // supprime rôle QCM_EN_COURS
        await interaction.member.roles.remove(process.env.QCM_EN_COURS);
        if (passed) {
          await interaction.member.roles.add(process.env.CITIZEN_ROLE_ID);
        } else {
          await interaction.member.roles.add(process.env.ORAL_A_FAIRE);
          // ici on enregistrerait le timestamp pour le cooldown 24h
        }
        // déplacer le salon dans QCM_END_CATEGORY
        await channel.setParent(process.env.QCM_END_CATEGORY);
        await btn.update({ embeds: [], components: [] });
      });
    });
  }
};
