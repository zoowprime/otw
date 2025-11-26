// src/commands/propriete.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
  MessageFlags,
} = require('discord.js');

const path = require('path');
const fs   = require('fs');
const { createCanvas, loadImage } = require('canvas');

const catalog = require('../data/itemCatalog');
const {
  getUser,
  addItem,
  removeItem,
  canCarry,
} = require('../data/inventoryStore');

const {
  getProperty,
  getAllProperties,
  listPropertiesForUser,
  userHasAccessToProperty,
  storageTotalWeight,
  canStoreItem,
  addItemToProperty,
  removeItemFromProperty,
  addKeyholder,
  removeKeyholder,
  markRentPaid,
  setProperty,
} = require('../data/propertyStore');

const { getOrCreateAccount, updateAccount } = require('../economyData');

// Pour les loyers : champ banque de l’entreprise du propriétaire (landlord)
const SUB_ACCOUNT_ENTREPRISE_BANQUE = 'entreprise_banque';

// ──────────────────────────────────────────────
// Assets & rendu stockage

const STOCK_BG  = path.join(__dirname, '..', 'assets', 'inventory', 'stockage_propriete.png');
const ICONS_DIR = path.join(__dirname, '..', 'assets', 'icones');

// Grille similaire à l’inventaire (5x5)
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

const COL_NUDGE = [0, 0, 11, 40, 60];
const ROW_NUDGE = [0, 0, 0, 0, 0];

const OWNER_TEXT  = { X: 230, Y: 90, FONT: '30px "Times New Roman"', COLOR: '#F8F8F0' };
const WEIGHT_TEXT = { X: 473, Y: 165, FONT: '30px "Times New Roman"', COLOR: '#F8F8F0' };
const CASH_TEXT   = { X: 830, Y: 90, FONT: '30px "Times New Roman"', COLOR: '#F8F8F0' };

const FONTS = { NAME: '14px Arial', META: '12px Arial', COLOR: '#FFFFFF', SHADOW: 'rgba(0,0,0,0.65)' };

function getSlotRect(col, row) {
  const x = GRID.LEFT + col * (GRID.SLOT_W + GRID.XGAP) + (COL_NUDGE[col] || 0);
  const y = GRID.TOP  + row * (GRID.SLOT_H  + GRID.YGAP) + (ROW_NUDGE[row] || 0);
  return { x, y, w: GRID.SLOT_W, h: GRID.SLOT_H, cx: x + GRID.SLOT_W/2, cy: y + GRID.SLOT_H/2 };
}

function truncateTo(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}
function drawShadowText(ctx, text, x, y, align = 'left', color = FONTS.COLOR, shadow = FONTS.SHADOW) {
  ctx.textAlign    = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle    = color;
  ctx.shadowColor  = shadow;
  ctx.shadowBlur   = 4;
  ctx.fillText(text, x, y);
  ctx.shadowBlur   = 0;
}

// résolution icônes

const strip = (s) =>
  (s || '')
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_');

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

async function renderStorageImage(property, ownerDisplayName) {
  const bg = await loadImage(STOCK_BG);
  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(bg, 0, 0, 1024, 1024);

  // propriétaire
  ctx.font = OWNER_TEXT.FONT;
  ctx.fillStyle = OWNER_TEXT.COLOR;
  ctx.textAlign = 'left';
  ctx.fillText(ownerDisplayName, OWNER_TEXT.X, OWNER_TEXT.Y);

  // poids
  const w = storageTotalWeight(property.storage);
  ctx.font = WEIGHT_TEXT.FONT;
  ctx.textAlign = 'center';
  ctx.fillText(`${w.toFixed(2)} kg`, WEIGHT_TEXT.X, WEIGHT_TEXT.Y);

  // argent liquide dans le coffre
  const cash = property.storage && typeof property.storage.cash === 'number'
    ? property.storage.cash
    : 0;
  ctx.font = CASH_TEXT.FONT;
  ctx.textAlign = 'center';
  ctx.fillText(`${cash.toLocaleString('fr-FR')} $`, CASH_TEXT.X, CASH_TEXT.Y);

  // items
  const items = Array.isArray(property.storage.items)
    ? property.storage.items.slice(0, GRID.COLS * GRID.ROWS)
    : [];

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
        const iw = img.width * scale;
        const ih = img.height * scale;
        ctx.drawImage(img, cx - iw/2, cy - ih/2, iw, ih);
      } catch {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.strokeRect(slotX + 0.5, slotY + 0.5, slotW - 1, slotH - 1);
      }
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.strokeRect(slotX + 0.5, slotY + 0.5, slotW - 1, slotH - 1);
    }

    const meta   = catalog[id] || catalog[raw] || {};
    const weight = meta.weight ?? 0;

    ctx.font = FONTS.META;
    drawShadowText(ctx, `${weight.toFixed(1)}kg`, slotX + slotW - 6, slotY + 14, 'right');

    if ((meta.stackable ?? true) && qty > 1) {
      ctx.font = FONTS.META;
      drawShadowText(ctx, `x${qty}`, slotX + 6, slotY + 14, 'left');
    }

    ctx.font = FONTS.NAME;
    const label = truncateTo(
      ctx,
      (meta.label || raw).replace(/_/g, ' '),
      slotW - 10
    );
    drawShadowText(ctx, label, cx, slotY + slotH - 10, 'center');
  }

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'stockage_propriete.png' });
}

