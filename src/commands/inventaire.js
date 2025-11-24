// src/commands/inventaire.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  MessageFlags,
} = require('discord.js');

const path = require('path');
const fs   = require('fs');

// Store inventaire + métadonnées items
const {
  getUser,
  totalWeight,
  getVitals,
  addItem,
  removeItem,
  consumeItem,
} = require('../data/inventoryStore');
const catalog = require('../data/itemCatalog');
const { getOrCreateAccount } = require('../economyData'); // ← pour récupérer le liquide courant

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
// GRILLE
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

const COL_NUDGE = [ 0, 0, 11, 40, 60 ];
const ROW_NUDGE = [ 0, 0, 0, 0, 0 ];

// Position du poids ACTUEL
const WEIGHT_TEXT = { X: 473, Y: 165, FONT: '26px Arial', COLOR: '#EDEDED', SHADOW: 'rgba(0,0,0,0.75)' };

// Polices overlays
const FONTS = { NAME:'14px Arial', META:'12px Arial', COLOR:'#FFFFFF', SHADOW:'rgba(0,0,0,0.65)' };

// DEBUG
const DEBUG_GRID  = false;
const DEBUG_INDEX = false;

// ─────────────────────────────────────────────────────────────
// Helpers texte/coords
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
// Résolution d’icône robuste
const strip = (s) =>
  (s || '')
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_');

// index label->id (catalog)
const labelIndex = (() => {
  const idx = {};
  for (const id of Object.keys(catalog)) {
    const lab = catalog[id]?.label || id;
    idx[strip(lab)] = id;
  }
  return idx;
})();

function resolveIconId(rawId) {
  if (!rawId) return null;

  const direct = path.join(ICONS_DIR, `${rawId}.png`);
  if (fs.existsSync(direct)) return rawId;

  const byLabel = labelIndex[strip(rawId)];
  if (byLabel && fs.existsSync(path.join(ICONS_DIR, `${byLabel}.png`))) return byLabel;

  const normalized = strip(rawId).replace(/amelior[eé]/, 'ameliorer');
  if (fs.existsSync(path.join(ICONS_DIR, `${normalized}.png`))) return normalized;

  return null;
}

