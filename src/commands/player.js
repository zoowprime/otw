// src/commands/player.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
  AttachmentBuilder,
} = require('discord.js');

const path   = require('path');
const fs     = require('fs');
const https  = require('https');

const {
  getCard,
  setCard,
  deleteCard,
  getCardImagePath,
} = require('../data/idCardsData');

const { renderIdCard } = require('../utils/idCardRenderer');

const STAFF_ROLE_ID  = process.env.STAFF_ROLE_ID;
const POLICE_ROLE_ID = process.env.POLICE_ROLE_ID;

// ─────────────────────────────────────────────────────────────
// Helpers UI
const ok   = (t) => new EmbedBuilder().setColor(0x2ecc71).setDescription(t);
const ko   = (t) => new EmbedBuilder().setColor(0xe74c3c).setDescription(t);
const info = (t) => new EmbedBuilder().setColor(0x3498db).setDescription(t);

function hasStaffOrPolice(member) {
  if (!member) return false;
  return member.roles.cache.has(STAFF_ROLE_ID) || member.roles.cache.has(POLICE_ROLE_ID);
}

function mainMenuEmbed(targetUser, hasCard) {
  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`Gestion de la carte d’identité — ${targetUser.username}`)
    .setDescription(
      (hasCard
        ? 'Une carte existe déjà pour ce joueur.\nChoisis une action ci-dessous :'
        : 'Aucune carte trouvée pour ce joueur.\nTu peux en créer une avec le menu ci-dessous :'
      ) +
      '\n\n> 🆕 **Créer** une nouvelle carte\n' +
      '> 🛠 **Modifier** une carte existante\n' +
      '> 🗑 **Supprimer** complètement la carte'
    )
    .setFooter({ text: 'OTW RP — Système carte d’identité' });
}

function mainMenuRow(hasCard) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('player_id_action')
    .setPlaceholder('Choisis une action sur la carte d’identité…')
    .addOptions(
      {
        label: 'Créer',
        value: 'create',
        emoji: '🆕',
        description: 'Créer une nouvelle carte d’identité pour ce joueur',
      },
      {
        label: 'Modifier',
        value: 'edit',
        emoji: '🛠',
        description: hasCard
          ? 'Modifier les informations de la carte existante'
          : 'Indisponible tant que la carte n’existe pas',
      },
      {
        label: 'Supprimer',
        value: 'delete',
        emoji: '🗑',
        description: hasCard
          ? 'Supprimer définitivement la carte'
          : 'Indisponible tant que la carte n’existe pas',
      },
    );
  return new ActionRowBuilder().addComponents(menu);
}

function editFieldMenuRow() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('player_id_edit_field')
    .setPlaceholder('Quel champ souhaites-tu modifier ?')
    .addOptions(
      {
        label: 'Nom',
        value: 'nom',
        emoji: '📝',
        description: 'Modifier le nom de famille',
      },
      {
        label: 'Prénom',
        value: 'prenom',
        emoji: '📝',
        description: 'Modifier le prénom',
      },
      {
        label: 'Date de naissance',
        value: 'birthDate',
        emoji: '📅',
        description: 'Modifier la date de naissance',
      },
      {
        label: 'Taille',
        value: 'size',
        emoji: '📏',
        description: 'Modifier la taille',
      },
      {
        label: 'Lieu de résidence',
        value: 'address',
        emoji: '🏠',
        description: 'Modifier le lieu de vie',
      },
      {
        label: 'Photo',
        value: 'photo',
        emoji: '🖼',
        description: 'Modifier la photo sur la carte',
      },
    );

  return new ActionRowBuilder().addComponents(menu);
}

// ─────────────────────────────────────────────────────────────
// Download d’une image Discord vers /data/idcards
function downloadToFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          file.close(() => fs.unlink(destPath, () => {}));
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(destPath)));
      })
      .on('error', (err) => {
        file.close(() => fs.unlink(destPath, () => {}));
        reject(err);
      });
  });
}