// ──────────────────────────────────────────────
// Helpers économie (loyer + argent liquide)

function getBalanceRef(acc, choice) {
  switch (choice) {
    case 'entreprise_banque':
      return acc.entreprise?.banque ?? 0;
    case 'courant_banque':
      return acc.courant?.banque ?? 0;
    default:
      return null;
  }
}

function setBalanceRef(acc, choice, val) {
  switch (choice) {
    case 'entreprise_banque':
      if (!acc.entreprise) acc.entreprise = { liquide: 0, banque: 0 };
      acc.entreprise.banque = val;
      break;
    case 'courant_banque':
      if (!acc.courant) acc.courant = { liquide: 0, banque: 0 };
      acc.courant.banque = val;
      break;
  }
}

// ──────────────────────────────────────────────
// UI

const footer = { text: 'OTW — Propriétés' };

function statusLabel(p, userId) {
  if (p.ownerPlayerId === userId) {
    if (p.status === 'RENTED') return 'Propriétaire (louée)';
    if (p.status === 'OWNED')  return 'Propriétaire';
  }
  if (p.tenantId === userId) return 'Locataire';
  if (Array.isArray(p.keyholders) && p.keyholders.includes(userId)) return 'Clé partagée';
  return p.status;
}

function propToOption(p, userId) {
  const label  = truncate(`🏠 ${p.name}`, 90);
  const descr  = `${p.type} • ${statusLabel(p, userId)}`;
  return { label, value: p.id, description: descr };
}

function truncate(str, max) {
  if (!str) return '';
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

function buildStorageButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prop_storage_deposit')
      .setEmoji('📥')
      .setLabel('Déposer un item')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('prop_storage_withdraw')
      .setEmoji('📤')
      .setLabel('Retirer un item')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('prop_storage_deposit_cash')
      .setEmoji('💵')
      .setLabel('Déposer argent')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('prop_storage_withdraw_cash')
      .setEmoji('💸')
      .setLabel('Retirer argent')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('prop_storage_close')
      .setEmoji('❌')
      .setLabel('Fermer')
      .setStyle(ButtonStyle.Danger),
  );
}

// ──────────────────────────────────────────────
// Commande

