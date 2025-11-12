// src/data/catalogHorses.js
// Groupes pour l’UI + mapping ID → { label, price } aligné avec SUPPLIER_HORSES

const HORSE_GROUPS = [
  { title: '🐎 American Paint', items: [
    ['Tobiano', 45, 'american_paint_tobiano'],
    ['Overo', 45, 'american_paint_overo'],
    ['Balzane', 50, 'american_paint_balzane'],
    ['Overo Gris', 60, 'american_paint_overo_gris'],
  ]},
  { title: '🐎 Appaloosa', items: [
    ['Capé Léopard', 45, 'appaloosa_cape_leopard'],
    ['Capée', 45, 'appaloosa_capee'],
    ['Léopard', 60, 'appaloosa_leopard'],
    ['Léopard Brun', 60, 'appaloosa_leopard_brun'],
  ]},
  { title: '🐎 Hollandais à Sang Chaud', items: [
    ['Isabelle Sooty', 90, 'hollandais_sang_chaud_isabelle_sooty'],
    ['Noir Pangaré', 90, 'hollandais_sang_chaud_noir_pangare'],
    ['Rouan Chocolat', 100, 'hollandais_sang_chaud_rouan_chocolat'],
  ]},
  { title: '🐎 Chevaux de Guerre — Ardennais', items: [
    ['Bai Rouanné', 65, 'ardennais_bai_rouanne'],
    ['Rouan Fraise', 65, 'ardennais_rouan_fraise'],
  ]},
  { title: '🐎 Chevaux de Guerre — Andalou', items: [
    ['Bai Brun', 70, 'andalou_bai_brun'],
    ['Alezan Grisonnant', 70, 'andalou_alezan_grisonnant'],
    ['Perlino', 70, 'andalou_perlino'],
  ]},
  { title: '🐎 Demi-Sang Hongrois', items: [
    ['Alezan Crins Lavés', 60, 'demi_sang_hongrois_alezan_crins_laves'],
    ['Pie Tobiano', 60, 'demi_sang_hongrois_pie_tobiano'],
  ]},
  { title: '🐎 Mustang', items: [
    ['Bai Sauvage', 25, 'mustang_bai_sauvage'],
    ['Grullo', 25, 'mustang_grullo'],
    ['Bai Tigré', 30, 'mustang_bai_tigre'],
    ['Isabelle', 105, 'mustang_isabelle'],
    ['Tovero Alezan', 105, 'mustang_tovero_alezan'],
    ['Overo Alezan Dun', 110, 'mustang_overo_alezan_dun'],
    ['Overo Noir', 115, 'mustang_overo_noir'],
  ]},
  { title: '🐎 Chevaux Polyvalents', items: [
    ['Pinto Pommelé Silver', 225, 'polyvalent_pinto_pommele_silver'],
    ['Champagne Ambre', 225, 'polyvalent_champagne_ambre'],
    ['Tovero Noir', 300, 'polyvalent_tovero_noir'],
    ['Gris Pommelé', 350, 'polyvalent_gris_pommele'],
    ['Isabelle Bringé', 350, 'polyvalent_isabelle_brinje'],
    ['Noir Rouanné', 350, 'polyvalent_noir_rouanne'],
  ]},
  { title: '🐎 Breton', items: [
    ['Oseille', 35, 'breton_oseille'],
    ['Rubican', 35, 'breton_rubican'],
    ['Grullo', 105, 'breton_grullo'],
    ['Pangaré', 105, 'breton_pangare'],
    ['Bai Pommelé Pangaré', 350, 'breton_bai_pommele_pangare'],
    ['Gris Fer', 350, 'breton_gris_fer'],
  ]},
  { title: '🐎 Turkoman', items: [
    ['Bai Brun', 300, 'turkoman_bai_brun'],
    ['Argenté', 350, 'turkoman_argente'],
    ['Doré', 350, 'turkoman_dore'],
    ['Alzane', 400, 'turkoman_alzane'],
    ['Gris', 400, 'turkoman_gris'],
    ['Noir', 430, 'turkoman_noir'],
    ['Perlino', 400, 'turkoman_perlino'],
  ]},
  { title: '🐎 Criollo', items: [
    ['Dun', 25, 'criollo_dun'],
    ['Noir Rouanné', 25, 'criollo_noir_rouanne'],
    ['Bai Bringé', 105, 'criollo_bai_brinje'],
    ['Overo Oseille', 105, 'criollo_overo_oseille'],
    ['Frame Overo', 350, 'criollo_frame_overo'],
    ['Sabino Marmoré', 350, 'criollo_sabino_marmore'],
  ]},
  { title: '🐎 Cob Gypsy Pie', items: [
    ['Cheval du Kentucky', 40, 'cob_gypsy_kentucky'],
    ['Cheval Morgan', 40, 'cob_gypsy_morgan'],
    ['Cheval Tennessee Walker', 30, 'cob_gypsy_tennessee_walker'],
  ]},
  { title: '🐎 Chevaux de Trait', items: [
    ['Cheval Belge', 70, 'trait_belge'],
    ['Cheval Shire', 70, 'trait_shire'],
    ['Cheval Suffolk Punch', 65, 'trait_suffolk_punch'],
    ['Pie', 30, 'trait_pie'],
    ['Blagdon Blanc', 30, 'trait_blagdon_blanc'],
    ['Skewbald', 105, 'trait_skewbald'],
    ['Blagdon Palomino', 105, 'trait_blagdon_palomino'],
    ['Bai Balzan', 350, 'trait_bai_balzan'],
    ['Pie Balzan', 350, 'trait_pie_balzan'],
  ]},
  { title: '🐎 Chevaux de Course', items: [
    ['Noir Rouanné', 100, 'course_noir_rouanne'],
    ['Rouan Blanc', 100, 'course_rouan_blanc'],
    ['Rouan Pommelé Inversé', 100, 'course_rouan_pommele_inverse'],
  ]},
  { title: '🐎 Pur-Sang', items: [
    ['Bai Acajou', 135, 'pur_sang_bai_acajou'],
    ['Bringée', 135, 'pur_sang_bringee'],
    ['Gris Pommelé', 135, 'pur_sang_gris_pommele'],
  ]},
  { title: '🐎 Trotteur Américain', items: [
    ['Isabelle', 135, 'trotteur_americain_isabelle'],
    ['Noir', 135, 'trotteur_americain_noir'],
    ['Palomino Pommelé', 135, 'trotteur_americain_palomino_pommele'],
    ['Isabelle Queue Argentée', 135, 'trotteur_americain_isabelle_queue_argentee'],
    ['Gris Pommelé Foncé', 85, 'trotteur_americain_gris_pommele_fonce'],
  ]},
  { title: '🐎 Pur-Sang Arabe', items: [
    ['Noir', 480, 'pur_sang_arabe_noir'],
    ['Blanc', 450, 'pur_sang_arabe_blanc'],
    ['Rouge', 400, 'pur_sang_arabe_rouge'],
  ]},
  { title: '🚚 Charrette', items: [
    ['Chasseur de prime', 480, 'charrette_prime'],
    ['Charrette de commerce', 270, 'charrette_commerce'],
  ]},
];

// Mapping rapide ID → { label, price }
const HORSE_ID_MAP = Object.fromEntries(
  HORSE_GROUPS.flatMap(g => g.items.map(([label, price, id]) => [id, { label, price }]))
);

module.exports = { HORSE_GROUPS, HORSE_ID_MAP };
