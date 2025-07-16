// src/commands/qcm.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');
const QUESTIONS = require('../data/qcmQuestions.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('qcm')
    .setDescription('Démarre votre QCM RP'),
  async execute(interaction) {
    const guild     = interaction.guild;
    const userId    = interaction.user.id;
    const member    = interaction.member;
    const qcRoleId  = process.env.QCM_EN_COURS;
    const oralRoleId = process.env.ORAL_A_FAIRE;
    const endCatId  = process.env.QCM_END_CATEGORY;
    const startCatId = process.env.QCM_START_CATEGORY;
    const staffRoleId = process.env.STAFF_ROLE_ID;

    // 1️⃣ Vérifier le rôle QCM_EN_COURS
    if (!guild.roles.cache.has(qcRoleId) || !member.roles.cache.has(qcRoleId)) {
      return interaction.reply({
        content: '❌ Vous n’avez pas le rôle **QCM EN COURS** pour lancer le QCM.',
        ephemeral: true
      });
    }

    // 2️⃣ Créer le salon privé
    const channel = await guild.channels.create({
      name: `qcm-${interaction.user.username}`,
      type: 0, // text channel
      parent: startCatId,
      permissionOverwrites: [
        { id: guild.id, deny: ['ViewChannel'] },
        { id: userId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
        { id: staffRoleId, allow: ['ViewChannel', 'ReadMessageHistory'] }
      ]
    });

    // 3️⃣ Envoyer l'embed de bienvenue
    const welcomeEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(`Bienvenue dans #${channel.name} !`)
      .setDescription(`C'est le début du salon privé <#${channel.id}>.`);
    await channel.send({ embeds: [welcomeEmbed] });

    // 4️⃣ Envoyer la question de démarrage avec boutons Oui/Non
    const startEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('Souhaitez-vous lancer le QCM ?')
      .setDescription('Cliquez **Oui** pour démarrer, **Non** pour annuler et revenir en arrière.');

    const startRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`qcm_start_yes_${userId}`)
        .setLabel('Oui')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`qcm_start_no_${userId}`)
        .setLabel('Non')
        .setStyle(ButtonStyle.Danger)
    );

    const startMsg = await channel.send({ embeds: [startEmbed], components: [startRow] });

    // 5️⃣ Collecteur sur ces deux boutons
    const collector = startMsg.createMessageComponentCollector({
      componentType: 2, // Button
      time: 120_000,
      max: 1
    });

    collector.on('collect', async btn => {
      if (btn.user.id !== userId) {
        return btn.reply({ content: '❌ Ce salon n’est pas pour vous.', ephemeral: true });
      }
      // Si on annule
      if (btn.customId === `qcm_start_no_${userId}`) {
        await btn.update({
          embeds: [ new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('QCM annulé')
            .setDescription('Vous avez annulé le QCM.')
          ],
          components: []
        });
        // Retirer/ajouter rôles
        await member.roles.remove(qcRoleId);
        await member.roles.add(oralRoleId);
        // Supprimer le canal dans 10s
        setTimeout(() => channel.delete().catch(() => {}), 10_000);
        return;
      }

      // Si on démarre le QCM
      await btn.update({ embeds: [], components: [] });
      let score = 0;
      const questions = QUESTIONS.sort(() => Math.random() - 0.5).slice(0, 30);

      // Boucle sur chaque question
      for (let i = 0; i < questions.length; i++) {
        const { question, choices, answer } = questions[i];
        const qEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle(`Question ${i + 1}`)
          .setDescription(question);

        const qRow = new ActionRowBuilder().addComponents(
          choices.map((opt, idx) =>
            new ButtonBuilder()
              .setCustomId(`qcm_ans_${userId}_${i}_${idx}`)
              .setLabel(opt)
              .setStyle(ButtonStyle.Secondary)
          )
        );

        const qMsg = await channel.send({ embeds: [qEmbed], components: [qRow] });

        // Collecteur pour cette question
        const qColl = qMsg.createMessageComponentCollector({
          componentType: 2,
          time: 120_000,
          max: 1
        });

        const correctIndex = choices.findIndex(c => c === answer);
        const answered = await new Promise(resolve => {
          qColl.on('collect', async sel => {
            if (sel.user.id !== userId) {
              return sel.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });
            }
            if (parseInt(sel.customId.split('_').pop()) === correctIndex) {
              score++;
            }
            resolve();
          });
          qColl.on('end', () => resolve());
        });

        // Verrouiller les boutons
        await qMsg.edit({ components: [] });
      }

      // 6️⃣ Bilan
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

      // Collecteur pour finir
      const fColl = endMsg.createMessageComponentCollector({
        componentType: 2,
        max: 1,
        time: 86_400_000
      });

      fColl.on('collect', async finishBtn => {
        if (finishBtn.user.id !== userId) {
          return finishBtn.reply({ content: '❌ Ce n’est pas pour vous.', ephemeral: true });
        }
        // Retirer le rôle QCM_EN_COURS
        await member.roles.remove(qcRoleId);
        if (passed) {
          await member.roles.add(process.env.CITIZEN_ROLE_ID);
        } else {
          await member.roles.add(oralRoleId);
          // Ici on enregistrerait le timestamp pour le cooldown 24h
        }
        // Déplacer le salon en catégorie QCM_END
        await channel.setParent(endCatId);
        await finishBtn.update({ embeds: [], components: [] });
      });
    });

    // On doit impérativement répondre à l’interaction initiale
    await interaction.reply({
      content: `✅ J'ai créé votre salon privé <#${channel.id}>. Rendez-vous dedans !`,
      ephemeral: true
    });
  }
};
