// src/commands/metiers7.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('metiers7')
    .setDescription('Affiche la liste des métiers RP disponibles avec leurs rémunérations.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📜 Liste des métiers')
      .setColor(0xFFFFFF)

  // 🍻 Commerce et presse
      .addFields({
        name: '🍻 **COMMERCE ET PRESSE**',
        value:
          '**_Propriétaire d’un saloon_**\n' +
          '**Rémunération :** par les ventes et pourboires\n' +
          '**Paiement :** quotidienne\n' +
          '**Salaire :** 25 à 40 $ / session\n' +
          'Peut faire fortune si lieu vivant RP.\n\n' +

          '**_Barman_**\n' +
          '**Rémunération :** par le patron + pourboires\n' +
          '**Paiement :** à chaque session travaillée\n' +
          '**Salaire :** 8 à 12 $ / session\n' +
          'Très RP, souvent cœur du jeu social.\n\n' +

          '**_Médecin_**\n' +
          '**Rémunération :** par les patients ou la ville\n' +
          '**Paiement :** à l’acte\n' +
          '**Salaire :** 10 à 20 $ / session\n' +
          'Peut gagner plus selon la réputation.'
        });

    await interaction.reply({ embeds: [embed] });
  }
};
