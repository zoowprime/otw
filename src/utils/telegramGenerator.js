// src/utils/telegramGenerator.js
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '../assets/telegram_template.png');

async function generateTelegramImage(from, to, messageText, signature) {
  const img = await loadImage(TEMPLATE_PATH);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  // couleur et alignement
  ctx.fillStyle = '#3a2c1e';
  ctx.textBaseline = 'top';

  // 1) "De :" — plus gros, plus bas
  ctx.font = '48px serif';
  ctx.textAlign = 'left';
  ctx.fillText(`De : ${from}`, 60, 180);

  // 2) "À :" — plus gros, plus bas
  ctx.font = '48px serif';
  ctx.fillText(`À : ${to}`, 60, 260);

  // 3) Message — plus gros, zone plus basse
  ctx.font = '44px serif';
  const x      = 60;
  const y      = 340;
  const maxW   = img.width - 120;
  const lineH  = 52;
  const words  = messageText.split(' ');
  let   line   = '';
  let   offsetY= y;

  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line.trim(), x, offsetY);
      line = w + ' ';
      offsetY += lineH;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, offsetY);

  // 4) Signature — un peu plus grand et bas
  ctx.font = '40px serif';
  ctx.textAlign = 'right';
  ctx.fillText(`— ${signature}`, img.width - 60, img.height - 80);

  return canvas.toBuffer('image/png');
}

module.exports = { generateTelegramImage };
