const { createCanvas, loadImage } = require('canvas');
const path = require('path');

async function generateCard({ 
  username, 
  avatarURL, 
  memberCount, 
  isWelcome = true 
}) {
  // 1) Charge le background à sa taille native
  const bgPath = path.join(__dirname, '../assets/welcome_bg.png');
  const bg    = await loadImage(bgPath);
  const width = bg.width;
  const height= bg.height;

  const canvas = createCanvas(width, height);
  const ctx    = canvas.getContext('2d');

  // 2) Fond
  ctx.drawImage(bg, 0, 0);

  // 3) Texte du haut (centré)
  ctx.fillStyle    = '#FFFFFF';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.font         = 'bold 36px sans-serif';
  const title      = isWelcome 
                      ? 'Bienvenue sur OTW RP !' 
                      : 'Au revoir...';
  ctx.fillText(title, width / 2, 20);

  // 4) Avatar centré
  const avatarSize = 128;
  const avatarImg  = await loadImage(avatarURL);
  const ax = (width  - avatarSize) / 2;
  const ay = (height - avatarSize) / 2 - 10;  // légèrement vers le haut

  ctx.save();
  ctx.beginPath();
  ctx.arc(ax + avatarSize/2, ay + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatarImg, ax, ay, avatarSize, avatarSize);
  ctx.restore();

  // 5) Texte du bas (centré)
  ctx.fillStyle    = '#FFCC00';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font         = '28px sans-serif';
  const bottomText = `Vous êtes le membre n°${memberCount}`;
  ctx.fillText(bottomText, width / 2, height - 20);

  return canvas.toBuffer();
}

module.exports = { generateCard };
