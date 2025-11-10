// src/commands/inventaire.js
const {
  SlashCommandBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

const path = require('path');
const fs   = require('fs');

// Inventaire (store)
const { getUser, totalWeight, getVitals } = require('../data/inventoryStore');
const catalog = require('../data/itemCatalog');

// ─────────────────────────────────────────────────────────────
// Canvas (composition 1024x1024)
let createCanvas, loadImage, registerFont, CANVAS_AVAILABLE = false;
try {
  ({ createCanvas, loadImage, registerFont } = require('canvas'));
  CANVAS_AVAILABLE = true;
} catch {
  CANVAS_AVAILABLE = false;
}

// (optionnel) Police custom — décommente si tu ajoutes une TTF
// try {
//   const FONT_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'RedDead.ttf');
//   if (fs.existsSync(FONT_PATH)) {
//     registerFont(FONT_PATH, { family: 'OTW' });
//   }
// } catch {}

// ─────────────────────────────────────────────────────────────
// chemins assets
const BAG_BG    = path.join(__dirname, '..', 'assets', 'inventory', 'Sacoche.png');
const ICONS_DIR = path.join(__dirname, '..', 'assets', 'icones');

// ─────────────────────────────────────────────────────────────
// PARAMÈTRES UI
const GRID = {
  COLS: 5,
  ROWS: 5,
  SLOT_W: 96,
  SLOT_H: 120,
  LEFT: 170,   // origine 1er slot
  TOP:  220,
  XGAP: 35,
  YGAP: 28,
};

// Micro-corrections par colonne/ligne (pour compenser des cases du visuel non parfaitement régulières)
const COL_NUDGE = [0, 0, 4, 0, 0]; // ← 3e colonne (index 2) décalée de +4px vers la droite
const ROW_NUDGE = [0, 0, 0, 0, 0]; // ajuste si une rangée “glisse” verticalement (+ = descend)

// position du texte du poids **actuel uniquement**
const WEIGHT_TEXT = {
  X: 463,
  Y: 160,
  FONT: '26px Arial', // ou '26px OTW' si police enregistrée
  COLOR: '#EDEDED',
  SHADOW: 'rgba(0,0,0,0.75)',
};

// polices slots
const FONTS = {
  NAME:  '14px Arial',
  META:  '12px Arial',
  COLOR: '#FFFFFF',
  SHADOW:'rgba(0,0,0,0.65)',
};

// DEBUG: dessiner les cadres des 25 slots
const DEBUG_GRID = false;

// ─────────────────────────────────────────────────────────────
// Helpers texte

function truncateTo(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

function drawShadowText(ctx, text, x, y, align = 'left', color = FONTS.COLOR, shadow = FONTS.SHADOW) {
  ctx.textAlign   = align;
  ctx.textBaseline= 'alphabetic';
  ctx.fillStyle   = color;
  ctx.shadowColor = shadow;
  ctx.shadowBlur  = 4;
  ctx.fillText(text, x, y);
  ctx.shadowBlur  = 0;
}

// barre ascii (pour description)
function bar(pct) {
  const blocks = 20;
  const filled = Math.max(0, Math.min(blocks, Math.round((pct / 100) * blocks)));
  return '█'.repeat(filled) + '░'.repeat(blocks - filled);
}

// ─────────────────────────────────────────────────────────────
async function renderInventoryImage(userId) {
  if (!CANVAS_AVAILABLE) return null;

  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');

  // fond
  const bg = await loadImage(BAG_BG);
  ctx.drawImage(bg, 0, 0, 1024, 1024);

  // poids actuel UNIQUEMENT (le “/ 60.00” est sur le fond)
  const st = getUser(userId);
  const tw = totalWeight(st);
  ctx.font = WEIGHT_TEXT.FONT;
  drawShadowText(ctx, `${tw.toFixed(2)}`, WEIGHT_TEXT.X, WEIGHT_TEXT.Y, 'left', WEIGHT_TEXT.COLOR, WEIGHT_TEXT.SHADOW);

  // debug slots
  if (DEBUG_GRID) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    for (let r = 0; r < GRID.ROWS; r++) {
      for (let c = 0; c < GRID.COLS; c++) {
        const slotX = GRID.LEFT + c * (GRID.SLOT_W + GRID.XGAP) + (COL_NUDGE[c] || 0);
        const slotY = GRID.TOP  + r * (GRID.SLOT_H + GRID.YGAP) + (ROW_NUDGE[r] || 0);
        ctx.strokeRect(slotX + 0.5, slotY + 0.5, GRID.SLOT_W - 1, GRID.SLOT_H - 1);
      }
    }
  }

  // items (centrés)
  const items = Array.isArray(st.items) ? st.items.slice(0, GRID.COLS * GRID.ROWS) : [];

  for (let i = 0; i < items.length; i++) {
    const it  = items[i];
    const id  = it.name || it.id;
    const qty = typeof it.quantity === 'number' ? it.quantity : 1;

    const col = i % GRID.COLS;
    const row = Math.floor(i / GRID.COLS);

    const slotX = GRID.LEFT + col * (GRID.SLOT_W + GRID.XGAP) + (COL_NUDGE[col] || 0);
    const slotY = GRID.TOP  + row * (GRID.SLOT_H + GRID.YGAP) + (ROW_NUDGE[row] || 0);

    const cx = slotX + GRID.SLOT_W / 2;
    const cy = slotY + GRID.SLOT_H / 2;

    // icône
    const iconPath = path.join(ICONS_DIR, `${id}.png`);
    if (fs.existsSync(iconPath)) {
      try {
        const img = await loadImage(iconPath);
        const scale = Math.min(GRID.SLOT_W / img.width, GRID.SLOT_H / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
      } catch { /* ignore */ }
    } else if (!DEBUG_GRID) {
      ctx.strokeStyle = 'rgba(255,255,255,0.20)';
      ctx.strokeRect(slotX + 0.5, slotY + 0.5, GRID.SLOT_W - 1, GRID.SLOT_H - 1);
    }

    // textes overlay
    const meta   = catalog[id] || {};
    const weight = (meta.weight ?? 0);

    // qty
    if ((meta.stackable ?? true) && qty > 1) {
      ctx.font = FONTS.META;
      drawShadowText(ctx, `x${qty}`, slotX + 6, slotY + 14, 'left');
    }

    // poids unitaire
    ctx.font = FONTS.META;
    drawShadowText(ctx, `${weight.toFixed(1)}kg`, slotX + GRID.SLOT_W - 6, slotY + 14, 'right');

    // nom
    ctx.font = FONTS.NAME;
    const label = truncateTo(ctx, (meta.label || id).replace(/_/g, ' '), GRID.SLOT_W - 10);
    drawShadowText(ctx, label, cx, slotY + GRID.SLOT_H - 10, 'center');
  }

  const buf = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buf, { name: 'inventory.png' });
}

// ─────────────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventaire')
    .setDescription('Affiche ta sacoche et tes besoins vitaux'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const displayName = interaction.member?.displayName || interaction.user.username;

    // vitaux (décroissance appliquée côté store)
    const { hunger, thirst } = getVitals(userId);

    // image 1024x1024
    const file = await renderInventoryImage(userId).catch(() => null);

    const contentLines = [
      `**Sacoche de ${displayName}**`,
      `🍖 **Faim** : \`${bar(hunger)}\`  ${hunger}%`,
      `💧 **Soif** : \`${bar(thirst)}\`  ${thirst}%`,
      '', // ligne vide avant l'image
    ].join('\n');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('inv_give').setLabel('Donner').setStyle(ButtonStyle.Success).setEmoji('🟩'),
      new ButtonBuilder().setCustomId('inv_use').setLabel('Utiliser').setStyle(ButtonStyle.Primary).setEmoji('🟦'),
      new ButtonBuilder().setCustomId('inv_drop').setLabel('Jeter').setStyle(ButtonStyle.Danger).setEmoji('🟥'),
    );

    if (file) {
      // Message sans embed pour un affichage GRAND de l’image
      await interaction.reply({
        content: contentLines,
        files: [file],
        components: [row],
        allowedMentions: { users: [] },
      });
    } else {
      // fallback si canvas indispo
      await interaction.reply({
        content:
          `${contentLines}\n*(Affichage graphique indisponible. Installe \`canvas\` pour voir la sacoche.)*`,
        components: [row],
        flags: MessageFlags.Ephemeral,
        allowedMentions: { users: [] },
      });
    }
  }
};
