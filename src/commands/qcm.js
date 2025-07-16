// src/commands/qcm.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField
} = require('discord.js');
require('dotenv').config({ path: './id.env' });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('qcm')
    .setDescription('Démarre votre QCM privé'),

  async execute(interaction) {
    // 1️⃣ Vérifier que le joueur a bien le rôle QCM_EN_COURS
    const qcmRoleId = process.env.QCM_EN_COURS;
    if (!interaction.member.roles.cache.has(qcmRoleId)) {
      return interaction.reply({
        content: `❌ Vous devez avoir le rôle <@&${qcmRoleId}> pour lancer le QCM.`,
        flags: 64
      });
    }

    // 2️⃣ Créer un salon privé sous la catégorie de démarrage
    const categoryId = process.env.QCM_START_CATEGORY;
    const qcmChannel = await interaction.guild.channels.create({
      name: `qcm-${interaction.user.username}`,
      type: 0, // textuel
      parent: categoryId,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: process.env.STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    // 3️⃣ Envoyer le menu “Souhaitez‑vous lancer le QCM ?”
    const startEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('Souhaitez-vous lancer le QCM ?')
      .setDescription('Sélectionnez **Oui** pour démarrer, **Non** pour annuler.');

    const startMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`qcm_start_${interaction.user.id}`)
        .setPlaceholder('Choisissez une option…')
        .addOptions([
          { label: 'Oui',  value: 'oui'  },
          { label: 'Non',  value: 'non'  },
        ])
    );

    const startMessage = await qcmChannel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [startEmbed],
      components: [startMenu]
    });

    await interaction.reply({
      content: `✅ Votre salon QCM a été créé : ${qcmChannel}`,
      flags: 64
    });

    // 4️⃣ Collector pour gérer “oui” / “non”
    const collector = startMessage.createMessageComponentCollector({
      componentType: 3 // StringSelect
    });

    collector.on('collect', async i => {
      // a) On accepte seulement cet utilisateur
      if (!i.customId.startsWith('qcm_start_')) return;
      const [, , allowedId] = i.customId.split('_');
      if (i.user.id !== allowedId) {
        return i.reply({ content: "❌ Ce menu n'est pas pour vous.", flags: 64 });
      }

      const choice = i.values[0];
      if (choice === 'non') {
        // Annulation
        await i.update({
          content: '❌ Vous avez annulé le QCM.',
          embeds: [],
          components: []
        });
        // on peut supprimer le salon si on veut
        return qcmChannel.delete().catch(() => {});
      }

      // choice === 'oui' → on lance la première question
      // Exemple de question — à remplacer par votre fichier de questions
      const questions = [
        { q: "Qui a découvert l'île de Belleshore ?",        choices: ["Edmond Bellerive","Edmond Dantès","Joshua Bellerive"], answer: 0 },
        { q: "Quand l'île Belleshore a été découverte ?",     choices: ["1497","1789","1527"], answer: 2 },
        /* … vos 30 questions … */
      ];

      let current = 0;
      let score = 0;

      // Fonction récursive pour poser une question
      const askQuestion = async () => {
        const { q, choices, answer } = questions[current];
        const embedQ = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle(`Question ${current+1}`)
          .setDescription(q);

        const menuQ = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`qcm_question_${interaction.user.id}_${current}`)
            .setPlaceholder('Choisissez une réponse…')
            .addOptions(
              choices.map((label, idx) => ({
                label,
                value: String(idx)
              }))
            )
        );

        const msg = await startMessage.edit({
          content: null,
          embeds: [embedQ],
          components: [menuQ]
        });

        const qc = msg.createMessageComponentCollector({
          componentType: 3,
          time: 2 * 60 * 1000, // 2 min
          max: 1
        });

        qc.on('collect', async sel => {
          const [, , userId, qIndex] = sel.customId.split('_');
          if (sel.user.id !== userId) {
            return sel.reply({ content: "❌ Vous ne pouvez pas répondre ici.", flags: 64 });
          }
          const choiceIdx = Number(sel.values[0]);
          if (choiceIdx === answer) score++;
          current++;
          if (current < questions.length) {
            await sel.update({ content: null, embeds: [], components: [] });
            return askQuestion();
          }
          // Fin du QCM
          await sel.update({ content: null, embeds: [], components: [] });
          collector.stop();
          return finishQCM();
        });

        qc.on('end', collected => {
          if (collected.size === 0) {
            // Timeout → on passe à la suivante
            current++;
            if (current < questions.length) return askQuestion();
            return finishQCM();
          }
        });
      };

      // Fonction de clôture du QCM
      const finishQCM = async () => {
        const passed = score >= 20;
        const embedF = new EmbedBuilder()
          .setColor(passed ? 0x00ff00 : 0xff0000)
          .setTitle(`QCM terminé – Score : ${score}/${questions.length}`)
          .setDescription(passed
            ? "🎉 Félicitations, vous avez réussi ! Cliquez sur **Terminer le QCM**."
            : "❌ Vous n'avez pas obtenu le score requis. Réessayez dans 24 h.")
          ;

        const rowF = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`qcm_finish_${interaction.user.id}`)
            .setPlaceholder('Terminer le QCM…')
            .addOptions([
              { label: 'Terminer le QCM', value: 'termine' }
            ])
        );

        const endMsg = await startMessage.edit({
          content: null,
          embeds: [embedF],
          components: [rowF]
        });

        const fc = endMsg.createMessageComponentCollector({ componentType: 3, max: 1, time: 5*60*1000 });

        fc.on('collect', async fin => {
          if (fin.user.id !== interaction.user.id) {
            return fin.reply({ content: "❌ Ce menu n'est pas pour vous.", flags: 64 });
          }
          // Retirer rôle QCM_EN_COURS
          await interaction.member.roles.remove(qcmRoleId);
          if (passed) {
            // Attribuer le citoyen
            await interaction.member.roles.add(process.env.CITIZEN_ROLE_ID);
          } else {
            // Retirer le role et donner ORAL_A_FAIRE
            await interaction.member.roles.add(process.env.ORAL_A_FAIRE);
            // TODO : mettre en cooldown 24 h
          }
          // Déplacer le salon en catégorie QCM_END_CATEGORY
          await qcmChannel.setParent(process.env.QCM_END_CATEGORY);
          await fin.update({ content: "✅ QCM terminé, salon archivé.", embeds: [], components: [] });
        });
      };

      // Lance la boucle
      return askQuestion();
    });
  }
};
