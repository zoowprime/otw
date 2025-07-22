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
  ComponentType
} = require('discord.js');
const QUESTIONS = require('../data/qcmQuestions.json');

module.exports = (client) => {
  // 1️⃣ Au ready, on poste le panneau de lancement une seule fois
  client.once('ready', async () => {
    const ch = await client.channels.fetch(process.env.QCM_LANCEMENT_CHANNEL);
    if (!ch || !ch.isTextBased()) return console.error('Salon QCM non trouvé');
    // on vérifie qu’on n’a pas déjà posté
    const msgs = await ch.messages.fetch({ limit: 50 });
    if (msgs.some(m => m.components.length && m.components[0].components[0].customId === 'qcm_launcher')) {
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Bonjour !')
      .setDescription(
        `Vous êtes dans le salon pour faire votre QCM, avant toute chose, vous devez connaître les salons suivants pour votre QCM :\n` +
        `<#${process.env.SALON_1}>\n` +
        `<#${process.env.SALON_2}>\n` +
        `<#${process.env.SALON_3}>\n` +
        `<#${process.env.SALON_4}>\n\n` +
        `Une fois cela fait, ouvrez le menu déroulant ci‑dessous et sélectionnez **Débuter le QCM**.`
      )
      .setColor(0xff0000);

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('qcm_launcher')
        .setPlaceholder('Débuter le QCM')
        .addOptions([
          { label: 'Débuter le QCM', value: 'launch' }
        ])
    );

    await ch.send({ embeds: [embed], components: [row] });
  });

  // 2️⃣ Gestion des sélections / menus
  client.on('interactionCreate', async (interaction) => {
    // 🚩 2.1 Le menu de lancement
    if (interaction.isStringSelectMenu() && interaction.customId === 'qcm_launcher') {
      const member = interaction.member;
      // attribution / retrait de rôles
      await member.roles.add(process.env.QCM_EN_COURS);
      await member.roles.remove(process.env.ORAL_A_FAIRE);
      await interaction.reply({ content: '✅ Vous avez reçu le rôle **QCM EN COURS** ! Création du salon…', ephemeral: true });

      // création du salon
      const channel = await interaction.guild.channels.create({
        name: `qcm-${member.user.username}`,
        type: ChannelType.GuildText,
        parent: process.env.QCM_START_CATEGORY,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: member.id,            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          { id: process.env.STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory] }
        ],
      });

      // envoi du menu oui/non de démarrage
      const startEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('Souhaitez‑vous lancer le QCM ?')
        .setDescription('Sélectionnez **Oui** pour démarrer, **Non** pour annuler.');

      const startRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`qcm_start_${member.id}`)
          .setPlaceholder('Votre choix…')
          .addOptions([
            { label: 'Oui', value: 'yes' },
            { label: 'Non', value: 'no' }
          ])
      );

      await channel.send({ embeds: [startEmbed], components: [startRow] });
      return;
    }

    // 🚩 2.2 Le menu oui/non
    if (interaction.isStringSelectMenu()
      && interaction.customId.startsWith('qcm_start_')
    ) {
      const userId = interaction.customId.split('_')[2];
      if (interaction.user.id !== userId) {
        return interaction.reply({ content: '❌ Ce menu n’est pas pour vous.', ephemeral: true });
      }
      const choice = interaction.values[0];
      const channel = interaction.channel;

      // annulation
      if (choice === 'no') {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff0000)
              .setTitle('QCM annulé')
              .setDescription('Vous avez annulé le QCM.')
          ],
          components: []
        });
        const member = await interaction.guild.members.fetch(userId);
        await member.roles.remove(process.env.QCM_EN_COURS);
        await member.roles.add(process.env.ORAL_A_FAIRE);
        return setTimeout(() => channel.delete().catch(() => {}), 10_000);
      }

      // lancement
      await interaction.update({ content: '🎬 Le QCM démarre…', embeds: [], components: [] });

      // on stocke le score dans le channel
      channel.qcmScore = 0;
      // mix des questions
      const pool = QUESTIONS.sort(() => 0.5 - Math.random()).slice(0, 30);

      // pour chaque question, on envoie un menu déroulant
      for (let i = 0; i < pool.length; i++) {
        const q = pool[i];
        const qEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle(`Question ${i+1}`)
          .setDescription(q.question);

        const qRow = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`qcm_q_${userId}_${i}`)
            .setPlaceholder('Votre réponse…')
            .addOptions(q.choices.map((c,idx) => ({ label: c, value: `${idx}` })))
        );

        const qMsg = await channel.send({ embeds: [qEmbed], components: [qRow] });

        // on attend la sélection ou timeout
        const collected = await qMsg.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          time: 120_000
        }).catch(() => null);

        // si bonne réponse
        if (collected
          && collected.user.id === userId
          && q.choices[+collected.values[0]] === q.answer
        ) {
          channel.qcmScore++;
        }
        // on désactive le menu, et on continue
        await qMsg.edit({ components: [] });
      }

      // bilan
      const passed = channel.qcmScore >= 20;
      const endEmbed = new EmbedBuilder()
        .setColor(passed ? 0x00ff00 : 0xff0000)
        .setTitle('QCM terminé')
        .setDescription(
          `Vous avez obtenu **${channel.qcmScore} / 30** réponses correctes.\n` +
          (passed
            ? '🎉 Bravo, vous avez réussi ! Cliquez sur le bouton pour terminer.'
            : '❌ Vous n’avez pas atteint 20 bonnes réponses. Vous pourrez réessayer dans 24h.')
        );

      const endRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`qcm_finish_${userId}`)
          .setLabel('Terminer le QCM')
          .setStyle(ButtonStyle.Primary)
      );

      await channel.send({ embeds: [endEmbed], components: [endRow] });
      return;
    }

    // 🚩 2.3 Le bouton TERMINER
    if (interaction.isButton()
      && interaction.customId.startsWith('qcm_finish_')
    ) {
      const userId = interaction.customId.split('_')[2];
      if (interaction.user.id !== userId) {
        return interaction.reply({ content: '❌ Ce bouton n’est pas pour vous.', ephemeral: true });
      }
      const channel = interaction.channel;
      const score = channel.qcmScore ?? 0;
      const passed = score >= 20;

      // rôles & archivage
      const member = await interaction.guild.members.fetch(userId);
      await member.roles.remove(process.env.QCM_EN_COURS);
      if (passed) {
        await member.roles.add(process.env.CITIZEN_ROLE_ID);
      } else {
        await member.roles.add(process.env.ORAL_A_FAIRE);
      }
      // move du salon
      await channel.setParent(process.env.QCM_END_CATEGORY);

      // feedback final
      await interaction.update({
        content: `✅ <@${userId}> a fait **${score} / 30** au QCM, salon archivé.`,
        embeds: [],
        components: []
      });
      return;
    }
  });
};
