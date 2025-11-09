// src/commands/braquage.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');

const { getInventory, removeItem } = require('../data/inventoryData');
const { getOrCreateAccount, updateAccount } = require('../economyData');
const { isUserHeistActive, startHeist, endHeist } = require('../data/heistData');

// 🔗 GIF de crochetage (dans ton repo public)
const CROCHETAGE_GIF = 'https://raw.githubusercontent.com/zoowprime/otw/main/src/assets/crochetagejuif.gif';

// 🎛️ Paramétrage des lieux (durées, intervalles, fourchettes de gains)
const PLACES = [
  { key: 'bank_sd',    label: '🏦 Banque Winchester Saint-Denis', kind: 'bank',    totalSec: 300, tickSec: 15,  min: 2000, max: 3000, color: 0xf1c40f },
  { key: 'bank_rhodes',label: '🏦 Banque de Rhodes',               kind: 'bank',    totalSec: 300, tickSec: 15,  min: 1000, max: 1800, color: 0xf1c40f },
  { key: 'saloon_rhodes',label:'🍺 Saloon de Rhodes',              kind: 'saloon',  totalSec: 180, tickSec: 8,   min: 100,  max: 650,  color: 0x9b59b6 },
  { key: 'saloon_sd',  label: '🍷 Saloon miteux de Saint-Denis',   kind: 'saloon',  totalSec: 180, tickSec: 8,   min: 100,  max: 950,  color: 0x9b59b6 },
  { key: 'post_sd',    label: '📮 Bureau de poste de Saint-Denis', kind: 'post',    totalSec: 180, tickSec: 8,   min: 300,  max: 700,  color: 0x3498db },
  { key: 'post_rhodes',label: '📬 Bureau de poste de Rhodes',      kind: 'post',    totalSec: 180, tickSec: 8,   min: 100,  max: 500,  color: 0x3498db },
  { key: 'post_annes', label: '📨 Bureau de poste d’Annesburg',    kind: 'post',    totalSec: 180, tickSec: 8,   min: 100,  max: 350,  color: 0x3498db },
];

// 🧰 Noms exacts attendus dans l’inventaire
const ITEM_DYNAMITE = 'Dynamites';            // catégorie: "armes" (dans ton système illégal)
const ITEM_KIT      = 'Kit de crochetage';    // catégorie: "autres"

// 🧠 Helpers
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min; // inclusif
}

// Une progression textuelle simple (0..100) en barre
function progressBar(pct) {
  const blocks = 20;
  const filled = Math.max(0, Math.min(blocks, Math.round((pct / 100) * blocks)));
  const bar = '█'.repeat(filled) + '░'.repeat(blocks - filled);
  return `**[${bar}] ${pct}%**`;
}

// Edite un message de progression (0..100) en X secondes (tick visuel 1s)
async function runProgress(message, title, color, totalSec, prefix = '') {
  const start = Date.now();
  const end = start + totalSec * 1000;
  let lastPct = -1;

  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      const now = Date.now();
      const pct = Math.min(100, Math.floor(((now - start) / (end - start)) * 100));
      if (pct !== lastPct) {
        lastPct = pct;
        const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle(title)
          .setDescription(`${prefix}\n${progressBar(pct)}`);

        await message.edit({ embeds: [embed], components: [] }).catch(() => {});
      }
      if (now >= end) {
        clearInterval(interval);
        resolve();
      }
    }, 1000);
  });
}

// Vérifie si l’utilisateur a X quantité d’un item dans une catégorie
function hasItem(inv, category, itemName, qty = 1) {
  const arr = inv.sections?.[category] || [];
  const it = arr.find(e => e.name === itemName);
  return it && it.qty >= qty;
}

// Retire en sécurité un item de l’inventaire (si présent)
// Lève une erreur si impossible (on la catch côté appelant pour afficher un embed)
function takeItem(userId, category, itemName, qty = 1) {
  removeItem(userId, category, itemName, qty);
}

// Créditer l’argent liquide en direct
function creditLiquide(userId, amount) {
  const acc = getOrCreateAccount(userId);
  acc.courant ||= { liquide: 0, banque: 0 };
  acc.courant.liquide = (acc.courant.liquide || 0) + amount;
  updateAccount(userId, acc);
}

