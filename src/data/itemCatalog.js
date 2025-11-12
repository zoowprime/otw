// src/data/itemCatalog.js
// Métadonnées des items (poids, stackable/consumable, effets RP)
// → Les ids doivent correspondre aux noms de fichiers d’icônes : src/assets/icones/<id>.png

module.exports = {
  // =========================================================
  // CONSOMMABLES
  // =========================================================
  alcool_bouteille: {
    id: "alcool_bouteille", label: "Bouteille d’alcool",
    weight: 0.75, stackable: true, consumable: true,
    effect: { thirstDelta: +35 }, emoji: "🍾",
  },
  conserve_nourriture: {
    id: "conserve_nourriture", label: "Boîte de conserve",
    weight: 0.20, stackable: true, consumable: true,
    effect: { hungerDelta: +50 }, emoji: "🥫",
  },
  pommade: {
    id: "pommade", label: "Pommade pour cheveux",
    weight: 0.10, stackable: true, consumable: true,
    effect: {}, emoji: "💈",
  },

  // =========================================================
  // OUTILS / AUTRES
  // =========================================================
  kit_crochetage: {
    id: "kit_crochetage", label: "Kit de crochetage",
    weight: 0.10, stackable: true, consumable: false, emoji: "🗝️",
  },
  lasso: {
    id: "lasso", label: "Lasso",
    weight: 0.80, stackable: false, consumable: false, emoji: "🪢",
  },
  cisaille: {
    id: "cisaille", label: "Cisaille",
    weight: 1.20, stackable: false, consumable: false, emoji: "✂️",
  },
  couteau: {
    id: "couteau", label: "Couteau",
    weight: 0.40, stackable: false, consumable: false, emoji: "🔪",
  },
  couteau_de_chasse: {
    id: "couteau_de_chasse", label: "Couteau de chasse",
    weight: 0.50, stackable: false, consumable: false, emoji: "🗡️",
  },
  couteau_de_lancer: {
    id: "couteau_de_lancer", label: "Couteau de lancer",
    weight: 0.30, stackable: true, consumable: false, emoji: "🗡️",
  },
  marteau: {
    id: "marteau", label: "Marteau",
    weight: 1.00, stackable: false, consumable: false, emoji: "🔨",
  },
  hachette: {
    id: "hachette", label: "Hachette",
    weight: 1.40, stackable: false, consumable: false, emoji: "🪓",
  },
  hache: {
    id: "hache", label: "Hache",
    weight: 2.50, stackable: false, consumable: false, emoji: "🪓",
  },
  machette: {
    id: "machette", label: "Machette",
    weight: 1.20, stackable: false, consumable: false, emoji: "🔪",
  },

  // =========================================================
  // ARMES LÉGALES (catalogWeapons.js)
  // =========================================================
  revolver_cattleman: {
    id: "revolver_cattleman", label: "Revolver Cattleman",
    weight: 1.00, stackable: false, consumable: false, emoji: "🔫",
  },
  revolver_navy: {
    id: "revolver_navy", label: "Revolver Navy",
    weight: 1.05, stackable: false, consumable: false, emoji: "🔫",
  },
  revolver_double_action: {
    id: "revolver_double_action", label: "Revolver Double Action",
    weight: 1.05, stackable: false, consumable: false, emoji: "🔫",
  },
  revolver_schofield: {
    id: "revolver_schofield", label: "Revolver Schofield",
    weight: 1.10, stackable: false, consumable: false, emoji: "🔫",
  },
  revolver_lemat: {
    id: "revolver_lemat", label: "Revolver Lemat",
    weight: 1.30, stackable: false, consumable: false, emoji: "🔫",
  },
  pistolet_volcanic: {
    id: "pistolet_volcanic", label: "Pistolet Volcanic",
    weight: 1.40, stackable: false, consumable: false, emoji: "🔫",
  },
  carabine_litchfield: {
    id: "carabine_litchfield", label: "Carabine Litchfield",
    weight: 3.40, stackable: false, consumable: false, emoji: "🪖",
  },
  carabine_evans: {
    id: "carabine_evans", label: "Carabine Evans",
    weight: 3.50, stackable: false, consumable: false, emoji: "🪖",
  },
  carabine_lancaster: {
    id: "carabine_lancaster", label: "Carabine Lancaster",
    weight: 3.30, stackable: false, consumable: false, emoji: "🪖",
  },
  carabine_repetition: {
    id: "carabine_repetition", label: "Carabine à Répétition",
    weight: 3.20, stackable: false, consumable: false, emoji: "🪖",
  },
  fusil_a_petit_gibier: {
    id: "fusil_a_petit_gibier", label: "Fusil à Petit Gibier",
    weight: 2.60, stackable: false, consumable: false, emoji: "🎯",
  },
  fusil_springfield: {
    id: "fusil_springfield", label: "Fusil Springfield",
    weight: 3.80, stackable: false, consumable: false, emoji: "🎯",
  },
  fusil_verrou: {
    id: "fusil_verrou", label: "Fusil à Verrou",
    weight: 3.90, stackable: false, consumable: false, emoji: "🎯",
  },
  arc: {
    id: "arc", label: "Arc",
    weight: 0.90, stackable: false, consumable: false, emoji: "🏹",
  },
  arc_ameliorer: {
    id: "arc_ameliorer", label: "Arc amélioré",
    weight: 1.00, stackable: false, consumable: false, emoji: "🏹",
  },

  // =========================================================
  // ARMES ILLÉGALES (commande /armes_illegales)
  // =========================================================
  dynamite: {
    id: "dynamite", label: "Dynamite",
    weight: 0.90, stackable: true, consumable: false, emoji: "🧨",
  },
  bouteille_incendiaire: {
    id: "bouteille_incendiaire", label: "Bouteille incendiaire",
    weight: 0.50, stackable: true, consumable: false, emoji: "🔥",
  },
  tomahawk: {
    id: "tomahawk", label: "Tomahawk",
    weight: 0.80, stackable: false, consumable: false, emoji: "🪓",
  },
  fusil_double_canon: {
    id: "fusil_double_canon", label: "Fusil à double canon",
    weight: 3.60, stackable: false, consumable: false, emoji: "🎯",
  },
  fusil_pompe: {
    id: "fusil_pompe", label: "Fusil à pompe",
    weight: 3.70, stackable: false, consumable: false, emoji: "🎯",
  },
  fusil_canon_scie: {
    id: "fusil_canon_scie", label: "Fusil à canon scié",
    weight: 3.20, stackable: false, consumable: false, emoji: "🎯",
  },
  fusil_semi_automatique: {
    id: "fusil_semi_automatique", label: "Fusil semi-automatique",
    weight: 3.70, stackable: false, consumable: false, emoji: "🎯",
  },
  pistolet_semi_automatique: {
    id: "pistolet_semi_automatique", label: "Pistolet semi-automatique",
    weight: 1.25, stackable: false, consumable: false, emoji: "🔫",
  },
  pistolet_mauser: {
    id: "pistolet_mauser", label: "Mauser",
    weight: 1.18, stackable: false, consumable: false, emoji: "🔫",
  },
  pistolet_1899: {
    id: "pistolet_1899", label: "Pistolet 1899",
    weight: 1.20, stackable: false, consumable: false, emoji: "🔫",
  },
  fusil_carcano: {
    id: "fusil_carcano", label: "Fusil Carcano",
    weight: 3.90, stackable: false, consumable: false, emoji: "🎯",
  },
  fusil_rolling_block: {
    id: "fusil_rolling_block", label: "Fusil Rolling Block",
    weight: 4.20, stackable: false, consumable: false, emoji: "🎯",
  },

  // =========================================================
  // EXPLOITATIONS — AGRICOLE & MINIÈRE
  // (ids synchronisés avec tes fichiers d’icônes)
  // =========================================================
  acier_brut: {
    id: "acier_brut", label: "Acier brut",
    weight: 0.5, stackable: true, consumable: false, emoji: "🔩",
  },
  acier_transformer: {
    id: "acier_transformer", label: "Acier transformé",
    weight: 2.0, stackable: true, consumable: false, emoji: "🔩",
  },
  charbon_brut: {
    id: "charbon_brut", label: "Charbon brut",
    weight: 0.5, stackable: true, consumable: false, emoji: "⚫",
  },
  charbon_transformer: {
    id: "charbon_transformer", label: "Charbon transformé",
    weight: 1.5, stackable: true, consumable: false, emoji: "⚫",
  },
  mais_brut: {
    id: "mais_brut", label: "Maïs brut",
    weight: 0.5, stackable: true, consumable: false, emoji: "🌽",
  },
  mais_transformer: {
    id: "mais_transformer", label: "Maïs transformé",
    weight: 1.5, stackable: true, consumable: false, emoji: "🌽",
  },
  tabac_brut: {
    id: "tabac_brut", label: "Tabac brut",
    weight: 0.5, stackable: true, consumable: false, emoji: "🚬",
  },
  tabac_transformer: {
    id: "tabac_transformer", label: "Tabac transformé",
    weight: 1.5, stackable: true, consumable: false, emoji: "🚬",
  },
};
