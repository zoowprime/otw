// src/events/starterPack.js
require('dotenv').config({ path: './id.env' });

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

const fs   = require('fs');
const path = require('path');

const { getOrCreateAccount, updateAccount } = require('../economyData');
// Nouveau système d’inventaire (celui utilisé par /inventaire)
const { addItem } = require('../data/inventoryStore');

const dataDir     = process.env.DATA_DIR || '/data';
const CLAIMS_PATH = path.join(dataDir, 'starterClaims.json');

// ──────────────────────────────────────────────
// FS helpers

function ensureDataDir() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch {}
}
ensureDataDir();

function loadClaims() {
  try {
    if (!fs.existsSync(CLAIMS_PATH)) return {};
    return JSON.parse(fs.readFileSync(CLAIMS_PATH, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function saveClaims(obj) {
  try {
    fs.writeFileSync(CLAIMS_PATH, JSON.stringify(obj, null, 2), 'utf8');
  } catch {}
}

// Anti double-clic simultané
const processing = new Set();

// ──────────────────────────────────────────────
// Module export

module.exports = (client) => {
  // Envoi du message de Starter Pack au démarrage
  client.once('ready', async () => {
    const chId = process.env.STARTER_PACK_CHANNEL;
    if (!chId) {
      console.error('STARTER_PACK_CHANNEL non défini dans id.env');
      return;
    }

    const ch = await client.channels.fetch(chId).catch(() => null);
    if (!ch || !ch.isTextBased()) {
      console.error('Salon Starter-Pack introuvable ou non textuel');
      return;
    }

    // Éviter les doublons de message de starter pack
    const fetched = await ch.messages.fetch({ limit: 50 }).catch(() => null);
    if (fetched?.some(m => m.embeds[0]?.title === '🎒 Starter Pack')) return;

    const botAvatar = client.user?.displayAvatarURL({ size: 256 }) || null;

    const embed = new EmbedBuilder()
      .setTitle('🎒 Starter Pack')
      .setColor(0x3498db)
      .setThumbnail(botAvatar)
      .setDescription(
        'Bienvenue sur **OTW** 🤠\n\n' +
        'Pour bien démarrer ton aventure, tu peux récupérer **une seule fois** ce pack de bienvenue.'
      )
      .addFields(
        {
          name: '📦 Contenu du pack',
          value:
            '• 💵 **50 $** sur ton **compte courant** (`liquide`)\n' +
            '• 🐎 Accès à un **Cheval de Kentucky** via ton système d’**écurie**\n' +
            '• 🔪 **Couteau** ajouté à ton inventaire\n',
        },
        {
          name: '⚠️ Conditions',
          value:
            '• Utilisable **une seule fois par joueur**\n' +
            '• Après récupération, **ce salon sera caché pour toi**',
        },
        {
          name: '✅ Comment faire ?',
          value: 'Clique sur le bouton ci-dessous pour récupérer ton Starter Pack.',
        }
      )
      .setFooter({ text: 'OTW — Pack de bienvenue' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('starter_pack_claim')
        .setLabel('🎒 Récupérer mon Starter Pack')
        .setStyle(ButtonStyle.Success),
    );

    await ch.send({ embeds: [embed], components: [row] });
  });

  // Gestion du clic sur le bouton
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== 'starter_pack_claim') return;

    const channel = interaction.channel;
    const user    = interaction.user;
    const userId  = user.id;

    // Anti spam / double-clic
    if (processing.has(userId)) {
      return interaction.reply({
        content: '⏳ Patiente, ta demande de Starter Pack est déjà en cours de traitement…',
        flags: MessageFlags.Ephemeral,
      });
    }
    processing.add(userId);

    try {
      const claims = loadClaims();

      // Déjà récupéré
      if (claims[userId]) {
        return interaction.reply({
          content: '⚠️ Tu as **déjà récupéré** ton Starter Pack.',
          flags: MessageFlags.Ephemeral,
        });
      }

      // ─────────────────────────────────────
      // 1) Argent : 50 $ sur compte courant (champ liquide)
      // ─────────────────────────────────────
      const acc = getOrCreateAccount(userId);

      // Sécurisation structure compte courant
      if (!acc.courant) acc.courant = { liquide: 0, banque: 0 };
      acc.courant.liquide = (acc.courant.liquide || 0) + 50;

      updateAccount(userId, acc);

      // ─────────────────────────────────────
      // 2) Inventaire : Couteau (nouveau système /inventaire)
      // ─────────────────────────────────────
      // On suppose que l’ID de l’item dans le catalog est "couteau".
      // Adapte si dans ton catalog ça s’appelle autrement (ex: "knife_basic").
      addItem(userId, 'couteau', 1);

      // ─────────────────────────────────────
      // 3) Marquer la claim
      //    (peut être relu plus tard dans /écurie pour donner le Kentucky si besoin)
      // ─────────────────────────────────────
      claims[userId] = { claimedAt: Date.now() };
      saveClaims(claims);

      // ─────────────────────────────────────
      // 4) MP au joueur (joli récapitulatif)
      // ─────────────────────────────────────
      const dmEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🎁 Starter Pack — OTW')
        .setDescription(
          `Bienvenue, **${user.username}** !\n\n` +
          'Tu viens de recevoir :'
        )
        .addFields(
          {
            name: '💵 Argent',
            value: '• **50 $** ajoutés à ton **compte courant (liquide)**',
          },
          {
            name: '🔪 Équipement',
            value: '• **Couteau** ajouté à ton inventaire.',
          },
          {
            name: '🐎 Cheval de Kentucky',
            value:
              '• Tu auras accès à un **Cheval de Kentucky** via la commande `/écurie` ' +
              '(la gestion détaillée se fait dans ton système d’écurie).',
          }
        )
        .setFooter({ text: 'OTW — Bonne aventure 🤠' });

      try {
        await user.send({ embeds: [dmEmbed] });
      } catch {
        // DM fermés, pas bloquant
      }

      // ─────────────────────────────────────
      // 5) Masquer le salon pour ce joueur
      // ─────────────────────────────────────
      try {
        await channel.permissionOverwrites.edit(
          userId,
          { ViewChannel: false },
          { reason: 'Starter Pack consommé' },
        );
      } catch (e) {
        console.error('Impossible de masquer le salon Starter Pack pour', userId, e);
      }

      // ─────────────────────────────────────
      // 6) Réponse éphémère dans le salon
      // ─────────────────────────────────────
      await interaction.reply({
        content: '✅ Starter Pack récupéré ! Regarde tes **messages privés** 📬',
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      console.error('Erreur Starter Pack :', err);
      try {
        await interaction.reply({
          content: '❗ Une erreur est survenue. Réessaie plus tard.',
          flags: MessageFlags.Ephemeral,
        });
      } catch {}
    } finally {
      processing.delete(userId);
    }
  });
};
