// src/commands/metiers2.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('metiers2')
    .setDescription('Affiche la liste des métiers RP disponibles avec leurs rémunérations.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📜 Liste des métiers')
      .setColor(0xFFFFFF)

  // ⚖️ Justice et sécurité
      .addFields({
        name: '⚖️ **JUSTICE ET SÉCURITÉ**',
        value:
          '**_Avocat_**\n' +
          '**Rémunération :** privée (par ses clients)\n' +
          '**Paiement :** à chaque affaire\n' +
          '**Salaire :** 10 à 25 $ / procès\n' +
          'Très variable selon la clientèle. Peut défendre bandits comme innocents.\n\n' +

          '**_Marshall_**\n' +
          '**Rémunération :** par l’État fédéral\n' +
          '**Paiement :** à chaque opération ou mission\n' +
          '**Salaire :** 25 $ / session\n' +
          'Mobilisé sur des grandes affaires, missions longues.\n\n' +

          '**_Adjoint Marshall_**\n' +
          '**Rémunération :** par l’État\n' +
          '**Paiement :** à chaque mission\n' +
          '**Salaire :** 15 $ / session\n' +
          'Bras armé du Marshall, terrain et traque.\n\n' +

          '**_Shérif_**\n' +
          '**Rémunération :** municipalité\n' +
          '**Paiement :** à chaque session\n' +
          '**Salaire :** 20 $ / session\n' +
          'Gère l’ordre local, très exposé, payé localement.\n\n' +

          '**_Adjoint Shérif_**\n' +
          '**Rémunération :** municipalité\n' +
          '**Paiement :** à chaque service\n' +
          '**Salaire :** 10 à 15 $ / session\n' +
          'Intervient souvent, mais reste sous ordres.\n\n' +

          '**_Représentant de la loi_**\n' +
          '**Rémunération :** municipalité\n' +
          '**Paiement :** selon implication\n' +
          '**Salaire :** 8 à 12 $ / session\n' +
          'Statut plus flexible, souvent temporaire.\n\n' +

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
