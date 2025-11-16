// src/utils/idCardRenderer.js
const fs   = require('fs');
const path = require('path');

let createCanvas, loadImage;
let CANVAS_OK = false;
try {
  ({ createCanvas, loadImage } = require('canvas'));
  CANVAS_OK = true;
} catch (err) {
  console.error('Canvas non disponible pour idCardRenderer:', err);
  CANVAS_OK = false;
}

const { CARDS_DIR, getCardImagePath } = require('../data/idCardsData');

// chemin local du template (tu l’as déjà dans ton repo)
const TEMPLATE_PATH = path.join(
  __dirname,
  '..',
  'assets',
  'idcard',
  'carte_identite_template.png'
);

// Coordonnées pour l’image et les textes sur un canvas 1400x950
const COORDS = {
  width: 1400,
  height: 950,
  photo: {
    x: 260,   // coin haut gauche du cadre photo
    y: 260,
    w: 480,
    h: 520,
  },
  text: {
    nom:        { x: 820, y: 320 },
    prenom:     { x: 820, y: 400 },
    birthDate:  { x: 970, y: 710 },
    size:       { x: 860, y: 570 },
    address:    { x: 930, y: 650 },
  },
};

function drawText(ctx, text, x, y) {
  ctx.fillStyle = '#000000';
  ctx.font = '30px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(text || ''), x, y);
}

/**
 * Rend la carte d'identité pour un joueur et retourne le chemin du fichier PNG
 * cardData: { nom, prenom, birthDate, size, address, photoPath }
 */
async function renderIdCard(userId, cardData) {
  if (!CANVAS_OK) return null;
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error('Template ID non trouvé:', TEMPLATE_PATH);
    return null;
  }

  try {
    if (!fs.existsSync(CARDS_DIR)) fs.mkdirSync(CARDS_DIR, { recursive: true });

    const canvas = createCanvas(COORDS.width, COORDS.height);
    const ctx    = canvas.getContext('2d');

    const templateImg = await loadImage(TEMPLATE_PATH);
    ctx.drawImage(templateImg, 0, 0, COORDS.width, COORDS.height);

    // Photo (si dispo)
    if (cardData.photoPath && fs.existsSync(cardData.photoPath)) {
      try {
        const photo = await loadImage(cardData.photoPath);
        const { x, y, w, h } = COORDS.photo;

        // on cale l'image en conservant le ratio
        const scale = Math.min(w / photo.width, h / photo.height);
        const pw = photo.width * scale;
        const ph = photo.height * scale;
        const px = x + (w - pw) / 2;
        const py = y + (h - ph) / 2;

        ctx.drawImage(photo, px, py, pw, ph);
      } catch (err) {
        console.error('Erreur chargement photo ID:', err);
      }
    }

    // Textes
    drawText(ctx, cardData.nom,       COORDS.text.nom.x,       COORDS.text.nom.y);
    drawText(ctx, cardData.prenom,    COORDS.text.prenom.x,    COORDS.text.prenom.y);
    drawText(ctx, cardData.birthDate, COORDS.text.birthDate.x, COORDS.text.birthDate.y);
    drawText(ctx, cardData.size,      COORDS.text.size.x,      COORDS.text.size.y);
    drawText(ctx, cardData.address,   COORDS.text.address.x,   COORDS.text.address.y);

    const outPath = getCardImagePath(userId);
    const buffer  = canvas.toBuffer('image/png');
    fs.writeFileSync(outPath, buffer);
    return outPath;
  } catch (err) {
    console.error('Erreur renderIdCard:', err);
    return null;
  }
}

module.exports = { renderIdCard };
