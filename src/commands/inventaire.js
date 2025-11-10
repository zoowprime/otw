// src/commands/inventaire.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  ComponentType,
} = require('discord.js');

const path = require('path');
const fs   = require('fs');

// Store inventaire + métadonnées items
const { getUser, totalWeight, getVitals } = require('../data/inventoryStore');
const catalog = require('../data/itemCatalog');

// ─────────────────────────────────────────────────────────────
// Canvas 1024×1024
let createCanvas, loadImage, registerFont, CANVAS_AVAILABLE = false;
try {
  ({ createCanvas, loadImage, registerFont } = require('canvas'));
  CANVAS_AVAILABLE = true;
} catch {
  CANVAS_AVAILABLE = false;
}

// ─────────────────────────────────────────────────────────────
// Assets
const BAG_BG    = path.join(__dirname, '..', 'assets', 'inventory', 'Sacoche.png');
const ICONS_DIR = path.join(__dirname, '..', 'assets', 'icones');

// ─────────────────────────────────────────────────────────────
// COORDONNÉES DES CASES (grille 5×5)
// Chaque case (slot) est calculée ainsi :
//   slotX = LEFT + col * (SLOT_W + XGAP) + COL_NUDGE[col]
//   slotY = TOP  + row * (SLOT_H  + YGAP) + ROW_NUDGE[row]
const GRID = {
  COLS: 5,
  ROWS: 5,
  SLOT_W: 96,
  SLOT_H: 120,
  LEFT: 170,  // origine X de la 1ère case
  TOP:  220,  // origine Y de la 1ère case
  XGAP: 35,   // espacement horizontal entre cases
  YGAP: 28,   // espacement vertical entre cases
};

// Micro-corrections si ton image n’est pas parfaitement régulière
const COL_NUDGE = [0, 0, 6, 0, 0]; // colonne 3 (index 2) +6px vers la droite
const ROW_NUDGE = [0, 0, 0, 0, 0]; // ajuste une rangée (+ = descend)

// Position du texte du poids ACTUEL (le “/ 60.00” est déjà sur l’image)
const WEIGHT_TEXT = {
  X: 463,
  Y: 160,
  FONT: '26px Arial',
  COLOR: '#EDEDED',
  SHADOW: 'rgba(0,0,0,0.75)',
};

// Polices overlays
const FONTS = {
  NAME:  '14px Arial',
  META:  '12px Arial',
  COLOR: '#FFFFFF',
  SHADOW:'rgba(0,0,0,0.65)',
};

// DEBUG
const DEBUG_GRID  = false;
const DEBUG_INDEX = false;

// ─────────────────────────────────────────────────────────────
// Helpers graphiques
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
function getSlotRect(col, row) {
  const x = GRID.LEFT + col * (GRID.SLOT_W + GRID.XGAP) + (COL_NUDGE[col] || 0);
  const y = GRID.TOP  + row * (GRID.SLOT_H  + GRID.YGAP) + (ROW_NUDGE[row] || 0);
  return { x, y, w: GRID.SLOT_W, h: GRID.SLOT_H, cx: x + GRID.SLOT_W/2, cy: y + GRID.SLOT_H/2 };
}

// ─────────────────────────────────────────────────────────────
// Rendu de l’inventaire en image
async function renderInventoryImage(userId) {
  if (!CANVAS_AVAILABLE) return null;

  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');

  // fond
  const bg = await loadImage(BAG_BG);
  ctx.drawImage(bg, 0, 0, 1024, 1024);

  // poids actuel (le "/ 60.00" est sur l'image)
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
        ctx.drawImage(img, cx - w/2, cy - h/2, w, h);
      } catch { /* ignore */ }
    } else if (!DEBUG_GRID) {
      ctx.strokeStyle = 'rgba(255,255,255,0.20)';
      ctx.strokeRect(slotX + 0.5, slotY + 0.5, slotW - 1, slotH - 1);
    }

    // overlay
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
// Menus
function buildActionMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('inv_action')
      .setPlaceholder('Choisir une action…')
      .addOptions([
        { label: 'Donner',   value: 'give', emoji: '🟩', description: 'Donner un objet à un joueur' },
        { label: 'Utiliser', value: 'use',  emoji: '🟦', description: 'Utiliser / consommer un objet' },
        { label: 'Jeter',    value: 'drop', emoji: '🟥', description: 'Jeter un objet au sol' }
      ])
  );
}
function toOptionsFromItems(items) {
  return items.slice(0, 25).map(it => {
    const id = it.name || it.id;
    const meta = catalog[id] || {};
    const qty  = typeof it.quantity === 'number' ? it.quantity : 1;
    const label = (meta.label || id).replace(/_/g, ' ');
    const desc  = `x${qty}` + (meta.weight ? ` — ${meta.weight}kg` : '');
    return { label, value: id, description: desc };
  });
}

