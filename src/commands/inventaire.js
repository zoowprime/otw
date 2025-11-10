// src/commands/inventaire.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ComponentType,
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

// ─────────────────────────────────────────────────────────────
// chemins assets
const BAG_BG    = path.join(__dirname, '..', 'assets', 'inventory', 'Sacoche.png');
const ICONS_DIR = path.join(__dirname, '..', 'assets', 'icones');

// ─────────────────────────────────────────────────────────────
// PARAMÈTRES UI — COORDONNÉES DES CASES
// Chaque case (slot) est calculée ainsi :
//   slotX = LEFT + col * (SLOT_W + XGAP) + COL_NUDGE[col]
//   slotY = TOP  + row * (SLOT_H + YGAP) + ROW_NUDGE[row]
// Pour centrer une icône :
//   cx = slotX + SLOT_W/2
//   cy = slotY + SLOT_H/2
const GRID = {
  COLS: 5,
  ROWS: 5,
  SLOT_W: 96,
  SLOT_H: 120,
  LEFT: 170,
  TOP:  220,
  XGAP: 35,
  YGAP: 28,
};

// Micro-corrections par colonne/ligne
const COL_NUDGE = [0, 0, 6, 0, 0]; // 3e colonne (index 2) +6 px vers la droite
const ROW_NUDGE = [0, 0, 0, 0, 0];

// Position du texte du poids actuel uniquement (le “/ 60.00” est sur l’image)
const WEIGHT_TEXT = {
  X: 463,
  Y: 160,
  FONT: '26px Arial',
  COLOR: '#EDEDED',
  SHADOW: 'rgba(0,0,0,0.75)',
};

// Polices pour les overlays
const FONTS = {
  NAME:  '14px Arial',
  META:  '12px Arial',
  COLOR: '#FFFFFF',
  SHADOW:'rgba(0,0,0,0.65)',
};

// DEBUG
const DEBUG_GRID  = false; // dessine les cadres
const DEBUG_INDEX = false; // dessine l’index 0–24

// ─────────────────────────────────────────────────────────────
// Helpers

function truncateTo(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
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

function bar(pct) {
  const blocks = 20;
  const filled = Math.max(0, Math.min(blocks, Math.round((pct / 100) * blocks)));
  return '█'.repeat(filled) + '░'.repeat(blocks - filled);
}

// ► Coordonnées exactes d’un slot (utile si tu ajustes manuellement)
function getSlotRect(col, row) {
  const x = GRID.LEFT + col * (GRID.SLOT_W + GRID.XGAP) + (COL_NUDGE[col] || 0);
  const y = GRID.TOP  + row * (GRID.SLOT_H + GRID.YGAP) + (ROW_NUDGE[row] || 0);
  return { x, y, w: GRID.SLOT_W, h: GRID.SLOT_H, cx: x + GRID.SLOT_W/2, cy: y + GRID.SLOT_H/2 };
}

// ─────────────────────────────────────────────────────────────
async function renderInventoryImage(userId) {
  if (!CANVAS_AVAILABLE) return null;

  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');

  // fond
  const bg = await loadImage(BAG_BG);
  ctx.drawImage(bg, 0, 0, 1024, 1024);

  // poids actuel
  const st = getUser(userId);
  const tw = totalWeight(st);
  ctx.font = WEIGHT_TEXT.FONT;
  drawShadowText(ctx, `${tw.toFixed(2)}`, WEIGHT_TEXT.X, WEIGHT_TEXT.Y, 'left', WEIGHT_TEXT.COLOR, WEIGHT_TEXT.SHADOW);

  // debug
  if (DEBUG_GRID || DEBUG_INDEX) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.fillStyle   = 'rgba(255,255,255,0.55)';
    ctx.font        = '12px Arial';
    for (let r = 0; r < GRID.ROWS; r++) {
      for (let c = 0; c < GRID.COLS; c++) {
        const { x, y, w, h, cx } = getSlotRect(c, r);
        if (DEBUG_GRID)  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        if (DEBUG_INDEX) drawShadowText(ctx, String(r * GRID.COLS + c), cx, y + 14, 'center');
      }
    }
  }

  // items
  const items = Array.isArray(st.items) ? st.items.slice(0, GRID.COLS * GRID.ROWS) : [];
  for (let i = 0; i < items.length; i++) {
    const it  = items[i];
    const id  = it.name || it.id;
    const qty = typeof it.quantity === 'number' ? it.quantity : 1;

    const col = i % GRID.COLS;
    const row = Math.floor(i / GRID.COLS);

    const { x: slotX, y: slotY, w: slotW, h: slotH, cx, cy } = getSlotRect(col, row);

    // icône
    const iconPath = path.join(ICONS_DIR, `${id}.png`);
    if (fs.existsSync(iconPath)) {
      try {
        const img = await loadImage(iconPath);
        const scale = Math.min(slotW / img.width, slotH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
      } catch {
        // ignore
      }
    } else if (!DEBUG_GRID) {
      ctx.strokeStyle = 'rgba(255,255,255,0.20)';
      ctx.strokeRect(slotX + 0.5, slotY + 0.5, slotW - 1, slotH - 1);
    }

    // textes overlay
    const meta   = catalog[id] || {};
    const weight = (meta.weight ?? 0);

    if ((meta.stackable ?? true) && qty > 1) {
      ctx.font = FONTS.META;
      drawShadowText(ctx, `x${qty}`, slotX + 6, slotY + 14, 'left');
    }

    ctx.font = FONTS.META;
    drawShadowText(ctx, `${weight.toFixed(1)}kg`, slotX + slotW - 6, slotY + 14, 'right');

    ctx.font = FONTS.NAME;
    const label = truncateTo(ctx, (meta.label || id).replace(/_/g, ' '), slotW - 10);
    drawShadowText(ctx, label, cx, slotY + slotH - 10, 'center');
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

    // vitaux
    const { hunger, thirst } = getVitals(userId);

    // image
    const file = await renderInventoryImage(userId).catch(() => null);

    const emb = new EmbedBuilder()
      .setColor(0x3b2f2f)
      .setTitle(`Sacoche de ${displayName}`)
      .setDescription(
        `🍖 **Faim** : \`${bar(hunger)}\` ${hunger}%\n` +
        `💧 **Soif** : \`${bar(thirst)}\` ${thirst}%\n`
      )
      .setFooter({ text: 'OTW — Inventaire' });

    if (file) {
      emb.setImage('attachment://inventory.png');
    } else {
      emb.addFields({
        name: 'Affichage graphique désactivé',
        value: 'Installe `canvas` (`npm i canvas`) pour afficher la sacoche en 1024×1024.'
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('inv_give').setLabel('Donner').setStyle(ButtonStyle.Success).setEmoji('🟩'),
      new ButtonBuilder().setCustomId('inv_use').setLabel('Utiliser').setStyle(ButtonStyle.Primary).setEmoji('🟦'),
      new ButtonBuilder().setCustomId('inv_drop').setLabel('Jeter').setStyle(ButtonStyle.Danger).setEmoji('🟥'),
    );

    await interaction.reply({
      embeds: [emb],
      files: file ? [file] : [],
      components: [row],
      allowedMentions: { users: [] },
    });

    // Anti-timeout 3s local : on capture le clic et on répond tout de suite
    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000,
    });

    collector.on('collect', async (i) => {
      await i.deferUpdate().catch(() => {});
      // ici: pas de followUp -> ton handler global prend la main
    });

    collector.on('end', () => {
      // optionnel: laisser les boutons actifs
    });
  }
};
