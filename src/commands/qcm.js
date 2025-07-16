// src/commands/qcm.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const QUESTIONS = require('../data/qcmQuestions.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('qcm')
    .setDescription('Démarre votre QCM RP'),
  
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

    // Crée le salon privé pour le QCM
    const channel = await guild.channels.create({
      name: `qcm-${interaction.user.username}`,
      type: 0, // textuel
      parent: process.env.QCM_START_CATEGORY,
      permissionOverwrites: [
        { id: guild.id,         deny: ['ViewChannel'] },
        { id: userId,           allow: ['ViewChannel','SendMessages','ReadMessageHistory'] },
        { id: process.env.STAFF_ROLE_ID,
                               allow: ['ViewChannel','ReadMessageHistory'] }
      ],
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
          { label: 'Oui', value: 'start_yes' },
          { label: 'Non', value: 'start_no' }
        ])
    );

    const msg = await channel.send({ embeds: [startEmbed], components: [startRow] });

    // Collecteur pour le choix Oui/Non
    const collector = msg.createMessageComponentCollector({
      componentType: 3, // select menu
      time: 120_000      // 2 min
    });

    collector.on('collect', async sel => {
      if (sel.user.id !== userId) {
        return sel.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });
      }
      collector.stop(); // on ne veut qu’un seul choix

      // Si annulation
      if (sel.values[0] === 'start_no') {
        await sel.update({
          content: '\u200B', // ❗ obligatoire pour ne pas envoyer un message vide
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
        // supprime le salon au bout de 10s
        return setTimeout(() => channel.delete().catch(() => {}), 10_000);
      }

      // Si oui, on démarre le QCM
      await sel.update({
        content: '🎬 Le QCM démarre…',
        embeds: [],
        components: []
      });

      let score = 0;
      // Mélange et prend 30 questions
      const shuffled = QUESTIONS.sort(() => Math.random() - 0.5).slice(0, 30);

      // Boucle sur chaque question
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
        const answerIndex = q.choices.findIndex(c => c === q.answer);

        // Collecteur pour cette question (un seul choix ou 2 min)
        const qColl = qMsg.createMessageComponentCollector({
          componentType: 3,
          max: 1,
          time: 120_000
        });

        // Attendre la réponse ou le timeout
        await new Promise(resolve => {
          qColl.on('collect', selQ => {
            if (selQ.user.id === userId && selQ.values[0] === `opt_${answerIndex}`) {
              score++;
            }
            resolve();
          });
          qColl.on('end', () => resolve());
        });

        // Désactive le menu précédent
        await qMsg.edit({ components: [] });
      }

      // Bilan final
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

      // Collecteur pour le bouton “Terminer le QCM”
      const fColl = endMsg.createMessageComponentCollector({
        componentType: 2, // button
        max: 1,
        time: 86_400_000  // 24h
      });

      fColl.on('collect', async btn => {
        if (btn.user.id !== userId) {
          return btn.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });
        }

        // Retrait / ajout des rôles
        await interaction.member.roles.remove(process.env.QCM_EN_COURS);
        if (passed) {
          await interaction.member.roles.add(process.env.CITIZEN_ROLE_ID);
        } else {
          await interaction.member.roles.add(process.env.ORAL_A_FAIRE);
          // Ici, on peut enregistrer le timestamp pour le cooldown de 24h
        }

        // Déplace le salon en catégorie QCM_END
        await channel.setParent(process.env.QCM_END_CATEGORY);

        // Finalise le message (avec un content non vide)
        await btn.update({
          content: '✅ QCM terminé, salon archivé.',
          embeds: [],
          components: []
        });
      });
    });
  }
};