module.exports = {
  data: new SlashCommandBuilder()
    .setName('propriete')
    .setDescription('Gestion de tes propriétés (biens, stockage, clés, loyers).')
    .addSubcommand(sc =>
      sc.setName('mesbiens')
        .setDescription('Liste tes propriétés et celles où tu as une clé.'),
    )
    .addSubcommand(sc =>
      sc.setName('voir')
        .setDescription('Voir les détails d’une propriété que tu possèdes ou dont tu as la clé.')
        .addStringOption(o =>
          o.setName('id')
            .setDescription('ID interne de la propriété (optionnel, sinon menu).')
            .setRequired(false),
        ),
    )
    .addSubcommand(sc =>
      sc.setName('stockage')
        .setDescription('Accéder au coffre d’une de tes propriétés (ou où tu as une clé).'),
    )
    .addSubcommand(sc =>
      sc.setName('partagercles')
        .setDescription('Donner une clé d’une de tes propriétés à un joueur.')
        .addStringOption(o =>
          o.setName('id')
            .setDescription('ID interne de la propriété.')
            .setRequired(true),
        )
        .addUserOption(o =>
          o.setName('cible')
            .setDescription('Joueur à qui tu donnes la clé.')
            .setRequired(true),
        ),
    )
    .addSubcommand(sc =>
      sc.setName('retirercles')
        .setDescription('Retirer la clé d’une propriété à un joueur.')
        .addStringOption(o =>
          o.setName('id')
            .setDescription('ID interne de la propriété.')
            .setRequired(true),
        )
        .addUserOption(o =>
          o.setName('cible')
            .setDescription('Joueur à qui tu retires la clé.')
            .setRequired(true),
        ),
    )
    .addSubcommand(sc =>
      sc.setName('payerloyer')
        .setDescription('Payer le loyer d’une propriété que tu loues.')
        .addStringOption(o =>
          o.setName('id')
            .setDescription('ID interne de la propriété louée.')
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // ─────────────────────── /propriete mesbiens
    if (sub === 'mesbiens') {
      const props = listPropertiesForUser(userId);
      if (!props.length) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x3498db)
              .setTitle('🏠 Tes biens immobiliers')
              .setDescription('Tu ne possèdes aucune propriété et tu n’as aucune clé.'),
          ],
        });
      }

      const emb = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🏠 Tes biens immobiliers')
        .setFooter(footer);

      for (const p of props) {
        const status = statusLabel(p, userId);
        const loyer  = p.rentAmount
          ? `${p.rentAmount.toLocaleString('fr-FR')} $ / ${p.rentEveryDays || 7} jours`
          : 'Aucun loyer (achat définitif)';

        emb.addFields({
          name: `${p.name} — ${status}`,
          value:
            `• Type : **${p.type}**\n` +
            (p.location ? `• Localisation : ${p.location}\n` : '') +
            `• Loyer : ${loyer}\n` +
            `• ID : \`${p.id}\``,
        });
      }

      return interaction.reply({ embeds: [emb] });
    }

    // ─────────────────────── /propriete voir
    if (sub === 'voir') {
      let id = interaction.options.getString('id');

      if (!id) {
        // Si pas d’ID, on propose un select des propriétés accessibles
        const props = listPropertiesForUser(userId);
        if (!props.length) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle('🏠 Voir une propriété')
                .setDescription('Tu n’as accès à aucune propriété.'),
            ],
            ephemeral: true,
          });
        }

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('prop_select_voir')
            .setPlaceholder('Choisis une propriété à afficher')
            .addOptions(props.slice(0, 25).map(p => propToOption(p, userId))),
        );

        const msg = await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x3498db)
              .setTitle('🏠 Voir une propriété')
              .setDescription('Sélectionne une propriété dans la liste ci-dessous.'),
          ],
          components: [row],
          ephemeral: true,
          fetchReply: true,
        });

        const collector = msg.createMessageComponentCollector({
          componentType: ComponentType.StringSelect,
          time: 60_000,
          filter: (i) => i.user.id === userId,
        });

        collector.on('collect', async (i) => {
          const chosenId = i.values[0];
          const p = getProperty(chosenId);
          if (!p || !userHasAccessToProperty(userId, p)) {
            return i.update({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xe74c3c)
                  .setTitle('Erreur')
                  .setDescription('Cette propriété est introuvable ou tu n’y as plus accès.'),
              ],
              components: [],
            });
          }

          const emb = describePropertyEmbed(p, userId, interaction.client);
          return i.update({ embeds: [emb], components: [] });
        });

        collector.on('end', async (collected) => {
          if (collected.size === 0) {
            try {
              await msg.edit({
                components: [],
                embeds: [
                  new EmbedBuilder()
                    .setColor(0x95a5a6)
                    .setTitle('🏠 Voir une propriété')
                    .setDescription('Sélection expirée. Relance la commande si besoin.'),
                ],
              });
            } catch {}
          }
        });

        return;
      }

      const prop = getProperty(id);
      if (!prop || !userHasAccessToProperty(userId, prop)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('Erreur')
              .setDescription('Propriété introuvable ou accès refusé.'),
          ],
          ephemeral: true,
        });
      }

      const emb = describePropertyEmbed(prop, userId, interaction.client);
      return interaction.reply({ embeds: [emb] });
    }

    // ─────────────────────── /propriete stockage
    if (sub === 'stockage') {
      const props = listPropertiesForUser(userId);
      if (!props.length) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('📦 Stockage de propriété')
              .setDescription('Tu n’as accès à aucun coffre de propriété.'),
          ],
          ephemeral: true,
        });
      }

      const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('prop_select_stockage')
          .setPlaceholder('Choisis la propriété pour ouvrir son coffre')
          .addOptions(props.slice(0, 25).map(p => propToOption(p, userId))),
      );

      const msg = await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1abc9c)
            .setTitle('📦 Stockage de propriété')
            .setDescription('Sélectionne une propriété dont tu veux ouvrir le coffre.'),
        ],
        components: [selectRow],
        ephemeral: true,
        fetchReply: true,
      });

      let currentPropertyId = null;

      const collector = msg.createMessageComponentCollector({
        time: 15 * 60_000,
        filter: (i) => i.user.id === userId,
      });

      collector.on('collect', async (i) => {
        if (i.customId === 'prop_select_stockage') {
          currentPropertyId = i.values[0];
          const prop = getProperty(currentPropertyId);
          if (!prop || !userHasAccessToProperty(userId, prop)) {
            return i.update({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xe74c3c)
                  .setTitle('Erreur')
                  .setDescription('Propriété introuvable ou accès refusé.'),
              ],
              components: [],
            });
          }

          const ownerName = await resolveOwnerName(i, prop);
          const file = await renderStorageImage(prop, ownerName);

          const emb = new EmbedBuilder()
            .setColor(0x1abc9c)
            .setTitle(`📦 Coffre de ${prop.name}`)
            .setDescription('Utilise les boutons ci-dessous pour déposer ou retirer des **items** ou de l’**argent liquide**.')
            .setImage('attachment://stockage_propriete.png')
            .setFooter(footer);

          return i.update({
            embeds: [emb],
            files: [file],
            components: [buildStorageButtons()],
          });
        }

        if (!currentPropertyId) {
          return i.reply({
            content: '❌ Choisis d’abord une propriété avec le menu déroulant.',
            flags: MessageFlags.Ephemeral,
          });
        }

        const prop = getProperty(currentPropertyId);
        if (!prop || !userHasAccessToProperty(userId, prop)) {
          return i.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('Erreur')
                .setDescription('Propriété introuvable ou accès refusé.'),
            ],
            components: [],
          });
        }

        if (i.customId === 'prop_storage_close') {
          collector.stop('closed');
          return i.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('📦 Coffre fermé')
                .setDescription('Tu peux relancer `/propriete stockage` à tout moment.'),
            ],
            components: [],
            files: [],
          });
        }

        // ── Dépôt d’items
        if (i.customId === 'prop_storage_deposit') {
          const inv = getUser(userId);
          const items = Array.isArray(inv.items) ? inv.items : [];
          if (!items.length) {
            return i.update({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xe67e22)
                  .setTitle(`📦 Coffre de ${prop.name}`)
                  .setDescription('Ton inventaire est vide, tu ne peux rien déposer.'),
              ],
              components: [buildStorageButtons()],
            });
          }

          const select = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('prop_storage_deposit_item')
              .setPlaceholder('Choisis l’item à déposer')
              .addOptions(items.slice(0, 25).map((it) => {
                const raw  = it.name || it.id;
                const meta = catalog[raw] || {};
                const qty  = typeof it.quantity === 'number' ? it.quantity : 1;
                return {
                  label: truncate((meta.label || raw).replace(/_/g, ' '), 90),
                  description: `x${qty}`,
                  value: raw,
                };
              })),
          );

          return i.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0x1abc9c)
                .setTitle(`📥 Déposer un item — ${prop.name}`)
                .setDescription('Sélectionne l’item à déposer dans le coffre.'),
            ],
            components: [select],
            files: [],
          });
        }

        // ── Retrait d’items
        if (i.customId === 'prop_storage_withdraw') {
          const items = Array.isArray(prop.storage.items) ? prop.storage.items : [];
          if (!items.length) {
            return i.update({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xe67e22)
                  .setTitle(`📦 Coffre de ${prop.name}`)
                  .setDescription('Le coffre est vide, tu ne peux rien retirer.'),
              ],
              components: [buildStorageButtons()],
              files: [],
            });
          }

          const select = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('prop_storage_withdraw_item')
              .setPlaceholder('Choisis l’item à retirer')
              .addOptions(items.slice(0, 25).map((it) => {
                const raw  = it.name || it.id;
                const meta = catalog[raw] || {};
                const qty  = typeof it.quantity === 'number' ? it.quantity : 1;
                return {
                  label: truncate((meta.label || raw).replace(/_/g, ' '), 90),
                  description: `x${qty}`,
                  value: raw,
                };
              })),
          );

          return i.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0x1abc9c)
                .setTitle(`📤 Retirer un item — ${prop.name}`)
                .setDescription('Sélectionne l’item à retirer du coffre.'),
            ],
            components: [select],
            files: [],
          });
        }

        // ── Dépôt d’argent liquide
        if (i.customId === 'prop_storage_deposit_cash') {
          await handleCashDepositStep(i, userId, prop);
          return;
        }

        // ── Retrait d’argent liquide
        if (i.customId === 'prop_storage_withdraw_cash') {
          await handleCashWithdrawStep(i, userId, prop);
          return;
        }

        // Choix de l’item à déposer
        if (i.customId === 'prop_storage_deposit_item') {
          const itemId = i.values[0];
          await handleDepositAmountStep(i, userId, prop, itemId);
          return;
        }

        // Choix de l’item à retirer
        if (i.customId === 'prop_storage_withdraw_item') {
          const itemId = i.values[0];
          await handleWithdrawAmountStep(i, userId, prop, itemId);
          return;
        }
      });

      collector.on('end', async () => {
        try {
          await msg.edit({ components: [] });
        } catch {}
      });

      return;
    }

    // ─────────────────────── /propriete partagercles
    if (sub === 'partagercles') {
      const id    = interaction.options.getString('id');
      const cible = interaction.options.getUser('cible');

      const prop = getProperty(id);
      if (!prop) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('Erreur')
              .setDescription('Propriété introuvable.'),
          ],
          ephemeral: true,
        });
      }
      if (prop.ownerPlayerId !== userId) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('Accès refusé')
              .setDescription('Seul le propriétaire de la propriété peut donner des clés.'),
          ],
          ephemeral: true,
        });
      }
      if (prop.keyholders.includes(cible.id) || prop.ownerPlayerId === cible.id) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('Info')
              .setDescription(`${cible} a déjà accès à cette propriété.`),
          ],
          ephemeral: true,
        });
      }

      addKeyholder(id, cible.id);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('🗝️ Clé partagée')
            .setDescription(`Tu as donné une clé de **${prop.name}** à ${cible}.`),
        ],
      });
    }

    // ─────────────────────── /propriete retirercles
    if (sub === 'retirercles') {
      const id    = interaction.options.getString('id');
      const cible = interaction.options.getUser('cible');

      const prop = getProperty(id);
      if (!prop) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('Erreur')
              .setDescription('Propriété introuvable.'),
          ],
          ephemeral: true,
        });
      }
      if (prop.ownerPlayerId !== userId) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('Accès refusé')
              .setDescription('Seul le propriétaire de la propriété peut retirer des clés.'),
          ],
          ephemeral: true,
        });
      }
      if (!prop.keyholders.includes(cible.id)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('Info')
              .setDescription(`${cible} n’a pas de clé pour cette propriété.`),
          ],
          ephemeral: true,
        });
      }

      removeKeyholder(id, cible.id);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('🗝️ Clé retirée')
            .setDescription(`Tu as retiré la clé de **${prop.name}** à ${cible}.`),
        ],
      });
    }

    // ─────────────────────── /propriete payerloyer
    if (sub === 'payerloyer') {
      const id = interaction.options.getString('id');
      const prop = getProperty(id);
      if (!prop) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('Erreur')
              .setDescription('Propriété introuvable.'),
          ],
          ephemeral: true,
        });
      }
      if (prop.tenantId !== userId) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('Accès refusé')
              .setDescription('Tu n’es pas locataire de cette propriété.'),
          ],
          ephemeral: true,
        });
      }
      if (!prop.rentAmount || !prop.landlordId) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('Info')
              .setDescription('Aucun loyer n’est défini pour cette propriété.'),
          ],
          ephemeral: true,
        });
      }

      const now = Date.now();
      const dueTs = prop.nextRentTs || now;
      if (now < dueTs - 5 * 60 * 1000) { // un peu de marge
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x3498db)
              .setTitle('Loyer pas encore dû')
              .setDescription('Le loyer n’est pas encore exigible. Tu pourras le payer plus tard.'),
          ],
          ephemeral: true,
        });
      }

      const montant = prop.rentAmount;

      const tenantAcc   = getOrCreateAccount(userId);
      const landlordAcc = getOrCreateAccount(prop.landlordId);

      const tenantBal = getBalanceRef(tenantAcc, 'courant_banque');
      if (tenantBal === null || tenantBal < montant) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('Fonds insuffisants')
              .setDescription(
                `Tu n’as pas assez d’argent sur ton **compte courant (banque)** pour payer le loyer de **${prop.name}**.\n` +
                `Montant requis : ${montant.toLocaleString('fr-FR')} $`
              ),
          ],
          ephemeral: true,
        });
      }

      const landBal = getBalanceRef(landlordAcc, SUB_ACCOUNT_ENTREPRISE_BANQUE) ?? 0;

      setBalanceRef(tenantAcc, 'courant_banque', tenantBal - montant);
      setBalanceRef(landlordAcc, SUB_ACCOUNT_ENTREPRISE_BANQUE, landBal + montant);
      updateAccount(userId, tenantAcc);
      updateAccount(prop.landlordId, landlordAcc);

      const { property: updated } = markRentPaid(prop.id, now, prop.rentEveryDays);

      const nextDate = updated.nextRentTs
        ? `<t:${Math.floor(updated.nextRentTs / 1000)}:d>`
        : 'inconnue';

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('✅ Loyer payé')
            .setDescription(
              `Tu as payé **${montant.toLocaleString('fr-FR')} $** pour le loyer de **${prop.name}**.\n` +
              `Prochaine échéance : ${nextDate}.`
            )
            .setFooter(footer),
        ],
      });
    }
  },
};

