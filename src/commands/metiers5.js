// src/commands/metiers5.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('metiers5')
    .setDescription('Affiche la liste des métiers RP disponibles avec leurs rémunérations.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📜 Liste des métiers')
      .setColor(0xFFFFFF)

// 🏘️ Institutions et économie
      .addFields({
        name: '🏘️ **INSTITUTIONS ET ÉCONOMIE 3**',
        value:
          '**_Patron armurerie_**\n' +
          '**Rémunération :** par les ventes\n' +
          '**Paiement :** quotidienne selon flux\n' +
          '**Salaire :** 15 à 30 $ / session\n' +
          'Dépend fortement de la demande en armes.\n\n' +

          '**_Armurier_**\n' +
          '**Rémunération :** par le patron\n' +
          '**Paiement :** par session travaillée\n' +
          '**Salaire :** 8 à 12 $ / session\n' +
          'Main d’œuvre qualifiée.\n\n' +

          '**_Patron d’agence de transport_**\n' +
          '**Rémunération :** par contrat (état, privé)\n' +
          '**Paiement :** à chaque livraison/mission\n' +
          '**Salaire :** 20 à 40 $ / mission\n' +
          'Peut négocier avec le gouvernement ou des entreprises.'
        });

    await interaction.reply({ embeds: [embed] });
  }
};
