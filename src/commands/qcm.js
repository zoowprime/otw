// src/commands/qcm.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('qcm')
    .setDescription('Démarre votre QCM (nécessite le rôle QCM EN COURS).'),
  async execute(interaction) {
    const member = interaction.member;
    if (!member.roles.cache.has(process.env.QCM_EN_COURS)) {
      return interaction.reply({ content: "❌ Vous devez avoir le rôle QCM EN COURS.", ephemeral: true });
    }

    // 1️⃣ Création du salon privé dans la catégorie QCM_START_CATEGORY
    const channel = await interaction.guild.channels.create({
      name: `qcm-${member.user.username}`,
      parent: process.env.QCM_START_CATEGORY,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: ['ViewChannel'] },
        { id: member.id, allow: ['ViewChannel','SendMessages','ReadMessageHistory'] },
        { id: process.env.STAFF_ROLE_ID, allow: ['ViewChannel','ReadMessageHistory'] }
      ]
    });

    // 2️⃣ Prompt initial
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("Souhaitez‑vous lancer le QCM ?")
      .setDescription("Sélectionnez **Oui** pour débuter, **Non** pour annuler et revenir en arrière.");

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`qcm_start_${member.id}`)
      .setPlaceholder('Choisissez une option…')
      .addOptions([
        { label: 'Oui', value: 'oui' },
        { label: 'Non', value: 'non' }
      ]);

    await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
    await interaction.reply({ content: `📍 Votre QCM a été créé : ${channel}`, ephemeral: true });
  }
};
