// src/events/starterPack.js
require('dotenv').config({ path: './id.env' });
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionsBitField,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getOrCreateAccount, updateAccount } = require('../economyData');
const { getOrCreateInventory, updateInventory } = require('../inventoryData');

// ---------- persistence : une seule fois par joueur jusqu'à /resetpack ----------
const dataDir = process.env.DATA_DIR || '/data';
const CLAIMS_PATH = path.join(dataDir, 'starterClaims.json');

function ensureDataDir() {
  try { if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true }); } catch {}
}
ensureDataDir();

function loadClaims() {
  try {
    if (!fs.existsSync(CLAIMS_PATH)) return {};
    return JSON.parse(fs.readFileSync(CLAIMS_PATH, 'utf8') || '{}');
  } catch { return {}; }
}
function saveClaims(obj) {
  try { fs.writeFileSync(CLAIMS_PATH, JSON.stringify(obj, null, 2), 'utf8'); } catch {}
}

let claims = loadClaims(); // { userId: { claimedAt } }
const processing = new Set(); // anti double-clic simultané

module.exports = (client) => {
  client.once('ready', async () => {
    const chId = process.env.STARTER_PACK_CHANNEL;
    if (!chId) return console.error('STARTER_PACK_CHANNEL non défini');
    const ch = await client.channels.fetch(chId).catch(() => null);
    if (!ch || !ch.isTextBased()) return console.error('Salon Starter-Pack introuvable / non textuel');

    // ne renvoie pas en double
    const fetched = await ch.messages.fetch({ limit: 50 }).catch(() => null);
    if (fetched?.some(m => m.embeds[0]?.title === '🎒 Starter Pack')) return;

    const embed = new EmbedBuilder()
      .setTitle('🎒 Starter Pack')
      .setColor(0xFFD700)
      .setDescription(
        'Bienvenue ! Clique sur le bouton ci-dessous pour récupérer ton pack de bienvenue :\n' +
        '**50 $** et un **Cheval de Kentucky** ajoutés à ton inventaire.\n\n' +
        '_Une seule fois. Après ton clic, ce salon devient caché pour toi._'
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('starter_pack_claim')
        .setLabel('🎒 Récupérer mon starter pack')
        .setStyle(ButtonStyle.Success)
    );

    await ch.send({ embeds: [embed], components: [row] });
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== 'starter_pack_claim') return;
    const channel = interaction.channel;
    const user = interaction.user;
    const userId = user.id;

    if (processing.has(userId)) {
      return interaction.reply({ content: '⏳ Patiente, ta demande est en cours…', flags: MessageFlags.Ephemeral });
    }
    processing.add(userId);

    try {
      // déjà pris ?
      if (claims[userId]) {
        return interaction.reply({ content: '⚠️ Tu as **déjà** pris le Starter Pack.', flags: MessageFlags.Ephemeral });
      }

      // 1) give 50$ + cheval (idempotent côté inventaire si tu veux: vérifie avant d’ajouter)
      const acc = getOrCreateAccount(userId);
      acc.courant.liquide += 50;
      updateAccount(userId, acc);

      const inv = getOrCreateInventory(userId);
      inv.items = inv.items || [];
      inv.items.push({ name: 'Cheval de Kentucky', quantity: 1 });
      updateInventory(userId, inv);

      // 2) marquer la claim
      claims[userId] = { claimedAt: Date.now() };
      saveClaims(claims);

      // 3) DM stylé
      const dmEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🎁 Starter Pack — OTW')
        .setDescription(
          `Bienvenue, **${user.username}** !\n\n` +
          `Tu viens de recevoir :\n` +
          `• **50 $** (compte courant)\n` +
          `• **Cheval de Kentucky** (inventaire)\n\n` +
          `Bonne aventure 🤠`
        );
      try { await user.send({ embeds: [dmEmbed] }); } catch { /* DM fermés */ }

      // 4) rendre le salon invisible pour ce joueur
      // -> on crée/édite un overwrite d’interdiction de ViewChannel
      try {
        await channel.permissionOverwrites.edit(userId, {
          ViewChannel: false
        }, { reason: 'Starter Pack consommé : cacher le salon pour cet utilisateur' });
      } catch (e) {
        console.error('Impossible de masquer le salon pour', userId, e);
      }

      // 5) réponse éphémère
      await interaction.reply({
        content: '✅ Starter Pack récupéré ! Regarde tes **MP** 📬',
        flags: MessageFlags.Ephemeral
      });
    } catch (err) {
      console.error('Erreur Starter Pack :', err);
      try {
        await interaction.reply({ content: '❗ Erreur. Réessaie plus tard.', flags: MessageFlags.Ephemeral });
      } catch {}
    } finally {
      processing.delete(userId);
    }
  });
};
