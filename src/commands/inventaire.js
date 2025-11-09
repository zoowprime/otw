// src/commands/inventaire.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

const path = require('path');
const fs   = require('fs');

// Inventaire (nouveau store)
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

// (optionnel) Police custom si dispos — place ta TTF dans src/assets/fonts/ et décommente
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
// PARAMÈTRES UI (faciles à ajuster)
const GRID = {
  COLS: 5,
  ROWS: 5,
  SLOT_W: 96,
  SLOT_H: 120,

  // coin haut-gauche du 1er slot sur l'image Sacoche.png
  LEFT: 170,     // ↔️ augmente = pousse à droite
  TOP:  220,     // ↕️ augmente = descend

  // espacement entre slots
  XGAP: 35,
  YGAP: 28,
};

// position du texte du poids **actuel uniquement** (le “/ 60.00” est déjà sur ton fond)
// ⇣ Ajustée pour tomber au niveau de l’encadré rouge
const WEIGHT_TEXT = {
  X: 448,             // plus grand = plus à droite
  Y: 118,             // plus grand = plus bas
  FONT: '26px Arial', // remplace par '26px OTW' si tu enregistres une police
  COLOR: '#EDEDED',
  SHADOW: 'rgba(0,0,0,0.75)',
};

// polices dans les cases
const FONTS = {
  NAME:  '14px Arial', // ou '14px OTW'
  META:  '12px Arial',
  COLOR: '#FFFFFF',
  SHADOW:'rgba(0,0,0,0.65)',
};

// DEBUG: dessiner les cadres des 25 slots (utile pour caler LEFT/TOP/GAPs)
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

// barre ascii (pour description embed)
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

  // debug slots (facultatif)
  if (DEBUG_GRID) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    for (let r = 0; r < GRID.ROWS; r++) {
      for (let c = 0; c < GRID.COLS; c++) {
        const slotX = GRID.LEFT + c * (GRID.SLOT_W + GRID.XGAP);
        const slotY = GRID.TOP  + r * (GRID.SLOT_H + GRID.YGAP);
        ctx.strokeRect(slotX + 0.5, slotY + 0.5, GRID.SLOT_W - 1, GRID.SLOT_H - 1);
      }
    }
  }

  // items (centrés dans chaque slot)
  const items = Array.isArray(st.items) ? st.items.slice(0, GRID.COLS * GRID.ROWS) : [];

  for (let i = 0; i < items.length; i++) {
    const it  = items[i];
    const id  = it.name || it.id;
    const qty = typeof it.quantity === 'number' ? it.quantity : 1;

    const col = i % GRID.COLS;
    const row = Math.floor(i / GRID.COLS);

    const slotX = GRID.LEFT + col * (GRID.SLOT_W + GRID.XGAP);
    const slotY = GRID.TOP  + row * (GRID.SLOT_H + GRID.YGAP);

    const cx = slotX + GRID.SLOT_W / 2;
    const cy = slotY + GRID.SLOT_H / 2;

    // icône centrée si dispo
    const iconPath = path.join(ICONS_DIR, `${id}.png`);
    if (fs.existsSync(iconPath)) {
      try {
        const img = await loadImage(iconPath);
        const scale = Math.min(GRID.SLOT_W / img.width, GRID.SLOT_H / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
      } catch {
        // ignore
      }
    } else if (!DEBUG_GRID) {
      // cadre discret si pas d’icône et pas en mode debug
      ctx.strokeStyle = 'rgba(255,255,255,0.20)';
      ctx.strokeRect(slotX + 0.5, slotY + 0.5, GRID.SLOT_W - 1, GRID.SLOT_H - 1);
    }

    // textes overlay
    const meta   = catalog[id] || {};
    const weight = (meta.weight ?? 0);

    // qty en haut-gauche si stackable et qty > 1
    if ((meta.stackable ?? true) && qty > 1) {
      ctx.font = FONTS.META;
      drawShadowText(ctx, `x${qty}`, slotX + 6, slotY + 14, 'left');
    }

    // poids en haut-droit
    ctx.font = FONTS.META;
    drawShadowText(ctx, `${weight.toFixed(1)}kg`, slotX + GRID.SLOT_W - 6, slotY + 14, 'right');

    // nom centré en bas, tronqué
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

    // vitaux (décroissance appliquée côté store)
    const { hunger, thirst } = getVitals(userId);
    const tw = totalWeight(userId);

    // image 1024x1024
    const file = await renderInventoryImage(userId).catch(() => null);

    const emb = new EmbedBuilder()
      .setColor(0x3b2f2f)
      .setTitle(`Sacoche de <@${userId}>`)
      .setDescription(
        `**Weight:** ${tw.toFixed(2)} / 60.00\n\n` +
        `🍖 **Faim** : \`${bar(hunger)}\`\n${hunger}%\n` +
        `💧 **Soif** : \`${bar(thirst)}\`\n${thirst}%\n`
      )
      .setFooter({ text: 'OTW — Inventaire' });

    if (file) {
      emb.setImage('attachment://inventory.png');
    } else {
      emb.addFields({
        name: 'Affichage graphique désactivé',
        value: 'Installe `canvas` (`npm i canvas`) pour afficher la sacoche en 1024×1024 avec les icônes centrées.'
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('inv_give').setLabel('Donner').setStyle(ButtonStyle.Success).setEmoji('🟩'),
      new ButtonBuilder().setCustomId('inv_use').setLabel('Utiliser').setStyle(ButtonStyle.Primary).setEmoji('🟦'),
      new ButtonBuilder().setCustomId('inv_drop').setLabel('Jeter').setStyle(ButtonStyle.Danger).setEmoji('🟥'),
    );

    if (file) {
      await interaction.reply({ embeds: [emb], files: [file], components: [row] });
    } else {
      await interaction.reply({ embeds: [emb], components: [row], flags: MessageFlags.Ephemeral });
    }
  }
};
