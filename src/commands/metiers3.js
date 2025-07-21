// src/commands/metiers3.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('metiers3')
    .setDescription('Affiche la liste des métiers RP disponibles avec leurs rémunérations.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📜 Liste des métiers')
      .setColor(0xFFFFFF)

    // ⚖️ Justice et sécurité
      .addFields({
        name: '⚖️ **JUSTICE ET SÉCURITÉ²**',
        value:
          '**_Directeur BFRS_**\n' +
          '**Rémunération :** par l’État\n' +
          '**Paiement :** à chaque grande opération\n' +
          '**Salaire :** 35 à 40 $ / session\n' +
          'Hautement stratégique, très bien payé.\n\n' +

          '**_BFRS – Section Alpha (Renseignement)_**\n' +
          '**Rémunération :** par l’État\n' +
          '**Paiement :** à chaque mission/filature\n' +
          '**Salaire :** 20 à 25 $ / session\n' +
          'Agents discrets, parfois infiltrés. Risque élevé, paiement secret.\n\n' +

          '**_Milice nationale_**\n' +
          '**Rémunération :** par l’État (ou gouverneur selon contexte)\n' +
          '**Paiement :** à chaque mobilisation\n' +
          '**Salaire :** 10 à 15 $ / session\n' +
          'Moins stable, souvent mobilisé lors de crises.\n\n' +

          '**_Garde du corps_**\n' +
          '**Rémunération :** privée\n' +
          '**Paiement :** selon le contrat ou jour de service\n' +
          '**Salaire :** 10 à 20 $ / session\n' +
          'Peut varier selon la notoriété du client.'
      });

    await interaction.reply({ embeds: [embed] });
  }
};