// Pose une question texte et récupère la réponse
async function askTextQuestion(interaction, questionEmbed, timeoutMs = 120000) {
  const reply = await interaction.followUp({
    embeds: [questionEmbed],
    flags: MessageFlags.Ephemeral,
  });

  const collected = await interaction.channel
    .awaitMessages({
      filter: (m) => m.author.id === interaction.user.id,
      max: 1,
      time: timeoutMs,
    })
    .catch(() => null);

  if (!collected || !collected.first()) {
    await interaction.followUp({
      embeds: [ko('⌛ Temps écoulé, opération annulée.')],
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }

  const msg = collected.first();
  const content = msg.content.trim();
  // on nettoie le salon gentiment
  msg.delete().catch(() => {});

  return content;
}

// Pose une question pour upload de photo
async function askPhoto(interaction, targetUserId, timeoutMs = 180000) {
  await interaction.followUp({
    embeds: [
      info(
        '📷 Envoie maintenant **une image de ton personnage** dans ce salon.\n' +
          'Le premier fichier image envoyé sera utilisé.'
      ),
    ],
    flags: MessageFlags.Ephemeral,
  });

  const collected = await interaction.channel
    .awaitMessages({
      filter: (m) => m.author.id === interaction.user.id && m.attachments.size > 0,
      max: 1,
      time: timeoutMs,
    })
    .catch(() => null);

  if (!collected || !collected.first()) {
    await interaction.followUp({
      embeds: [ko('⌛ Aucune image reçue, opération annulée.')],
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }

  const msg = collected.first();
  const att = msg.attachments.first();
  if (!att || !att.url) {
    await interaction.followUp({
      embeds: [ko('❌ Impossible de lire le fichier envoyé.')],
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }

  const ext = path.extname(att.name || '.png') || '.png';
  const dest = path.join('/data/idcards', `${targetUserId}_photo${ext}`);

  try {
    await downloadToFile(att.url, dest);
    msg.delete().catch(() => {});
    return dest;
  } catch (err) {
    console.error('Erreur download photo carte:', err);
    await interaction.followUp({
      embeds: [ko('❌ Erreur lors du téléchargement de la photo.')],
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }
}

// ─────────────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('player')
    .setDescription('Gestion & consultation des cartes d’identité')
    .addSubcommand((sc) =>
      sc
        .setName('id')
        .setDescription('Créer / modifier / supprimer la carte d’un joueur (staff & police)')
        .addUserOption((o) =>
          o
            .setName('cible')
            .setDescription('Joueur concerné')
            .setRequired(true),
        ),
    )
    .addSubcommand((sc) =>
      sc
        .setName('view')
        .setDescription('Voir une carte d’identité')
        .addUserOption((o) =>
          o
            .setName('cible')
            .setDescription('Joueur à consulter (optionnel)')
            .setRequired(false),
        ),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ──────────────────────────────────────────────────────
    // /player view [target] — tout le monde
    if (sub === 'view') {
      const target = interaction.options.getUser('cible') || interaction.user;

      // si on essaie de voir quelqu’un d’autre → staff/police requis
      if (target.id !== interaction.user.id && !hasStaffOrPolice(interaction.member)) {
        return interaction.reply({
          embeds: [ko('⛔ Tu ne peux consulter que **ta propre** carte.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      const card = getCard(target.id);
      if (!card) {
        return interaction.reply({
          embeds: [ko('❌ Aucune carte trouvée pour ce joueur.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      const imgPath = await renderIdCard(target.id, card);
      if (!imgPath || !fs.existsSync(imgPath)) {
        return interaction.reply({
          embeds: [ko('❌ Impossible de générer la carte pour le moment.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      const file = new AttachmentBuilder(imgPath, { name: 'idcard.png' });

      const emb = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`Carte d’identité — ${card.prenom || ''} ${card.nom || ''}`.trim())
        .setDescription(
          `👤 **Joueur :** ${target}\n` +
            `📅 **Date de naissance :** ${card.birthDate || '—'}\n` +
            `📏 **Taille :** ${card.size || '—'}\n` +
            `🏠 **Adresse :** ${card.address || '—'}`
        )
        .setImage('attachment://idcard.png')
        .setFooter({ text: 'OTW RP — Système carte d’identité' });

      return interaction.reply({
        embeds: [emb],
        files: [file],
      });
    }

    // ──────────────────────────────────────────────────────
    // /player id [target] — staff / police ONLY
    if (sub === 'id') {
      if (!hasStaffOrPolice(interaction.member)) {
        return interaction.reply({
          embeds: [ko('⛔ Commande réservée au staff & à la police.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      const target = interaction.options.getUser('cible');
      if (!target || target.bot) {
        return interaction.reply({
          embeds: [ko('❌ Cible invalide.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      const existing = getCard(target.id);
      await interaction.reply({
        embeds: [mainMenuEmbed(target, !!existing)],
        components: [mainMenuRow(!!existing)],
        flags: MessageFlags.Ephemeral,
      });

      const msg = await interaction.fetchReply();

      // Attente du choix dans le menu principal
      const sel = await msg
        .awaitMessageComponent({
          componentType: 3, // StringSelect
          time: 120000,
          filter: (i) => i.user.id === interaction.user.id && i.customId === 'player_id_action',
        })
        .catch(() => null);

      if (!sel) {
        return msg.edit({
          components: [],
          embeds: [ko('⌛ Temps écoulé, aucune action effectuée.')],
        });
      }

      const action = sel.values[0];

      // ── Créer ───────────────────────────────────────────
      if (action === 'create') {
        if (existing) {
          return sel.update({
            components: [],
            embeds: [ko('❌ Une carte existe déjà pour ce joueur. Utilise **Modifier** ou **Supprimer**.')],
          });
        }

        await sel.update({
          components: [],
          embeds: [info('🆕 Création de carte — étape 1/6 : **Nom**\n\nEnvoie maintenant le **nom** du personnage.')],
        });

        // 1) Nom
        const nom = await askTextQuestion(interaction, info('✏️ Envoie le **nom** du personnage.'));
        if (nom === null) return;

        // 2) Prénom
        const prenom = await askTextQuestion(interaction, info('✏️ Étape 2/6 — Envoie le **prénom** du personnage.'));
        if (prenom === null) return;

        // 3) Date de naissance
        const birthDate = await askTextQuestion(
          interaction,
          info('📅 Étape 3/6 — Envoie la **date de naissance** (ex: 02/03/1860).'),
        );
        if (birthDate === null) return;

        // 4) Taille
        const size = await askTextQuestion(
          interaction,
          info('📏 Étape 4/6 — Envoie la **taille** (ex: 1m78).'),
        );
        if (size === null) return;

        // 5) Adresse
        const address = await askTextQuestion(
          interaction,
          info('🏠 Étape 5/6 — Envoie le **lieu de résidence** (ville / quartier).'),
        );
        if (address === null) return;

        // 6) Photo
        const photoPath = await askPhoto(interaction, target.id);
        if (!photoPath) return;

        const card = setCard(target.id, {
          nom,
          prenom,
          birthDate,
          size,
          address,
          photoPath,
        });

        const imgPath = await renderIdCard(target.id, card);
        const file = imgPath && fs.existsSync(imgPath)
          ? new AttachmentBuilder(imgPath, { name: 'idcard.png' })
          : null;

        const emb = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('✅ Carte créée avec succès')
          .setDescription(`La carte d’identité de ${target} a été enregistrée.`)
          .setFooter({ text: 'OTW RP — Système carte d’identité' });

        if (file) emb.setImage('attachment://idcard.png');

        return interaction.followUp({
          embeds: [emb],
          files: file ? [file] : [],
          flags: MessageFlags.Ephemeral,
        });
      }

      // ── Supprimer ───────────────────────────────────────
      if (action === 'delete') {
        if (!existing) {
          return sel.update({
            components: [],
            embeds: [ko('❌ Aucune carte à supprimer pour ce joueur.')],
          });
        }

        deleteCard(target.id);
        return sel.update({
          components: [],
          embeds: [ok(`🗑 Carte d’identité de ${target} supprimée.`)],
        });
      }

      // ── Modifier ────────────────────────────────────────
      if (action === 'edit') {
        if (!existing) {
          return sel.update({
            components: [],
            embeds: [ko('❌ Aucune carte existante pour ce joueur.')],
          });
        }

        await sel.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x2980b9)
              .setTitle(`Modifier la carte — ${target.username}`)
              .setDescription('Choisis le **champ à modifier** dans la liste ci-dessous.'),
          ],
          components: [editFieldMenuRow()],
        });

        const fieldSel = await msg
          .awaitMessageComponent({
            componentType: 3,
            time: 120000,
            filter: (i) => i.user.id === interaction.user.id && i.customId === 'player_id_edit_field',
          })
          .catch(() => null);

        if (!fieldSel) {
          return msg.edit({
            components: [],
            embeds: [ko('⌛ Temps écoulé, aucune modification effectuée.')],
          });
        }

        const field = fieldSel.values[0];
        let card = getCard(target.id) || existing;

        if (field === 'photo') {
          await fieldSel.update({
            embeds: [info('🖼 Modification de la **photo** — envoie une nouvelle image dans ce salon.')],
            components: [],
          });

          const newPhotoPath = await askPhoto(interaction, target.id);
          if (!newPhotoPath) return;

          card = setCard(target.id, { ...card, photoPath: newPhotoPath });
        } else {
          const labelMap = {
            nom: 'nom',
            prenom: 'prénom',
            birthDate: 'date de naissance',
            size: 'taille',
            address: 'lieu de résidence',
          };

          await fieldSel.update({
            embeds: [
              info(
                `✏️ Modification du **${labelMap[field] || field}**.\n` +
                  'Envoie la **nouvelle valeur** dans ce salon.'
              ),
            ],
            components: [],
          });

          const newValue = await askTextQuestion(
            interaction,
            info(`Envoie la nouvelle valeur pour **${labelMap[field] || field}**.`),
          );
          if (newValue === null) return;

          card = setCard(target.id, {
            ...card,
            [field]: newValue,
          });
        }

        // Regénère l’image
        const imgPath = await renderIdCard(target.id, card);
        const file = imgPath && fs.existsSync(imgPath)
          ? new AttachmentBuilder(imgPath, { name: 'idcard.png' })
          : null;

        const emb = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('✅ Carte mise à jour')
          .setDescription(`Les informations de la carte d’identité de ${target} ont été mises à jour.`)
          .setFooter({ text: 'OTW RP — Système carte d’identité' });

        if (file) emb.setImage('attachment://idcard.png');

        return interaction.followUp({
          embeds: [emb],
          files: file ? [file] : [],
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
