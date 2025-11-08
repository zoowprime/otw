// src/data/catalogHorses.js
// Liste complète des chevaux par catégories (imports écuries)

const HORSE_GROUPS = [
  { title: '🐎 American Paint', items: [['Tobiano', 45], ['Overo', 45], ['Balzane', 50], ['Overo Gris', 60]] },
  { title: '🐎 Appaloosa', items: [['Capé Léopard', 45], ['Capée', 45], ['Léopard', 60], ['Léopard Brun', 60]] },
  { title: '🐎 Hollandais à Sang Chaud', items: [['Isabelle Sooty', 90], ['Noir Pangaré', 90], ['Rouan Chocolat', 100]] },
  { title: '🐎 Chevaux de Guerre — Ardennais', items: [['Bai Rouanné', 65], ['Rouan Fraise', 65]] },
  { title: '🐎 Chevaux de Guerre — Andalou', items: [['Bai Brun', 70], ['Alezan Grisonnant', 70], ['Perlino', 70]] },
  { title: '🐎 Demi-Sang Hongrois', items: [['Alezan Crins Lavés', 60], ['Pie Tobiano', 60]] },
  { title: '🐎 Mustang', items: [['Bai Sauvage', 25], ['Grullo', 25], ['Bai Tigré', 30], ['Isabelle', 105], ['Tovero Alezan', 105], ['Overo Alezan Dun', 110], ['Overo Noir', 115]] },
  { title: '🐎 Chevaux Polyvalents', items: [['Pinto Pommelé Silver', 225], ['Champagne Ambre', 225], ['Tovero Noir', 300], ['Gris Pommelé', 350], ['Isabelle Isabelle Bringé', 350], ['Noir Rouanné', 350]] },
  { title: '🐎 Breton', items: [['Oseille', 35], ['Rubican', 35], ['Grullo', 105], ['Pangaré', 105], ['Bai Pommelé Pangaré', 350], ['Gris Fer', 350]] },
  { title: '🐎 Turkoman', items: [['Bai Brun', 300], ['Argenté', 350], ['Doré', 350], ['Alzane', 400], ['Gris', 400], ['Noir', 430], ['Perlino', 400]] },
  { title: '🐎 Criollo', items: [['Dun', 25], ['Noir Rouanné', 25], ['Bai Bringé', 105], ['Overo Oseille', 105], ['Frame Overo', 350], ['Sabino Marmoré', 350]] },
  { title: '🐎 Cob Gypsy Pie', items: [['Cheval du Kentucky', 40], ['Cheval Morgan', 40], ['Cheval Tennessee Walker', 30]] },
  { title: '🐎 Chevaux de Trait', items: [['Cheval Belge', 70], ['Cheval Shire', 70], ['Cheval Suffolk Punch', 65], ['Pie', 30], ['Blagdon Blanc', 30], ['Skewbald', 105], ['Blagdon Palomino', 105], ['Bai Balzan', 350], ['Pie Balzan', 350]] },
  { title: '🐎 Chevaux de Course', items: [['Noir Rouanné', 100], ['Rouan Blanc', 100], ['Rouan Pommelé Inversé', 100]] },
  { title: '🐎 Pur-Sang', items: [['Bai Acajou', 135], ['Bringée', 135], ['Gris Pommelé', 135]] },
  { title: '🐎 Trotteur Américain', items: [['Isabelle', 135], ['Noir', 135], ['Palomino Pommelé', 135], ['Isabelle Queue Argentée', 135], ['Gris Pommelé Foncé', 85]] },
  { title: '🐎 Pur-Sang Arabe', items: [['Noir', 480], ['Blanc', 450], ['Rouge', 400]] },
  { title: '🚚 Charette', items: [['Chasseur de prime', 480], ['Charette de commerce', 270]] },
];

module.exports = { HORSE_GROUPS };
