// src/commands/session.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Stockage temporaire en mémoire pour les votes
const presenceData = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setDescription('Crée une session de RP avec les informations de date, horaire et psn du lanceur.')
    .addStringOption(option =>
      option.setName('date').setDescription('La date de la session (ex. vendredi 07 mars 2025)').setRequired(true))
    .addStringOption(option =>
      option.setName('horaire').setDescription('L\'horaire de la session (ex. 19h30)').setRequired(true))
    .addStringOption(option =>
      option.setName('psn').setDescription('Le PSN du lanceur').setRequired(true)),

  async execute(interaction) {
    const sessionDate = interaction.options.getString('date');
    const sessionHoraire = interaction.options.getString('horaire');
    const sessionPsn = interaction.options.getString('psn');

    const citizenRoleId = '1308118795285565530';
    const sessionId = `${interaction.channelId}-${Date.now()}`;

    // Structure des présences
    presenceData.set(sessionId, {
      present: new Set(),
      late: new Set(),
      unsure: new Set(),
      absent: new Set()
    });

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('Session Roleplay Old Town Western')
      .setDescription(`**${sessionDate}**\n\n**Horaire :** ${sessionHoraire}\n**Psn du lanceur :** ${sessionPsn}\n\n✅ = oui\n🕦 = en retard\n🤷 = je ne sais pas\n❌ = non plus\n\nMerci de voter afin de nous indiquer votre présence, l’abstention est autorisée mais a une limite, si elle n’est pas respectée vous redevrez passer votre candidature.`);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`present_${sessionId}`).setLabel('✅').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`late_${sessionId}`).setLabel('🕦').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`unsure_${sessionId}`).setLabel('🤷').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`absent_${sessionId}`).setLabel('❌').setStyle(ButtonStyle.Danger)
    );

    const mention = `<@&${citizenRoleId}>`;
    const message = await interaction.reply({ content: mention, embeds: [embed], components: [buttons], fetchReply: true });

    const collector = message.createMessageComponentCollector({ time: 86400000 }); // 24h

    collector.on('collect', async i => {
      const userId = i.user.id;
      const username = `<@${userId}>`;
      const data = presenceData.get(sessionId);

      // Supprimer l'utilisateur de tous les ensembles
      for (const key of ['present', 'late', 'unsure', 'absent']) {
        data[key].delete(username);
      }

      // Ajouter à la bonne catégorie
      if (i.customId.startsWith('present_')) data.present.add(username);
      if (i.customId.startsWith('late_')) data.late.add(username);
      if (i.customId.startsWith('unsure_')) data.unsure.add(username);
      if (i.customId.startsWith('absent_')) data.absent.add(username);

      // Création du texte de présence
      const formatList = (set) => set.size > 0 ? Array.from(set).join(' ') : 'Aucun';
      const newDescription = `**${sessionDate}**\n\n**Horaire :** ${sessionHoraire}\n**Psn du lanceur :** ${sessionPsn}\n\n✅ = oui\n🕦 = en retard\n🤷 = je ne sais pas\n❌ = non plus\n\nMerci de voter afin de nous indiquer votre présence, l’abstention est autorisée mais a une limite, si elle n’est pas respectée vous redevrez passer votre candidature.\n\n` +
        `**Membres présents (${data.present.size}) :**\n${formatList(data.present)}\n\n` +
        `**Membres en retard (${data.late.size}) :**\n${formatList(data.late)}\n\n` +
        `**Membres indécis (${data.unsure.size}) :**\n${formatList(data.unsure)}\n\n` +
        `**Membres absents (${data.absent.size}) :**\n${formatList(data.absent)}`;

      const updatedEmbed = EmbedBuilder.from(embed).setDescription(newDescription);

      await i.update({ embeds: [updatedEmbed], components: [buttons] });
    });
  }
};
