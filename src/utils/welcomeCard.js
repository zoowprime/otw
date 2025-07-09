const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');

// (Optionnel) chargez une police qui colle à l'ambiance Western
// registerFont(path.join(__dirname, '../assets/your-western-font.ttf'), { family: 'Western' });

async function generateCard({ username, discriminator, avatarURL, memberCount, isWelcome = true }) {
  // 800×250 px par exemple
  const width  = 800;
  const height = 250;
  const canvas = createCanvas(width, height);
  const ctx    = canvas.getContext('2d');

  // fond
  const bg = await loadImage(path.join(__dirname, '../assets/welcome_bg.png'));
  ctx.drawImage(bg, 0, 0, width, height);

  // vignette avatar ronde
  const avatar = await loadImage(avatarURL);
  const size   = 128;
  const x      = 30, y = (height - size) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI*2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, x, y, size, size);
  ctx.restore();

  // texte principal
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 32px sans-serif'; 

  const title = isWelcome ? 'Bienvenue sur OTW !' : 'Au revoir...';
  ctx.fillText(title, x + size + 30, y);

  // pseudo & discrim
  ctx.font = '24px sans-serif';
  ctx.fillText(`${username}#${discriminator}`, x + size + 30, y + 40);

  // compteurs
  ctx.fillStyle = '#ffcc00';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Vous êtes le membre n°${memberCount}`, x + size + 30, y + 80);

  return canvas.toBuffer();
}

module.exports = { generateCard };