// ──────────────────────────────────────────────
// Helpers locaux supplémentaires

function describePropertyEmbed(p, userId, client) {
  const owner  = p.ownerPlayerId ? `<@${p.ownerPlayerId}>` : 'Aucun';
  const tenant = p.tenantId      ? `<@${p.tenantId}>`      : 'Aucun';

  const kh = Array.isArray(p.keyholders) && p.keyholders.length
    ? p.keyholders.map(id => `<@${id}>`).join(', ')
    : 'Personne';

  const status = statusLabel(p, userId);
  const loyer  = p.rentAmount
    ? `${p.rentAmount.toLocaleString('fr-FR')} $ / ${p.rentEveryDays || 7} jours`
    : 'Aucun (achat définitif)';

  const next  = p.nextRentTs
    ? `<t:${Math.floor(p.nextRentTs / 1000)}:R>`
    : 'Non défini';

  const cash = p.storage && typeof p.storage.cash === 'number'
    ? p.storage.cash
    : 0;

  return new EmbedBuilder()
    .setColor(0x2980b9)
    .setTitle(`🏠 ${p.name}`)
    .setDescription(
      `• Type : **${p.type}**\n` +
      (p.location ? `• Localisation : ${p.location}\n` : '') +
      `• Statut : **${status}**\n` +
      `• ID : \`${p.id}\`\n` +
      `• Argent dans le coffre : **${cash.toLocaleString('fr-FR')} $**`
    )
    .addFields(
      { name: 'Propriétaire', value: owner, inline: true },
      { name: 'Locataire',    value: tenant, inline: true },
      { name: 'Clés',         value: kh, inline: false },
      { name: 'Loyer',        value: loyer, inline: true },
      { name: 'Prochaine échéance', value: next, inline: true },
    )
    .setFooter({ text: 'OTW — Propriétés' });
}

