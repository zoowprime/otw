const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');

// (Optionnel) charge ta police RP
// registerFont(path.join(__dirname, '../assets/ta-police.ttf'), { family: 'TA_POLICE' });

const TEMPLATE_PATH = path.join(__dirname, '../assets/telegram_template.png');

async function generateTelegramImage(from, to, messageText, signature) {
  const img = await loadImage(TEMPLATE_PATH);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');

  // Fond
  ctx.drawImage(img, 0, 0);

  // Couleur du texte
  ctx.fillStyle = '#3a2c1e';
  ctx.textAlign = 'left';

  // 1) Émetteur et destinataire
  ctx.font = '28px serif'; // ou 'TA_POLICE'
  ctx.fillText(`De : ${from}`, 60, 120);
  ctx.fillText(`À : ${to}`,   60, 160);

  // 2) Corps du message
  ctx.font = '30px serif';
  const x = 60, y = 220;
  const maxWidth = img.width - 120;
  const lineHeight = 38;

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

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, offsetY + i * lineHeight);
  }

  // 3) Signature
  ctx.font = '26px serif';
  ctx.textAlign = 'right';
  ctx.fillText(`— ${signature}`, img.width - 60, img.height - 60);

  return canvas.toBuffer('image/png');
}

module.exports = { generateTelegramImage };
