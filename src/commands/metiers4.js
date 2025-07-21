// src/commands/metiers4.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('metiers4')
    .setDescription('Affiche la liste des métiers RP disponibles avec leurs rémunérations.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📜 Liste des métiers')
      .setColor(0xFFFFFF)

// 🏘️ Institutions et économie
      .addFields({
        name: '🏘️ **INSTITUTIONS ET ÉCONOMIE**',
        value:
          '**_Maire_**\n' +
          '**Rémunération :** municipalité\n' +
          '**Paiement :** hebdomadaire ou par session si actif\n' +
          '**Salaire :** 20 à 30 $ / session\n' +
          'Gère la ville, reçoit parfois des pots‑de‑vin RP.\n\n' +

          '**_Banquier_**\n' +
          '**Rémunération :** par les profits de la banque\n' +
          '**Paiement :** en fonction des transactions\n' +
          '**Salaire :** 15 à 25 $ / session\n' +
          'Peut s’enrichir fortement avec les emprunts, placements.\n\n' +

          '**_Directeur d’agence immobilière_**\n' +
          '**Rémunération :** par commissions sur ventes\n' +
          '**Paiement :** à chaque transaction RP\n' +
          '**Salaire :** 20 à 50 $ / vente\n' +
          'Gros gains mais dépend des clients.\n\n' +

          '**_Agent immobilier_**\n' +
          '**Rémunération :** par commission\n' +
          '**Paiement :** à la vente ou la location\n' +
          '**Salaire :** 10 à 25 $ / transaction\n' +
          'Moins stable mais lucratif si RP dynamique.'
        });

    await interaction.reply({ embeds: [embed] });
  }
};