// ─────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventaire')
    .setDescription('Affiche ta sacoche et propose des actions (donner / utiliser / jeter).'),

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

    if (file) emb.setImage('attachment://inventory.png');

    // envoi + menu d’action
    await interaction.reply({
      embeds: [emb],
      files: file ? [file] : [],
      components: [buildActionMenu()]
    });

    const msg = await interaction.fetchReply();

    // collector global (3 minutes)
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 180_000
    });

    collector.on('collect', async (i) => {
      // on traite uniquement l’auteur
      if (i.user.id !== userId) {
        return i.reply({ content: '⛔ Seul le propriétaire peut utiliser ce menu.', ephemeral: true });
      }

      // action principale
      if (i.customId === 'inv_action') {
        const action = i.values[0]; // 'give' | 'use' | 'drop'
        const st = getUser(userId);
        const items = Array.isArray(st.items) ? st.items : [];

        if (!items.length) {
          return i.update({
            embeds: [ new EmbedBuilder().setColor(0x7f8c8d).setTitle('📦 Inventaire vide') ],
            components: [buildActionMenu()]
          });
        }

        if (action === 'use') {
          const consumables = items.filter(it => {
            const id = it.name || it.id;
            return catalog[id]?.consumable === true;
          });
          if (!consumables.length) {
            return i.update({
              embeds: [ new EmbedBuilder().setColor(0x7f8c8d).setTitle('Aucun consommable disponible') ],
              components: [buildActionMenu()]
            });
          }

          const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('inv_use_item')
              .setPlaceholder('Sélectionner un consommable…')
              .addOptions(toOptionsFromItems(consumables))
          );

          return i.update({
            embeds: [ new EmbedBuilder().setColor(0x3498db).setTitle('Utiliser — Choix du consommable') ],
            components: [row]
          });
        }

        if (action === 'drop') {
          const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('inv_drop_item')
              .setPlaceholder('Sélectionner un objet à jeter…')
              .addOptions(toOptionsFromItems(items))
          );

          return i.update({
            embeds: [ new EmbedBuilder().setColor(0xe74c3c).setTitle('Jeter — Choix de l’objet') ],
            components: [row]
          });
        }

        // action === 'give'
        {
          const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('inv_give_item')
              .setPlaceholder('Sélectionner un objet à donner…')
              .addOptions(toOptionsFromItems(items))
          );

          return i.update({
            embeds: [ new EmbedBuilder().setColor(0x2ecc71).setTitle('Donner — Choix de l’objet') ],
            components: [row]
          });
        }
      }

      // Utiliser — sélection d’item
      if (i.customId === 'inv_use_item') {
        const id = i.values[0];
        const name = (catalog[id]?.label || id).replace(/_/g, ' ');

        // Ici on ne modifie pas encore l’inventaire : on affiche juste la confirmation.
        return i.update({
          embeds: [ new EmbedBuilder().setColor(0x3498db).setDescription(`✅ Tu as utilisé **${name}**.`) ],
          components: [buildActionMenu()]
        });
      }

      // Jeter — sélection d’item
      if (i.customId === 'inv_drop_item') {
        const id = i.values[0];
        const name = (catalog[id]?.label || id).replace(/_/g, ' ');
        return i.update({
          embeds: [ new EmbedBuilder().setColor(0xe74c3c).setDescription(`🗑️ Tu as jeté **${name}**.`) ],
          components: [buildActionMenu()]
        });
      }

      // Donner — sélection d’item → sélection du joueur
      if (i.customId === 'inv_give_item') {
        const id = i.values[0];
        const name = (catalog[id]?.label || id).replace(/_/g, ' ');

        const rowUser = new ActionRowBuilder().addComponents(
          new UserSelectMenuBuilder()
            .setCustomId(`inv_give_user:${id}`)
            .setPlaceholder('Choisir le joueur cible…')
            .setMinValues(1)
            .setMaxValues(1)
        );

        return i.update({
          embeds: [ new EmbedBuilder().setColor(0x2ecc71).setDescription(`Objet à donner : **${name}**\nSélectionne le joueur cible.`) ],
          components: [rowUser]
        });
      }

      // Donner — sélection du joueur
      if (i.customId.startsWith('inv_give_user:')) {
        const id = i.customId.split(':')[1];
        const name = (catalog[id]?.label || id).replace(/_/g, ' ');
        const targetId = i.values[0];

        return i.update({
          embeds: [ new EmbedBuilder().setColor(0x2ecc71).setDescription(`🤝 Tu as donné **${name}** à <@${targetId}>.`) ],
          components: [buildActionMenu()]
        });
      }
    });

    collector.on('end', async () => {
      // à la fin, on laisse l’embed tel quel et on enlève les menus
      try {
        await msg.edit({ components: [] });
      } catch {}
    });
  }
};
