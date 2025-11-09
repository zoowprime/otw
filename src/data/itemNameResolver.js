// src/data/itemNameResolver.js
// Convertit un nom "humain" (catalogues/menus) en id snake_case (nom de fichier d'icône).
const BASE_MAP = {
  // LÉGALES
  "Revolver Cattleman": "revolver_cattleman",
  "Revolver Navy": "revolver_navy",
  "Revolver Double Action": "revolver_double_action",
  "Revolver Schofield": "revolver_schofield",
  "Revolver Lemat": "revolver_lemat",
  "Pistolet Volcanic": "pistolet_volcanic",
  "Carabine Litchfield": "carabine_litchfield",
  "Carabine Evans": "carabine_evans",
  "Carabine Lancaster": "carabine_lancaster",
  "Carabine à Répétition": "carabine_repetition",
  "Fusil à Petit Gibier": "fusil_a_petit_gibier",
  "Fusil Springfield": "fusil_springfield",
  "Fusil à Verrou": "fusil_verrou",
  "Couteau de Lancer": "couteau_de_lancer",
  "Lasso": "lasso",
  "Arc": "arc",
  "Arc Amélioré": "arc_ameliorer",
  "Couteau": "couteau",
  "Cisaille": "cisaille",
  "Couteau de Chasse": "couteau_de_chasse",
  "Marteau": "marteau",
  "Hachette": "hachette",
  "Hache": "hache",
  "Machette": "machette",

  // ILLÉGALES (selon ta commande)
  "Dynamites": "dynamite",
  "Bouteilles incendiaires": "bouteille_incendiaire",
  "Tomahawk": "tomahawk",
  "Fusil à double canon": "fusil_double_canon",
  "Fusil à pompe": "fusil_pompe",
  "Fusil à canon scié": "fusil_canon_scie",
  "Fusil semi-automatique": "fusil_semi_automatique",
  "Semi-automatique": "pistolet_semi_automatique",
  "Mauser": "pistolet_mauser",
  "Pistolet 1899": "pistolet_1899",
  "Fusil Carcano": "fusil_carcano",
  "Fusil Rolling Block": "fusil_rolling_block",
  "Kit de crochetage": "kit_crochetage",

  // Consommables
  "Boîte de conserve": "conserve_nourriture",
  "Bouteille d’alcool": "alcool_bouteille",
  "Bouteille d'alcool": "alcool_bouteille",
  "Pommade pour cheveux": "pommade",
};

function deaccent(s){
  return s.normalize("NFD").replace(/\p{Diacritic}/gu,"");
}
function toIdGuess(s){
  return deaccent(String(s).toLowerCase())
    .replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
}

function resolveItemId(nameOrId){
  if (!nameOrId) return null;
  if (BASE_MAP[nameOrId]) return BASE_MAP[nameOrId];
  return toIdGuess(nameOrId);
}

module.exports = { resolveItemId };