async function resolveOwnerName(interaction, prop) {
  const guild = interaction.guild;
  if (!guild || !prop.ownerPlayerId) return 'Inconnu';
  try {
    const member = await guild.members.fetch(prop.ownerPlayerId);
    return member.displayName || member.user.username;
  } catch {
    return 'Inconnu';
  }
}

// Étape : saisir la quantité à déposer (item)
async function handleDepositAmountStep(i, userId, prop, itemId) {
  await i.update({
    embeds: [
      new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle(`📥 Déposer — ${prop.name}`)
        .setDescription(
          `Tu as choisi **${(catalog[itemId]?.label || itemId).replace(/_/g, ' ')}**.\n` +
          'Envoie maintenant **la quantité** à déposer dans le chat (nombre).'
        ),
    ],
    components: [],
    files: [],
  });

  const channel = i.channel;
  const msgCollector = channel.createMessageCollector({
    time: 60_000,
    max: 1,
    filter: (m) => m.author.id === userId,
  });

  msgCollector.on('collect', async (m) => {
    const raw = m.content.replace(',', '.').trim();
    const qty = Number(raw);
    if (!Number.isFinite(qty) || qty <= 0) {
      await i.message.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Montant invalide')
            .setDescription('Opération annulée. Utilise un nombre positif.'),
        ],
        components: [buildStorageButtons()],
      });
      return;
    }

    const check = canStoreItem(prop.id, itemId, qty);
    if (!check.ok && check.reason === 'OVERWEIGHT') {
      await i.message.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Coffre trop plein')
            .setDescription(
              `Ce dépôt dépasserait la capacité du coffre (**${check.max} kg** max).\n` +
              `Poids actuel : **${check.current.toFixed(2)} kg**.`
            ),
        ],
        components: [buildStorageButtons()],
      });
      return;
    }

    const r = removeItem(userId, itemId, qty);
    if (!r.ok) {
      await i.message.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Inventaire insuffisant')
            .setDescription('Tu ne possèdes pas assez de cet item.'),
        ],
        components: [buildStorageButtons()],
      });
      return;
    }

    const r2 = addItemToProperty(prop.id, itemId, qty);
    if (!r2.ok) {
      addItem(userId, itemId, qty);
      await i.message.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Erreur coffre')
            .setDescription('Impossible de déposer cet item dans la propriété.'),
        ],
        components: [buildStorageButtons()],
      });
      return;
    }

    const updatedProp = r2.property;
    const ownerName = await resolveOwnerName(i, updatedProp);
    const file = await renderStorageImage(updatedProp, ownerName);

    await i.message.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle(`📦 Coffre de ${updatedProp.name}`)
          .setDescription(
            `Tu as déposé **${qty}x ${(catalog[itemId]?.label || itemId).replace(/_/g, ' ')}**.\n` +
            'Le coffre a été mis à jour.'
          )
          .setImage('attachment://stockage_propriete.png')
          .setFooter(footer),
      ],
      files: [file],
      components: [buildStorageButtons()],
    });

    setTimeout(() => m.delete().catch(() => {}), 2000);
  });

  msgCollector.on('end', async (collected) => {
    if (collected.size === 0) {
      try {
        await i.message.edit({
          embeds: [
            new EmbedBuilder()
              .setColor(0x95a5a6)
              .setTitle('📥 Dépôt annulé')
              .setDescription('Aucun montant saisi, opération annulée.'),
          ],
          components: [buildStorageButtons()],
        });
      } catch {}
    }
  });
}

