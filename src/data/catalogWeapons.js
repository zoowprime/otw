// src/data/catalogWeapons.js
// Liste des armes alignée avec SUPPLIER_WEAPONS (IDs + labels jolis)

const WEAPONS = [
  { id: 'revolver_cattleman',       label: 'Revolver Cattleman',       importPrice: 18 },
  { id: 'revolver_navy',            label: 'Revolver Navy',            importPrice: 18.5 },
  { id: 'revolver_double_action',   label: 'Revolver Double Action',   importPrice: 19 },
  { id: 'revolver_schofield',       label: 'Revolver Schofield',       importPrice: 20.5 },
  { id: 'revolver_lemat',           label: 'Revolver Lemat',           importPrice: 25.25 },
  { id: 'pistolet_volcanic',        label: 'Pistolet Volcanic',        importPrice: 26.5 },
  { id: 'carabine_litchfield',      label: 'Carabine Litchfield',      importPrice: 30 },
  { id: 'carabine_evans',           label: 'Carabine Evans',           importPrice: 32.25 },
  { id: 'carabine_lancaster',       label: 'Carabine Lancaster',       importPrice: 28 },
  { id: 'carabine_repetition',      label: 'Carabine à Répétition',    importPrice: 23 },
  { id: 'fusil_a_petit_gibier',     label: 'Fusil à Petit Gibier',     importPrice: 15 },
  { id: 'fusil_springfield',        label: 'Fusil Springfield',        importPrice: 35 },
  { id: 'fusil_verrou',             label: 'Fusil à Verrou',           importPrice: 35.5 },
  { id: 'couteau_de_lancer',        label: 'Couteau de Lancer',        importPrice: 3 },
  { id: 'lasso',                    label: 'Lasso',                    importPrice: 2 },
  { id: 'arc',                      label: 'Arc',                      importPrice: 9 },
  { id: 'arc_ameliorer',            label: 'Arc amélioré',             importPrice: 14 },
  { id: 'couteau',                  label: 'Couteau',                  importPrice: 3 },
  { id: 'cisaille',                 label: 'Cisaille',                 importPrice: 3.5 },
  { id: 'couteau_de_chasse',        label: 'Couteau de chasse',        importPrice: 5 },
  { id: 'marteau',                  label: 'Marteau',                  importPrice: 6 },
  { id: 'hachette',                 label: 'Hachette',                 importPrice: 8 },
  { id: 'hache',                    label: 'Hache',                    importPrice: 10 },
  { id: 'machette',                 label: 'Machette',                 importPrice: 12 },
];

// Mapping ID → { label, importPrice }
const WEAPON_ID_MAP = Object.fromEntries(
  WEAPONS.map(w => [w.id, { label: w.label, importPrice: w.importPrice }])
);

module.exports = { WEAPONS, WEAPON_ID_MAP };
