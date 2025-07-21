// src/commands/metiers6.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('metiers6')
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
          'Peut gagner plus selon la réputation.\n\n' +

          '**_Directeur de cabinet de journalisme_**\n' +
          '**Rémunération :** selon ventes ou subventions\n' +
          '**Paiement :** hebdo ou à la publication\n' +
          '**Salaire :** 15 à 25 $ / session\n' +
          'Peut être influent s’il crée l’actualité.\n\n' +

          '**_Journaliste_**\n' +
          '**Rémunération :** par article publié\n' +
          '**Paiement :** à chaque reportage\n' +
          '**Salaire :** 5 à 15 $ / article\n' +
          'Très RP, dépend du rythme d’écriture.\n\n' +

          '**_Patron de distillerie_**\n' +
          '**Rémunération :** par les ventes d’alcool\n' +
          '**Paiement :** par session active\n' +
          '**Salaire :** 20 à 35 $ / session\n' +
          'Illégal ou non, grosse marge possible.\n\n' +

          '**_Distillateur_**\n' +
          '**Rémunération :** par le patron\n' +
          '**Paiement :** à la production\n' +
          '**Salaire :** 8 à 12 $ / session\n' +
          'Peut aussi participer à des missions de contrebande.'
        });

    await interaction.reply({ embeds: [embed] });
  }
};
