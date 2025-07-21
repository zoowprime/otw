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
      })

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
      })

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
          'Moins stable mais lucratif si RP dynamique.\n\n' +

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
          'Peut négocier avec le gouvernement ou des entreprises.\n\n' +

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
      })

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