// Étape : saisir la quantité à retirer (item)
async function handleWithdrawAmountStep(i, userId, prop, itemId) {
  await i.update({
    embeds: [
      new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle(`📤 Retirer — ${prop.name}`)
        .setDescription(
          `Tu as choisi **${(catalog[itemId]?.label || itemId).replace(/_/g, ' ')}**.\n` +
          'Envoie maintenant **la quantité** à retirer (nombre).'
        ),
    ],
    components: [],
    files: [],
  });

  const channel = i.channel;
  const msgCollector = channel.createMessageCollector({
    time: 60_000,
    max: 1,
    filter: (m) => m.author.id === userId,
  });

  msgCollector.on('collect', async (m) => {
    const raw = m.content.replace(',', '.').trim();
    const qty = Number(raw);
    if (!Number.isFinite(qty) || qty <= 0) {
      await i.message.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Montant invalide')
            .setDescription('Opération annulée. Utilise un nombre positif.'),
        ],
        components: [buildStorageButtons()],
      });
      return;
    }

    const can = canCarry(userId, itemId, qty);
    if (!can) {
      await i.message.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Trop lourd')
            .setDescription('Tu ne peux pas porter autant, ton inventaire dépasserait sa capacité.'),
        ],
        components: [buildStorageButtons()],
      });
      return;
    }

    const r = removeItemFromProperty(prop.id, itemId, qty);
    if (!r.ok) {
      await i.message.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Coffre insuffisant')
            .setDescription('Il n’y a pas assez de cet item dans le coffre.'),
        ],
        components: [buildStorageButtons()],
      });
      return;
    }

    const r2 = addItem(userId, itemId, qty);
    if (!r2.ok) {
      addItemToProperty(prop.id, itemId, qty);
      await i.message.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Erreur inventaire')
            .setDescription('Impossible d’ajouter cet item dans ton inventaire.'),
        ],
        components: [buildStorageButtons()],
      });
      return;
    }

    const updatedProp = r.property;
    const ownerName = await resolveOwnerName(i, updatedProp);
    const file = await renderStorageImage(updatedProp, ownerName);

    await i.message.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle(`📦 Coffre de ${updatedProp.name}`)
          .setDescription(
            `Tu as retiré **${qty}x ${(catalog[itemId]?.label || itemId).replace(/_/g, ' ')}**.\n` +
            'Le coffre a été mis à jour.'
          )
          .setImage('attachment://stockage_propriete.png')
          .setFooter(footer),
      ],
      files: [file],
      components: [buildStorageButtons()],
    });

    setTimeout(() => m.delete().catch(() => {}), 2000);
  });

  msgCollector.on('end', async (collected) => {
    if (collected.size === 0) {
      try {
        await i.message.edit({
          embeds: [
            new EmbedBuilder()
              .setColor(0x95a5a6)
              .setTitle('📤 Retrait annulé')
              .setDescription('Aucun montant saisi, opération annulée.'),
          ],
          components: [buildStorageButtons()],
        });
      } catch {}
    }
  });
}

