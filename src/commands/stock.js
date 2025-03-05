// src/commands/stock.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

/**
 * Dictionnaire de tous vos items disponibles, avec leurs prix unitaires (en dollars).
 * Les clés sont des identifiants uniques (pas d'espaces, ni d'accents).
 * Les valeurs sont des nombres (prix).
 *
 * Vous pouvez organiser vos items par catégories (armes, chevaux, alcools, etc.),
 * mais au final, ils sont rassemblés ici pour être listés dans un Select Menu.
 */
const availableItems = {
  // --- Armes ---
  "cattleman_revolver": 18.50,
  "navy_revolver": 18.00,
  "double_action_revolver": 19.00,
  "schofield_revolver": 20.50,
  "lemat_revolver": 25.25,
  "volcanic_pistol": 18.50,
  "litchfield_rifle": 26.25,
  "evans_rifle": 32.25,
  "lancaster_rifle": 32.25,
  "carabine_a_repetition": 32.25,
  "fusil_a_petit_gibier": 15.25,
  "fusil_springfield": 19.75,
  "fusil_a_verrou": 26.25,

  // --- Chevaux : American Paint (Achat en ranch) ---
  "american_paint_tobiano": 100.00,
  "american_paint_overo": 100.00,
  "american_paint_balzane": 110.00,
  "american_paint_overo_gris": 120.00,

  // Appaloosa (Achat en ranch)
  "appaloosa_cape_leopard": 100.00,
  "appaloosa_capee": 100.00,
  "appaloosa_leopard": 120.00,
  "appaloosa_leopard_brun": 120.00,

  // Hollandais à Sang Chaud (Importation)
  "hollandais_isabelle_sooty": 110.00,
  "hollandais_noir_pangare": 110.00,
  "hollandais_rouan_chocolat": 115.00,

  // Chevaux de Guerre (Achat en ranch)
  "ardennais_bai_rouanne": 90.00,
  "ardennais_rouan_fraise": 90.00,

  // Andalou (Élevage)
  "andalou_bai_brun": 80.00,
  "andalou_alezan_grisonnant": 80.00,
  "andalou_perlino": 80.00,

  // Demi-Sang Hongrois (Achat en ranch)
  "demi_sang_hongrois_alezan_crins_laves": 80.00,
  "demi_sang_hongrois_pie_tobiano": 80.00,

  // Mustang (Achat en ranch)
  "mustang_bai_sauvage": 30.00,
  "mustang_grullo": 30.00,
  "mustang_bai_tigre": 40.00,
  "mustang_isabelle": 250.00,
  "mustang_tovero_alezan": 250.00,
  "mustang_overo_alezan_dun": 250.00,
  "mustang_overo_noir": 300.00,

  // Chevaux Polyvalents (Importation)
  "pinto_pommele_silver": 350.00,
  "champagne_ambre": 350.00,
  "tovero_noir": 500.00,
  "gris_pommele": 550.00,
  "isabelle_bringee": 550.00,
  "noir_rouanne": 550.00,

  // Breton (Achat en ranch)
  "breton_oseille": 40.00,
  "breton_rubican": 40.00,
  "breton_grullo": 250.00,
  "breton_pangare": 250.00,
  "breton_bai_pommele_pangare": 550.00,
  "breton_gris_fer": 550.00,

  // Turkoman (Importation)
  "turkoman_bai_brun": 500.00,
  "turkoman_argente": 550.00,
  "turkoman_dore": 550.00,
  "turkoman_alzane": 600.00,
  "turkoman_gris": 600.00,
  "turkoman_noir": 650.00,
  "turkoman_perlino": 600.00,

  // Criollo (Élevage)
  "criollo_dun": 40.00,
  "criollo_noir_rouanne": 40.00,
  "criollo_bai_bringe": 250.00,
  "criollo_overo_oseille": 250.00,
  "criollo_frame_overo": 550.00,
  "criollo_sabino_marmore": 550.00,

  // Cob Gypsy Pie (Achat en ranch)
  "cheval_du_kentucky": 50.00,
  "cheval_morgan": 50.00,
  "cheval_tennessee_walker": 40.00,

  // Chevaux de Trait (Élevage)
  "cheval_belge": 80.00,
  "cheval_shire": 80.00,
  "cheval_suffolk_punch": 70.00,
  "trait_pie": 40.00,
  "trait_blagdon_blanc": 40.00,
  "trait_skewbald": 250.00,
  "trait_blagdon_palomino": 250.00,
  "trait_bai_balzan": 550.00,
  "trait_pie_balzan": 550.00,

  // Chevaux de Course (Importation)
  "chevaux_course_noir_rouanne": 100.00,
  "chevaux_course_rouan_blanc": 100.00,
  "chevaux_course_rouan_pommele_inverse": 100.00,

  // Pur-Sang
  "pur_sang_bai_acajou": 150.00,
  "pur_sang_bringee": 150.00,
  "pur_sang_gris_pommele": 150.00,

  // Trotteur Américain
  "trotteur_americain_isabelle": 150.00,
  "trotteur_americain_noir": 150.00,
  "trotteur_americain_palomino_pommele": 150.00,
  "trotteur_americain_isabelle_queue_argentee": 150.00,
  "trotteur_americain_gris_pommele_fonce": 90.00,

  // Pur-Sang Arabe (Importation)
  "pur_sang_arabe_noir": 700.00,
  "pur_sang_arabe_blanc": 650.00,
  "pur_sang_arabe_rouge": 600.00,

  // Charette (Importation)
  "charette_chasseur_de_prime": 700.00,
  "charette_de_commerce": 400.00,

  // Vins
  "vin_parisien_bouteille": 12.00,
  "vin_parisien_tonneau": 1800.00,
  "vin_bordelais_bouteille": 15.00,
  "vin_bordelais_tonneau": 2200.00,
  "champagne_bouteille": 20.00,
  "champagne_tonneau": 3000.00,

  // Whiskys
  "whisky_anglais_bouteille": 15.00,
  "whisky_anglais_tonneau": 2500.00,
  "whisky_ecossais_bouteille": 18.00,
  "whisky_ecossais_tonneau": 3500.00,
  "whisky_irlandais_bouteille": 14.00,
  "whisky_irlandais_tonneau": 2000.00,

  // Autres alcools
  "sake_bouteille": 10.00,
  "sake_tonneau": 1500.00,
  "rhum_barbade_bouteille": 12.00,
  "rhum_barbade_tonneau": 1800.00,
  "cognac_francais_bouteille": 18.00,
  "cognac_francais_tonneau": 3000.00,

  // Bières
  "biere_blonde_irlandaise_bouteille": 1.50,
  "biere_blonde_irlandaise_tonneau": 70.00,
  "biere_blonde_americaine_bouteille": 1.20,
  "biere_blonde_americaine_tonneau": 60.00,
  "biere_blonde_belleshore_bouteille": 1.00,
  "biere_blonde_belleshore_tonneau": 50.00,

  "biere_rouge_louisianaise_bouteille": 1.50,
  "biere_rouge_louisianaise_tonneau": 50.00,
  "biere_rouge_belleshore_bouteille": 1.00,
  "biere_rouge_belleshore_tonneau": 50.00,
  "biere_rouge_guarma_bouteille": 1.25, // ~1.00 - 1.50, on choisit 1.25
  "biere_rouge_guarma_tonneau": 70.00,

  "biere_blanche_louisianaise_bouteille": 1.50,
  "biere_blanche_louisianaise_tonneau": 70.00,
  "biere_blanche_belleshore_bouteille": 1.00,
  "biere_blanche_belleshore_tonneau": 50.00,
  "biere_blanche_guatemala_bouteille": 1.50,
  "biere_blanche_guatemala_tonneau": 70.00,

  // Spiritueux
  "bourbon_kentucky_bouteille": 2.50,
  "bourbon_kentucky_tonneau": 400.00,
  "rhum_guarma_bouteille": 2.50,
  "rhum_guarma_tonneau": 500.00,
  "rhum_antilles_bouteille": 5.00,
  "rhum_antilles_tonneau": 600.00,
  "whisky_belleshore_bouteille": 1.00,
  "whisky_belleshore_tonneau": 100.00,
  "whisky_americain_bouteille": 3.00,
  "whisky_americain_tonneau": 500.00,
  "whisky_louisiane_bouteille": 0.50,
  "whisky_louisiane_tonneau": 70.00,
  "tequila_mexique_bouteille": 3.00,
  "tequila_mexique_tonneau": 500.00,
};

/**
 * Déclaration de la commande slash "/stock add"
 * qui affiche un menu pour sélectionner un item à ajouter au stock.
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('stock')
    .setDescription('Gérer le stock via un menu interactif.')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Ajouter un item au stock (menu interactif).')
    ),

  async execute(interaction) {
    // On vérifie la sous-commande => /stock add
    if (interaction.options.getSubcommand() === 'add') {
      // On crée un tableau d'options (label + value) pour le Select Menu
      const options = Object.entries(availableItems).map(([key, price]) => {
        return {
          label: `${key} ($${price.toFixed(2)})`,
          value: key,
        };
      });

      // Construction du Select Menu
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('stock_select_item')
        .setPlaceholder('Choisissez un item à ajouter...')
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      // Répond à l'interaction initiale (ephemeral = true => visible seulement par l'utilisateur)
      await interaction.reply({
        content: 'Sélectionnez l’item que vous souhaitez ajouter au stock :',
        components: [row],
        ephemeral: true,
      });
    }
  },
};
