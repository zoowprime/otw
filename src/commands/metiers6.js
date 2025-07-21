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
    
// 🏘️ Institutions et économie
      .addFields({
        name: '🏘️ **INSTITUTIONS ET ÉCONOMIE 3**',
        value:
          '**_Agent de transport_**\n' +
          '**Rémunération :** par le directeur\n' +
          '**Paiement :** par livraison\n' +
          '**Salaire :** 10 à 15 $ / session\n' +
          'Danger potentiel selon les trajets.\n\n' +

          '**_Patron d’écurie_**\n' +
          '**Rémunération :** par les ventes / locations de chevaux\n' +
          '**Paiement :** variable, selon fréquentation\n' +
          '**Salaire :** 20 à 35 $ / session\n' +
          'S’il y a du passage, c’est rentable.\n\n' +

          '**_Écuyer / Soigneur_**\n' +
          '**Rémunération :** par le patron\n' +
          '**Paiement :** par session travaillée\n' +
          '**Salaire :** 6 à 10 $ / session\n' +
          'Moins payé, mais très présent RP.\n\n' +

          '**_Contremaître_**\n' +
          '**Rémunération :** par les mines/entreprises\n' +
          '**Paiement :** par journée d’encadrement\n' +
          '**Salaire :** 12 à 18 $ / session\n' +
          'Gère les ouvriers, parfois impliqué dans les conflits sociaux.'
        });

    await interaction.reply({ embeds: [embed] });
  }
};
