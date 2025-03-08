// src/commands/ci.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ci')
    .setDescription('Recensement civil de l’état de Belleshore')
    .addStringOption(option =>
      option.setName('nom')
        .setDescription('Votre nom')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('prenom')
        .setDescription('Votre prénom')
        .setRequired(true)
    )
    .addUserOption(option =>
      option.setName('telegramme')
        .setDescription('Mentionnez votre compte (Télégramme)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('sexe')
        .setDescription('Votre sexe')
        .setRequired(true)
        // Vous pouvez proposer des choix
        .addChoices(
          { name: 'homme', value: 'homme' },
          { name: 'femme', value: 'femme' }
        )
    )
    .addStringOption(option =>
      option.setName('datenaissance')
        .setDescription('Votre date de naissance (ex: 07/03/2025)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('lieunais')
        .setDescription('Votre lieu de naissance')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('nationalite')
        .setDescription('Votre nationalité')
        .setRequired(true)
    )
    .addAttachmentOption(option =>
      option.setName('photo')
        .setDescription('Insérez une photo')
        .setRequired(true)
    ),
    
  async execute(interaction) {
    // Récupération des options
    const nom = interaction.options.getString('nom');
    const prenom = interaction.options.getString('prenom');
    const telegramme = interaction.options.getUser('telegramme');
    const sexe = interaction.options.getString('sexe');
    const dateNaissance = interaction.options.getString('datenaissance');
    const lieuNaissance = interaction.options.getString('lieunais');
    const nationalite = interaction.options.getString('nationalite');
    const photo = interaction.options.getAttachment('photo');

    // Création de l'embed avec la couleur rouge
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("Recensement civil de l'état de Belleshore")
      .setDescription(
        `**Nom :** ${nom}\n` +
        `**Prénom :** ${prenom}\n` +
        `**Télégramme :** ${telegramme}\n` +
        `**Sexe :** ${sexe}\n` +
        `**Date de naissance :** ${dateNaissance}\n` +
        `**Lieu de naissance :** ${lieuNaissance}\n` +
        `**Nationalité :** ${nationalite}`
      )
      .setImage(photo.url);

    // Réponse à l'interaction
    await interaction.reply({ embeds: [embed] });
  },
};
