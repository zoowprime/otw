const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');

// (Optionnel) Charge une police style manuscrite ou machine à écrire
// registerFont(path.join(__dirname, '../assets/YourFont.ttf'), { family: 'YourFont' });

const TEMPLATE = path.join(__dirname, '../assets/telegram_template.png');

async function generateTelegramImage(messageText, authorName) {
  // Charge le fond
  const img = await loadImage(TEMPLATE);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');

  // Dessine le fond
  ctx.drawImage(img, 0, 0);

  // Paramètres de style
  ctx.fillStyle = '#3a2c1e';       // brun foncé
  ctx.textAlign = 'left';

  // Texte principal
  ctx.font = '24px serif';         // ou 'YourFont'
  const x = 60, y = 160;
  const maxWidth = img.width - 120;
  const lineHeight = 32;

  // Découpe automatique en lignes
  const words = messageText.split(' ');
  let line = '', offsetY = y, lines = [];
  for (let w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(line.trim());
      line = w + ' ';
    } else {
      line = test;
    }
  }
  lines.push(line.trim());
  // Dessine chaque ligne
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, offsetY + i * lineHeight);
  }

  // Signature en bas à droite
  ctx.font = '20px serif';
  ctx.textAlign = 'right';
  ctx.fillText(`— ${authorName}`, img.width - 60, img.height - 60);

  return canvas.toBuffer('image/png');
}

module.exports = { generateTelegramImage };
