// src/commands/coma.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coma')
    .setDescription('💤 Plonge un joueur dans un coma RP')
    .addUserOption(option =>
      option
        .setName('cible')
        .setDescription('Le joueur à mettre en coma')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('durée')
        .setDescription('Durée du coma (ex: 30m, 2h)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('raison')
        .setDescription('Raison du coma')
        .setRequired(true)
    ),

  async execute(interaction) {
    // 1️⃣ Ack immédiat pour éviter le timeout
    await interaction.deferReply({ ephemeral: false });

    // 2️⃣ Récupération des options
    const cible  = interaction.options.getUser('cible');
    const duree  = interaction.options.getString('durée');
    const raison = interaction.options.getString('raison');

    // 3️⃣ Construction de l’embed
    const embed = new EmbedBuilder()
      .setColor(0xFFFFFF)                         // fond blanc
      .setTitle('💤 État de coma déclenché')
      .setDescription(`${cible} est maintenant en coma RP… Zzz`)
      .addFields(
        { name: '🎯 Joueur concerné', value: `${cible}`, inline: true },
        { name: '⏱️ Durée du coma',    value: duree,      inline: true },
        { name: '❓ Raison du coma',    value: raison,     inline: false },
      )
      .setFooter({ text: 'Ils se réveilleront quand leur temps sera écoulé !' });

    // 4️⃣ Envoi de l’embed (édit de la réponse différée)
    await interaction.editReply({ embeds: [embed] });
  }
};