// Étape : dépôt d’argent liquide
async function handleCashDepositStep(i, userId, prop) {
  await i.update({
    embeds: [
      new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle(`💵 Déposer de l’argent — ${prop.name}`)
        .setDescription(
          'Envoie maintenant **la somme en dollars** à déposer dans le coffre (nombre entier, ex: `250`).\n\n' +
          '_Cet argent sera prélevé de ton **liquide**._'
        ),
    ],
    components: [],
    files: [],
  });

  const channel = i.channel;
  const msgCollector = channel.createMessageCollector({
    time: 60_000,
    max: 1,
    filter: (m) => m.author.id === userId,
  });

  msgCollector.on('collect', async (m) => {
    const raw = m.content.replace(',', '.').trim();
    const amount = Math.floor(Number(raw));
    if (!Number.isFinite(amount) || amount <= 0) {
      await i.message.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Montant invalide')
            .setDescription('Opération annulée. Utilise un nombre entier positif.'),
        ],
        components: [buildStorageButtons()],
      });
      return;
    }

    const acc = getOrCreateAccount(userId);
    const liquide = acc.courant?.liquide ?? 0;

    if (liquide < amount) {
      await i.message.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Fonds insuffisants')
            .setDescription(
              `Tu n’as pas assez d’argent **liquide**.\n` +
              `Montant demandé : ${amount.toLocaleString('fr-FR')} $\n` +
              `Ton liquide actuel : ${liquide.toLocaleString('fr-FR')} $`
            ),
        ],
        components: [buildStorageButtons()],
      });
      return;
    }

    // Débiter le liquide du joueur
    if (!acc.courant) acc.courant = { liquide: 0, banque: 0 };
    acc.courant.liquide = liquide - amount;
    updateAccount(userId, acc);

    // Créditer le coffre de la propriété
    const fullProp = getProperty(prop.id);
    if (!fullProp.storage) fullProp.storage = { items: [], weightMax: 120, cash: 0 };
    if (typeof fullProp.storage.cash !== 'number') fullProp.storage.cash = 0;
    fullProp.storage.cash += amount;
    const updatedProp = setProperty(fullProp);

    const ownerName = await resolveOwnerName(i, updatedProp);
    const file = await renderStorageImage(updatedProp, ownerName);

    await i.message.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle(`📦 Coffre de ${updatedProp.name}`)
          .setDescription(
            `Tu as déposé **${amount.toLocaleString('fr-FR')} $** en liquide dans le coffre.\n` +
            'Le coffre a été mis à jour.'
          )
          .setImage('attachment://stockage_propriete.png')
          .setFooter(footer),
      ],
      files: [file],
      components: [buildStorageButtons()],
    });

    setTimeout(() => m.delete().catch(() => {}), 2000);
  });

  msgCollector.on('end', async (collected) => {
    if (collected.size === 0) {
      try {
        await i.message.edit({
          embeds: [
            new EmbedBuilder()
              .setColor(0x95a5a6)
              .setTitle('💵 Dépôt annulé')
              .setDescription('Aucun montant saisi, dépôt d’argent annulé.'),
          ],
          components: [buildStorageButtons()],
        });
      } catch {}
    }
  });
}