// ─────────────────────────────────────────────────────────────
// Rendu image inventaire
async function renderInventoryImage(userId) {
  if (!CANVAS_AVAILABLE) return null;

  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');

  const bg = await loadImage(BAG_BG);
  ctx.drawImage(bg, 0, 0, 1024, 1024);

  const st = getUser(userId);
  const tw = totalWeight(st);
  ctx.font = WEIGHT_TEXT.FONT;
  ctx.shadowColor = WEIGHT_TEXT.SHADOW;
  ctx.shadowBlur  = 4;
  ctx.fillStyle = WEIGHT_TEXT.COLOR;
  ctx.fillText(`${tw.toFixed(2)}`, WEIGHT_TEXT.X, WEIGHT_TEXT.Y);
  ctx.shadowBlur = 0;

  if (DEBUG_GRID || DEBUG_INDEX) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.fillStyle   = 'rgba(255,255,255,0.55)';
    ctx.font        = '12px Arial';
    for (let r = 0; r < GRID.ROWS; r++) {
      for (let c = 0; c < GRID.COLS; c++) {
        const { x, y, w, h, cx } = getSlotRect(c, r);
        if (DEBUG_GRID)  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        if (DEBUG_INDEX) ctx.fillText(String(r * GRID.COLS + c), cx - 4, y + 14);
      }
    }
  }

  // Items "réels" + injection de l’argent liquide en premier slot
  const rawItems = Array.isArray(st.items) ? st.items : [];
  let items = rawItems.slice(0, GRID.COLS * GRID.ROWS);

  try {
    const acc = getOrCreateAccount(userId);
    const cash = Math.floor(acc?.courant?.liquide || 0);
    if (cash > 0) {
      const cashItem = { name: 'argent_icone', quantity: cash };
      items = [cashItem, ...rawItems].slice(0, GRID.COLS * GRID.ROWS);
    }
  } catch {
    // si economyData plante, on continue sans l’argent
  }

  for (let i = 0; i < items.length; i++) {
    const it  = items[i];
    const raw = it.name || it.id;
    const id  = resolveIconId(raw) || raw;
    const qty = typeof it.quantity === 'number' ? it.quantity : 1;

    const col = i % GRID.COLS;
    const row = Math.floor(i / GRID.COLS);
    const { x: slotX, y: slotY, w: slotW, h: slotH, cx, cy } = getSlotRect(col, row);

    const iconPath = path.join(ICONS_DIR, `${id}.png`);
    if (fs.existsSync(iconPath)) {
      try {
        const img = await loadImage(iconPath);
        const scale = Math.min(slotW / img.width, slotH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, cx - w/2, cy - h/2, w, h);
      } catch {
        ctx.strokeStyle = 'rgba(255,255,255,0.20)';
        ctx.strokeRect(slotX + 0.5, slotY + 0.5, slotW - 1, slotH - 1);
      }
    } else if (!DEBUG_GRID) {
      ctx.strokeStyle = 'rgba(255,255,255,0.20)';
      ctx.strokeRect(slotX + 0.5, slotY + 0.5, slotW - 1, slotH - 1);
    }

    const meta   = catalog[id] || catalog[raw] || {};
    const weight = (meta.weight ?? 0);

    if ((meta.stackable ?? true) && qty > 1) {
      ctx.font = FONTS.META;
      drawShadowText(ctx, `x${qty}`, slotX + 6, slotY + 14, 'left');
    }

    ctx.font = FONTS.META;
    drawShadowText(ctx, `${weight.toFixed(1)}kg`, slotX + slotW - 6, slotY + 14, 'right');

    ctx.font = FONTS.NAME;
    const labelSource = meta.label || raw;
    const label = truncateTo(ctx, labelSource.replace(/_/g, ' '), slotW - 10);
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
        { label: 'Donner',   value: 'give', emoji: '🟩', description: 'Donner un objet à un joueur (mention)' },
        { label: 'Utiliser', value: 'use',  emoji: '🟦', description: 'Utiliser / consommer un objet' },
        { label: 'Jeter',    value: 'drop', emoji: '🟥', description: 'Jeter un objet au sol' }
      ])
  );
}
function toOptionsFromItems(items) {
  return items.slice(0, 25).map(it => {
    const idGuess = resolveIconId(it.name || it.id) || (it.name || it.id);
    const meta = catalog[idGuess] || catalog[it.name || it.id] || {};
    const qty  = typeof it.quantity === 'number' ? it.quantity : 1;
    const label = (meta.label || it.name || it.id).replace(/_/g, ' ');
    const desc  = `x${qty}` + (meta.weight ? ` — ${meta.weight}kg` : '');
    return { label, value: idGuess, description: desc };
  });
}
const niceName = (id) => (catalog[id]?.label || id).replace(/_/g, ' ');

// Utilitaires
async function buildEmbedWithImage(userId, displayName) {
  const { hunger, thirst } = getVitals(userId);
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
  return { emb, file };
}