// Construction du menu de sélection des lieux
function buildPlaceMenu() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('heist_place')
    .setPlaceholder('💰 Choisis une cible à braquer')
    .addOptions(PLACES.map(p => ({
      label: p.label,
      value: p.key,
      description: `Braquage: ${p.kind.toUpperCase()}`,
      emoji: p.label.startsWith('🏦') ? '🏦' : (p.label.startsWith('📮') || p.label.startsWith('📬') || p.label.startsWith('📨')) ? '📮' : '🍷',
    })));

  return new ActionRowBuilder().addComponents(menu);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('braquage')
    .setDescription('💰 Démarrer un braquage immersif (banque, saloon, poste)'),
  async execute(interaction) {
    const userId = interaction.user.id;

    // 🔒 1 seul braquage actif par joueur
    if (isUserHeistActive(userId)) {
      const emb = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('⛔ Braquage déjà en cours')
        .setDescription('Tu as déjà un braquage actif. Termine-le avant d’en lancer un autre.');
      return interaction.reply({ embeds: [emb] });
    }

    // Étape 1 : choix du lieu
    const introEmb = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('💰 Braquage')
      .setDescription(
        `Sélectionne la **cible** à braquer dans le menu ci-dessous :\n\n` +
        `• 🏦 **Banques**\n` +
        `• 🍷 **Saloons**\n` +
        `• 📮 **Bureaux de poste**\n\n` +
        `*(Aucun rôle requis)*`
      )
      .setFooter({ text: 'OTW • Braquage — Sélection de la cible' });

    const rowPlaces = buildPlaceMenu();
    await interaction.reply({ embeds: [introEmb], components: [rowPlaces] });

    const msg = await interaction.fetchReply();
    const select = await msg.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      time: 90_000
    }).catch(() => null);

    if (!select) {
      return msg.edit({
        embeds: [ new EmbedBuilder().setColor(0x95a5a6).setTitle('⏱️ Temps écoulé').setDescription('Aucune cible sélectionnée.') ],
        components: []
      }).catch(() => {});
    }

    const placeKey = select.values[0];
    const place = PLACES.find(p => p.key === placeKey);
    if (!place) {
      return select.update({
        embeds: [ new EmbedBuilder().setColor(0xe74c3c).setTitle('❌ Cible invalide') ],
        components: []
      });
    }

    // Enregistre le début
    startHeist(userId, { placeKey });

    // Étape 2 : progression “Début du braquage”
    const startEmb = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(`💥 Braquage en cours : ${place.label}`)
      .setDescription(progressBar(0))
      .setFooter({ text: 'OTW • Braquage — Mise en place' });

    await select.update({ embeds: [startEmb], components: [] });
    await runProgress(msg, `💥 Braquage en cours : ${place.label}`, 0xf1c40f, 10, 'Mise en place…'); // 10s de mise en place

    // Étape 3 : Choix de la méthode d’ouverture
    const methodEmb = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('💣 Ouverture du coffre/tiroir')
      .setDescription(
        `Choisis ta méthode :\n\n` +
        `🧨 **Faire exploser** (nécessite 1x *Dynamites* dans **Armes**)\n` +
        `🧰 **Crocheter** (nécessite 1x *Kit de crochetage* dans **Autres**)`
      )
      .setFooter({ text: 'OTW • Méthode d’ouverture' });

    const btnExplode = new ButtonBuilder().setCustomId('heist_explode').setLabel('🧨 Faire exploser').setStyle(ButtonStyle.Danger);
    const btnPick    = new ButtonBuilder().setCustomId('heist_pick').setLabel('🧰 Crocheter').setStyle(ButtonStyle.Primary);
    const rowMethod  = new ActionRowBuilder().addComponents(btnExplode, btnPick);

    await msg.edit({ embeds: [methodEmb], components: [rowMethod] }).catch(() => {});

    const methodClick = await msg.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 90_000
    }).catch(() => null);

    if (!methodClick) {
      endHeist(userId);
      return msg.edit({
        embeds: [ new EmbedBuilder().setColor(0x95a5a6).setTitle('⏱️ Temps écoulé').setDescription('Aucune méthode sélectionnée.') ],
        components: []
      }).catch(() => {});
    }

    // Vérification inventaire selon la méthode
    const inv = getInventory(userId);

    if (methodClick.customId === 'heist_explode') {
      // Besoin 1 Dynamites (armes)
      if (!hasItem(inv, 'armes', ITEM_DYNAMITE, 1)) {
        endHeist(userId);
        return methodClick.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('❌ Dynamite manquante')
              .setDescription(`Il vous manque **1x ${ITEM_DYNAMITE}** dans **Armes** pour faire sauter le coffre.`)
          ],
          components: []
        });
      }

      // Retire la dynamite
      try { takeItem(userId, 'armes', ITEM_DYNAMITE, 1); }
      catch {
        endHeist(userId);
        return methodClick.update({
          embeds: [ new EmbedBuilder().setColor(0xe74c3c).setTitle('❌ Impossible de consommer la dynamite') ],
          components: []
        });
      }

      // Progression explosion (mise à feu)
      await methodClick.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('🧨 Mise à feu…')
            .setDescription(progressBar(0))
            .setFooter({ text: 'OTW • Explosion' })
        ],
        components: []
      });

      await runProgress(msg, '💥 BOUM !', 0xe74c3c, 8, 'Détonation en cours…');
      // coffre ouvert → récolte
    }

    if (methodClick.customId === 'heist_pick') {
      // Besoin 1 Kit de crochetage (autres)
      if (!hasItem(inv, 'autres', ITEM_KIT, 1)) {
        endHeist(userId);
        return methodClick.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('❌ Kit manquant')
              .setDescription(`Il vous manque **1x ${ITEM_KIT}** dans **Autres** pour crocheter.`)
          ],
          components: []
        });
      }

      // Retire le kit
      try { takeItem(userId, 'autres', ITEM_KIT, 1); }
      catch {
        endHeist(userId);
        return methodClick.update({
          embeds: [ new EmbedBuilder().setColor(0xe74c3c).setTitle('❌ Impossible de consommer le kit') ],
          components: []
        });
      }

      // Étapes de crochetage avec progression + GIF
      // 1) Insérer (10s)
      await methodClick.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0x95a5a6)
            .setTitle('🛠️ Crochetage en cours…')
            .setDescription('🔩 **Insertion du crochet…**\n' + progressBar(0))
            .setImage(CROCHETAGE_GIF)
            .setFooter({ text: 'OTW • Progression temps réel' })
        ],
        components: []
      });
      await runProgress(msg, '🛠️ Crochetage en cours…', 0x95a5a6, 10, '🔩 Insertion du crochet…');

      // 2) Tourner (30s)
      await runProgress(msg, '🛠️ Crochetage en cours…', 0x95a5a6, 30, '🔄 Rotation du mécanisme…');

      // 3) Trouver l’angle (40s)
      await runProgress(msg, '🛠️ Crochetage en cours…', 0x95a5a6, 40, '🧭 Recherche de l’angle…');

      // 4) Déverrouiller (5s)
      await runProgress(msg, '🛠️ Crochetage en cours…', 0x95a5a6, 5, '🔓 Déverrouillage…');

      // coffre ouvert → récolte
    }

    // Étape 5 : Récolte – gains progressifs + bouton arrêt
    const totalSec = place.totalSec;
    const tickSec  = place.tickSec;

    const btnStop = new ButtonBuilder()
      .setCustomId('heist_stop')
      .setLabel('🛑 Arrêter')
      .setStyle(ButtonStyle.Secondary);

    let elapsed = 0;
    let totalGained = 0;

    const lootEmb = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('💰 Récolte en cours')
      .setDescription(`Vous fouillez le coffre…\n${progressBar(0)}\n\n*+0$ récupérés pour l’instant…*`)
      .setFooter({ text: 'OTW • Gains en temps réel' });

    await msg.edit({ embeds: [lootEmb], components: [ new ActionRowBuilder().addComponents(btnStop) ] }).catch(() => {});

    // Création du collector pour le bouton "stop"
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: (totalSec + 5) * 1000
    });

    let stopped = false;
    collector.on('collect', async (i) => {
      if (i.customId === 'heist_stop' && i.user.id === userId) {
        stopped = true;
        await i.deferUpdate().catch(() => {});
        collector.stop('manual');
      } else {
        i.reply({ content: '⛔ Seul l’auteur du braquage peut stopper.', ephemeral: true }).catch(()=>{});
      }
    });

    // Créditer à chaque tick
    await new Promise((resolve) => {
      const interval = setInterval(async () => {
        if (stopped) {
          clearInterval(interval);
          return resolve();
        }
        elapsed += tickSec;
        // Calcule une tranche aléatoire visant la fourchette finale
        // (simple : on prend un montant aléatoire chaque tick dans min..max, puis on “cappe” à la fin)
        const gainThisTick = randInt(Math.floor(place.min * (tickSec / totalSec)), Math.ceil(place.max * (tickSec / totalSec)));
        totalGained += gainThisTick;
        creditLiquide(userId, gainThisTick);

        // maj visuelle
        const pct = Math.min(100, Math.floor((elapsed / totalSec) * 100));
        const liveEmb = new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle('💰 Récolte en cours')
          .setDescription(
            `Vous fouillez le coffre…\n${progressBar(pct)}\n\n` +
            `💵 **+${gainThisTick}$** récupérés (cette tranche)\n` +
            `💼 Total provisoire : **${totalGained}$**`
          )
          .setFooter({ text: 'OTW • Gains en temps réel' });

        await msg.edit({ embeds: [liveEmb], components: [ new ActionRowBuilder().addComponents(btnStop) ] }).catch(() => {});

        if (elapsed >= totalSec) {
          clearInterval(interval);
          resolve();
        }
      }, tickSec * 1000);
    });

    collector.stop('done');

    // Clamp final pour s’assurer d’être dans la fourchette (optionnel – ici on laisse tel quel
    // parce qu’on crédite au fil de l’eau; si tu veux forcer à la fin dans la fourchette exacte,
    // tu peux ajuster ici avec un delta supplémentaire).
    endHeist(userId);

    const endEmb = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Braquage terminé')
      .setDescription(
        `Cible : **${place.label}**\n` +
        `Butin total : **${totalGained}$** *(déjà crédités en liquide)*`
      )
      .setFooter({ text: 'OTW • Braquage — Fin' });

    await msg.edit({ embeds: [endEmb], components: [] }).catch(() => {});
  },
};
