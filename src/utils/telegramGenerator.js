const { createCanvas, loadImage } = require('canvas');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '../assets/telegram_template.png');

async function generateTelegramImage(from, to, messageText, signature) {
  // 1) Charge le fond
  const img = await loadImage(TEMPLATE_PATH);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  // 2) Styles communs
  ctx.fillStyle = '#3a2c1e';     // brun foncé
  ctx.textBaseline = 'top';      // simplifie le positionnement Y

  // 3) "De :"  (zone verte)
  ctx.font = '36px serif';
  ctx.textAlign = 'left';
  ctx.fillText(`De : ${from}`, 60, 140);

  // 4) "À :"  (zone bleue)
  ctx.font = '36px serif';
  ctx.fillText(`À : ${to}`, 60, 200);

  // 5) Message  (zone rose)
  ctx.font = '34px serif';
  const x       = 60;
  const y       = 260;
  const maxW    = img.width - 120;
  const lineH   = 44;
  const words   = messageText.split(' ');
  let   line    = '';
  let   offsetY = y;

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
  // dernière ligne
  ctx.fillText(line.trim(), x, offsetY);

  // 6) Signature  (zone rouge)
  ctx.font = '32px serif';
  ctx.textAlign = 'right';
  ctx.fillText(`— ${signature}`, img.width - 60, img.height - 60);

  return canvas.toBuffer('image/png');
}

module.exports = { generateTelegramImage };