// Étape : retrait d’argent liquide
async function handleCashWithdrawStep(i, userId, prop) {
  const fullProp = getProperty(prop.id);
  const currentCash = fullProp.storage && typeof fullProp.storage.cash === 'number'
    ? fullProp.storage.cash
    : 0;

  if (currentCash <= 0) {
    return i.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe67e22)
          .setTitle(`💸 Retrait d’argent — ${prop.name}`)
          .setDescription('Il n’y a **aucun argent liquide** dans ce coffre.'),
      ],
      components: [buildStorageButtons()],
      files: [],
    });
  }

  await i.update({
    embeds: [
      new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle(`💸 Retirer de l’argent — ${prop.name}`)
        .setDescription(
          `Il y a actuellement **${currentCash.toLocaleString('fr-FR')} $** dans ce coffre.\n\n` +
          'Envoie maintenant **la somme en dollars** à retirer (nombre entier).'
        ),
    ],
    components: [],
    files: [],
  });

  const channel = i.channel;
  const msgCollector = channel.createMessageCollector({
    time: 60_000,
    max: 1,
    filter: (m) => m.author.id === userId,
  });

  msgCollector.on('collect', async (m) => {
    const raw = m.content.replace(',', '.').trim();
    const amount = Math.floor(Number(raw));
    if (!Number.isFinite(amount) || amount <= 0) {
      await i.message.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Montant invalide')
            .setDescription('Opération annulée. Utilise un nombre entier positif.'),
        ],
        components: [buildStorageButtons()],
      });
      return;
    }

    const refreshedProp = getProperty(prop.id);
    if (!refreshedProp.storage) refreshedProp.storage = { items: [], weightMax: 120, cash: 0 };
    if (typeof refreshedProp.storage.cash !== 'number') refreshedProp.storage.cash = 0;

    if (refreshedProp.storage.cash < amount) {
      await i.message.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Fonds insuffisants dans le coffre')
            .setDescription(
              `Il n’y a pas assez d’argent dans ce coffre.\n` +
              `Montant demandé : ${amount.toLocaleString('fr-FR')} $\n` +
              `Montant disponible : ${refreshedProp.storage.cash.toLocaleString('fr-FR')} $`
            ),
        ],
        components: [buildStorageButtons()],
      });
      return;
    }

    // Débiter le coffre
    refreshedProp.storage.cash -= amount;
    const updatedProp = setProperty(refreshedProp);

    // Créditer le joueur en liquide
    const acc = getOrCreateAccount(userId);
    if (!acc.courant) acc.courant = { liquide: 0, banque: 0 };
    acc.courant.liquide = (acc.courant.liquide ?? 0) + amount;
    updateAccount(userId, acc);

    const ownerName = await resolveOwnerName(i, updatedProp);
    const file = await renderStorageImage(updatedProp, ownerName);

    await i.message.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle(`📦 Coffre de ${updatedProp.name}`)
          .setDescription(
            `Tu as retiré **${amount.toLocaleString('fr-FR')} $** en liquide du coffre.\n` +
            'Le coffre a été mis à jour.'
          )
          .setImage('attachment://stockage_propriete.png')
          .setFooter(footer),
      ],
      files: [file],
      components: [buildStorageButtons()],
    });

    setTimeout(() => m.delete().catch(() => {}), 2000);
  });

  msgCollector.on('end', async (collected) => {
    if (collected.size === 0) {
      try {
        await i.message.edit({
          embeds: [
            new EmbedBuilder()
              .setColor(0x95a5a6)
              .setTitle('💸 Retrait annulé')
              .setDescription('Aucun montant saisi, retrait d’argent annulé.'),
          ],
          components: [buildStorageButtons()],
        });
      } catch {}
    }
  });
}
