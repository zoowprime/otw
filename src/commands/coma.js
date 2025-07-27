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
        .setName('duree')      // ← plus d’accent !
        .setDescription('Durée du coma (ex : 30m, 2h)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('raison')
        .setDescription('Raison du coma')
        .setRequired(true)
    ),

  async execute(interaction) {
    // Ack immédiat
    await interaction.deferReply();

    // Récupère les options
    const cible  = interaction.options.getUser('cible');
    const duree  = interaction.options.getString('duree');
    const raison = interaction.options.getString('raison');

    // Construit l’embed
    const embed = new EmbedBuilder()
      .setColor(0xFFFFFF) // fond blanc
      .setTitle('💤 État de coma déclenché')
      .setDescription(`${cible} est maintenant en coma RP… Zzz`)
      .addFields(
        { name: '🎯 Joueur concerné', value: `<@${cible.id}>`, inline: true },
        { name: '⏱️ Durée du coma',    value: duree,                inline: true },
        { name: '❓ Raison du coma',    value: raison,               inline: false }
      )
      .setFooter({ text: 'Ils se réveilleront quand leur temps sera écoulé !' });

    // Envoi
    await interaction.editReply({ embeds: [embed] });
  }
};