// ─────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventaire')
    .setDescription('Affiche ta sacoche et propose des actions (donner / utiliser / jeter).'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const displayName = interaction.member?.displayName || interaction.user.username;

    const { emb, file } = await buildEmbedWithImage(userId, displayName);

    await interaction.reply({
      embeds: [emb],
      files: file ? [file] : [],
      components: [buildActionMenu()]
    });

    const msg = await interaction.fetchReply();

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 180_000
    });

    let pendingGiveItemId = null;

    collector.on('collect', async (i) => {
      if (i.user.id !== userId) {
        return i.reply({ content: '⛔ Seul le propriétaire peut utiliser ce menu.', flags: MessageFlags.Ephemeral });
      }

      if (i.customId === 'inv_action') {
        const action = i.values[0];
        const st = getUser(userId);
        const items = Array.isArray(st.items) ? st.items : [];

        if (!items.length) {
          const { emb } = await buildEmbedWithImage(userId, displayName);
          emb.addFields({ name: 'Info', value: '📦 Inventaire vide.' });
          return i.update({ embeds: [emb], components: [buildActionMenu()] });
        }

        if (action === 'use') {
          const consumables = items.filter(it => {
            const idGuess = resolveIconId(it.name || it.id) || (it.name || it.id);
            return catalog[idGuess]?.consumable === true;
          });
          if (!consumables.length) {
            const { emb } = await buildEmbedWithImage(userId, displayName);
            emb.addFields({ name: 'Info', value: 'Aucun consommable disponible.' });
            return i.update({ embeds: [emb], components: [buildActionMenu()] });
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

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('inv_give_item')
            .setPlaceholder('Sélectionner l’objet à donner…')
            .addOptions(toOptionsFromItems(items))
        );
        return i.update({
          embeds: [ new EmbedBuilder().setColor(0x2ecc71).setTitle('Donner — Choix de l’objet') ],
          components: [row]
        });
      }

      // Utiliser = consommation réelle
      if (i.customId === 'inv_use_item') {
        const id = i.values[0];

        const result = consumeItem(userId, id, 1);
        if (!result.ok) {
          let msg;
          switch (result.reason) {
            case 'NOT_FOUND':
            case 'NOT_ENOUGH':
              msg = '❌ Tu ne possèdes plus cet objet.'; break;
            case 'NOT_CONSUMABLE':
              msg = '❌ Cet objet ne peut pas être consommé.'; break;
            default:
              msg = '❌ Impossible de consommer cet objet.'; break;
          }
          return i.update({
            embeds: [ new EmbedBuilder().setColor(0xe74c3c).setDescription(msg) ],
            components: [buildActionMenu()]
          });
        }

        const { hungerDelta, thirstDelta } = result.effect || {};
        const { emb, file } = await buildEmbedWithImage(userId, displayName);

        let effectText = `✅ Tu as utilisé **${niceName(id)}**.`;
        const changes = [];
        if (typeof hungerDelta === 'number' && hungerDelta !== 0) {
          changes.push(`🍖 Faim : \`${hungerDelta > 0 ? '+' : ''}${hungerDelta}\``);
        }
        if (typeof thirstDelta === 'number' && thirstDelta !== 0) {
          changes.push(`💧 Soif : \`${thirstDelta > 0 ? '+' : ''}${thirstDelta}\``);
        }
        if (changes.length) effectText += `\n${changes.join(' • ')}`;

        emb.addFields({ name: 'Effets', value: effectText });

        return i.update({
          embeds: [emb],
          files: file ? [file] : [],
          components: [buildActionMenu()]
        });
      }

      // Jeter
      if (i.customId === 'inv_drop_item') {
        const id = i.values[0];

        try {
          removeItem(userId, id, 1);
        } catch {
          return i.update({
            embeds: [ new EmbedBuilder().setColor(0xe74c3c).setDescription(`❌ Impossible de jeter **${niceName(id)}**.`) ],
            components: [buildActionMenu()]
          });
        }

        const { emb, file } = await buildEmbedWithImage(userId, displayName);
        emb.addFields({ name: 'Action', value: `🗑️ Tu as jeté **${niceName(id)}**.` });

        return i.update({
          embeds: [emb],
          files: file ? [file] : [],
          components: [buildActionMenu()]
        });
      }

      // Donner
      if (i.customId === 'inv_give_item') {
        pendingGiveItemId = i.values[0];

        const { emb } = await buildEmbedWithImage(userId, displayName);
        emb.addFields({
          name: 'Donner',
          value: `Objet sélectionné : **${niceName(pendingGiveItemId)}**\n` +
                 `👉 **Mentionne** maintenant le joueur cible dans le chat (ex: @Nom).`
        });

        return i.update({ embeds: [emb], components: [buildActionMenu()] });
      }
    });

    const msgCollector = msg.channel.createMessageCollector({
      time: 180_000,
      filter: m => m.author.id === userId
    });

    msgCollector.on('collect', async (m) => {
      if (!pendingGiveItemId) return;
      const target = m.mentions.users.first();
      if (!target || target.bot) {
        return m.reply({ content: '❌ Mention invalide. Réessaie en mentionnant la personne (@Nom).', allowedMentions: { users: [] } })
          .then(mm => setTimeout(() => mm.delete().catch(()=>{}), 5000))
          .catch(()=>{});
      }

      try {
        removeItem(userId, pendingGiveItemId, 1);
        addItem(target.id, pendingGiveItemId, 1);
      } catch {
        await m.reply({ content: '❌ Transfert impossible.', allowedMentions: { users: [] } }).catch(()=>{});
        pendingGiveItemId = null;
        return;
      }

      const { emb, file } = await buildEmbedWithImage(userId, displayName);
      emb.addFields({ name: 'Donner', value: `🤝 Tu as donné **${niceName(pendingGiveItemId)}** à <@${target.id}>.` });

      try {
        await msg.edit({
          embeds: [emb],
          files: file ? [file] : [],
          components: [buildActionMenu()]
        });
      } catch {}

      await m.reply({ content: `✅ Transfert effectué à <@${target.id}>.`, allowedMentions: { users: [] } })
        .then(mm => setTimeout(() => mm.delete().catch(()=>{}), 5000))
        .catch(()=>{});
      setTimeout(() => m.delete().catch(()=>{}), 2000);

      pendingGiveItemId = null;
    });

    collector.on('end', async () => {
      try { await msg.edit({ components: [] }); } catch {}
      msgCollector.stop('done');
    });
  }
};
