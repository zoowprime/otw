// src/commands/metiers.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('metiers')
    .setDescription('Affiche la liste des métiers RP disponibles avec leurs rémunérations.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📜 Liste des métiers')
      .setColor(0xFFFFFF)

      // 🏛️ Gouvernement
      .addFields({
        name: '🏛️ **FONCTIONNEMENT GOUVERNEMENTAL**',
        value:
          '**_Gouverneur(se)_**\n' +
          '**Rémunération :** par l’État\n' +
          '**Paiement :** à chaque session (ou hebdo si peu actif)\n' +
          '**Salaire :** 35 $ / session\n' +
          'Rôle central, très exposé. Peut toucher des primes s’il est actif sur le terrain.\n\n' +

          '**_Vice‑Gouverneur(se)_**\n' +
          '**Rémunération :** par l’État\n' +
          '**Paiement :** selon présence ou missions\n' +
          '**Salaire :** 25 $ / session\n' +
          'Moins présent publiquement, mais gère l’administratif.\n\n' +

          '**_Juge_**\n' +
          '**Rémunération :** par l’État\n' +
          '**Paiement :** à chaque audience ou session\n' +
          '**Salaire :** 20 à 30 $ / session\n' +
          'Très respecté, rare mais décisif. Possibilité de primes.\n\n' +

          '**_Député_**\n' +
          '**Rémunération :** par l’État\n' +
          '**Paiement :** selon activité ou réunions publiques\n' +
          '**Salaire :** 15 à 20 $ / session\n' +
          'Porte‑parole du peuple, rarement très riche mais influent.\n\n' +

          '**_Porte‑parole gouvernemental_**\n' +
          '**Rémunération :** par l’État\n' +
          '**Paiement :** selon apparitions publiques\n' +
          '**Salaire :** 15 $ / session\n' +
          'Plus politique que terrain, dépend du nombre de discours/déclarations.'
        });

    await interaction.reply({ embeds: [embed] });
  }
};
