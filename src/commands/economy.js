// src/commands/economy.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
} = require('discord.js');

const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const { getOrCreateAccount, updateAccount } = require('../economyData');

const BANKER_ROLE = process.env.BANQUIER_ROLE_ID;
const BANK_LOG_CHANNEL = process.env.BANK_LOG_CHANNEL || null;

// ─────────────────────────────────────────────────────────────
// Utils / format
const fmt = (n) =>
  `${(Number(n) || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} $`;

const footer = { text: 'otw' };

const accountTypes = [
  { name: 'Courant', value: 'courant' },
  { name: 'Entreprise', value: 'entreprise' },
  { name: 'Epargne', value: 'epargne' },
];

const subAccountChoices = [
  { name: 'Courant (Liquide)', value: 'courant_liquide' },
  { name: 'Courant (Banque)', value: 'courant_banque' },
  { name: 'Entreprise (Liquide)', value: 'entreprise_liquide' },
  { name: 'Entreprise (Banque)', value: 'entreprise_banque' },
  { name: 'Épargne', value: 'epargne' },
];

function getBalanceRef(acc, choice) {
  switch (choice) {
    case 'courant_liquide':
      return acc.courant.liquide;
    case 'courant_banque':
      return acc.courant.banque;
    case 'entreprise_liquide':
      return acc.entreprise.liquide;
    case 'entreprise_banque':
      return acc.entreprise.banque;
    case 'epargne':
      return acc.epargne;
    default:
      return null;
  }
}

function setBalanceRef(acc, choice, val) {
  switch (choice) {
    case 'courant_liquide':
      acc.courant.liquide = val;
      break;
    case 'courant_banque':
      acc.courant.banque = val;
      break;
    case 'entreprise_liquide':
      acc.entreprise.liquide = val;
      break;
    case 'entreprise_banque':
      acc.entreprise.banque = val;
      break;
    case 'epargne':
      acc.epargne = val;
      break;
  }
}

function embedCourant(user, acc) {
  const liq = acc.courant.liquide || 0;
  const ban = acc.courant.banque || 0;
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(`🧑‍💼 Compte courant — ${user.username}`)
    .setDescription(
      `💵 **Liquide :** ${fmt(liq)}\n` +
        `🏦 **Banque :** ${fmt(ban)}\n` +
        `📊 **Total :** ${fmt(liq + ban)}`
    )
    .setFooter(footer);
}

function embedEntreprise(user, acc) {
  const liq = acc.entreprise.liquide || 0;
  const ban = acc.entreprise.banque || 0;
  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`🏢 Compte entreprise — ${user.username}`)
    .setDescription(
      `💵 **Liquide :** ${fmt(liq)}\n` +
        `🏦 **Banque :** ${fmt(ban)}\n` +
        `📊 **Total :** ${fmt(liq + ban)}`
    )
    .setFooter(footer);
}

function embedEpargne(user, acc) {
  const ep = acc.epargne || 0;
  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`🐖 Compte épargne — ${user.username}`)
    .setDescription(`🏦 **Solde :** ${fmt(ep)}`)
    .setFooter(footer);
}

function requireBanker(interaction) {
  return interaction.member.roles.cache.has(BANKER_ROLE);
}

// ─────────────────────────────────────────────────────────────
// Partie IMAGE de compte bancaire

const BANK_TEMPLATE = path.join(
  __dirname,
  '..',
  'assets',
  'bank',
  'compte_banque.png'
);

// Coordonnées approx. sur l’image 1024x1024
// (tu pourras ajuster ces valeurs si besoin)
const COORDS = {
  courant_banque: { x: 350, y: 305 },
  courant_liquide: { x: 350, y: 365 },
  entreprise_banque: { x: 740, y: 305 },
  entreprise_liquide: { x: 740, y: 365 },
  owner: { x: 360, y: 455 },
};

function fmtForImage(n) {
  return (Number(n) || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

// Génère l’image de la carte bancaire pour un joueur
async function renderBankCard(user, acc) {
  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');

  const tpl = await loadImage(BANK_TEMPLATE);
  ctx.drawImage(tpl, 0, 0, 1024, 1024);

  ctx.textBaseline = 'middle';

  // Montants
  ctx.font = '32px Arial';
  ctx.fillStyle = '#46d5d1'; // bleu-vert pour les montants

  ctx.fillText(
    fmtForImage(acc.courant.banque || 0),
    COORDS.courant_banque.x,
    COORDS.courant_banque.y
  );
  ctx.fillText(
    fmtForImage(acc.courant.liquide || 0),
    COORDS.courant_liquide.x,
    COORDS.courant_liquide.y
  );
  ctx.fillText(
    fmtForImage(acc.entreprise.banque || 0),
    COORDS.entreprise_banque.x,
    COORDS.entreprise_banque.y
  );
  ctx.fillText(
    fmtForImage(acc.entreprise.liquide || 0),
    COORDS.entreprise_liquide.x,
    COORDS.entreprise_liquide.y
  );

  // Propriétaire
  ctx.font = '30px Arial';
  ctx.fillStyle = '#fdf2d0';
  ctx.fillText(
    user.displayName || user.username,
    COORDS.owner.x,
    COORDS.owner.y
  );

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'compte_banque.png' });
}

// Boutons principaux de l’interface
function buildMainButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('eco_dep')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🏦')
        .setLabel('Déposer des sous'),
      new ButtonBuilder()
        .setCustomId('eco_with')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('💰')
        .setLabel('Retirer des sous'),
      new ButtonBuilder()
        .setCustomId('eco_virement')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💸')
        .setLabel('Faire un virement')
    ),
  ];
}

// Embeds de base pour l’interface image
function buildBankEmbed(user, note = null) {
  const emb = new EmbedBuilder()
    .setColor(0x1f2a35)
    .setTitle(`🏦 Interface bancaire — ${user.username}`)
    .setDescription(
      note ||
        'Utilise les boutons ci-dessous pour déposer, retirer ou virer de l’argent.'
    )
    .setFooter(footer)
    .setImage('attachment://compte_banque.png');
  return emb;
}

// ─────────────────────────────────────────────────────────────
// Commande & exécution

module.exports = {
  data: new SlashCommandBuilder()
    .setName('economy')
    .setDescription('Comptes & opérations (courant, entreprise, épargne).')

    // 🔵 Nouvelle interface graphique
    .addSubcommand((sc) =>
      sc
        .setName('banque')
        .setDescription(
          'Affiche ta carte bancaire graphique et les boutons d’actions.'
        )
    )

    // 🔵 Voir la carte d’un autre joueur (image seule)
    .addSubcommand((sc) =>
      sc
        .setName('voircompte')
        .setDescription('Affiche la carte bancaire graphique de quelqu’un.')
        .addUserOption((o) =>
          o
            .setName('target')
            .setDescription('Joueur cible')
            .setRequired(true)
        )
    )

    // /economy compte (ANCIEN comportement, laissé intact)
    .addSubcommand((sc) =>
      sc
        .setName('compte')
        .setDescription('Affiche le compte choisi.')
        .addStringOption((o) =>
          o
            .setName('type')
            .setDescription('Type de compte')
            .setRequired(true)
            .addChoices(...accountTypes)
        )
        .addUserOption((o) =>
          o
            .setName('target')
            .setDescription('Joueur cible (optionnel)')
        )
    )

    // /economy solde (ANCIEN)
    .addSubcommand((sc) =>
      sc
        .setName('solde')
        .setDescription('Affiche le solde total du compte choisi.')
        .addStringOption((o) =>
          o
            .setName('type')
            .setDescription('Type de compte')
            .setRequired(true)
            .addChoices(...accountTypes)
        )
    )

    // /economy ajouterfonds (banquier) — inchangé
    .addSubcommand((sc) =>
      sc
        .setName('ajouterfonds')
        .setDescription("Ajoute des fonds dans un champ précis (banquiers).")
        .addUserOption((o) =>
          o
            .setName('target')
            .setDescription('Joueur cible')
            .setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName('destination')
            .setDescription('Champ cible')
            .setRequired(true)
            .addChoices(...subAccountChoices)
        )
        .addNumberOption((o) =>
          o
            .setName('montant')
            .setDescription('Montant à ajouter')
            .setRequired(true)
        )
    )

    // /economy retirerfonds (banquier) — inchangé
    .addSubcommand((sc) =>
      sc
        .setName('retirerfonds')
        .setDescription(
          "Retire des fonds d'un joueur (liquide/banque, courant/entreprise/épargne)."
        )
        .addUserOption((o) =>
          o
            .setName('target')
            .setDescription('Joueur cible')
            .setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName('source')
            .setDescription('Champ à débiter')
            .setRequired(true)
            .addChoices(...subAccountChoices)
        )
        .addNumberOption((o) =>
          o
            .setName('montant')
            .setDescription('Montant à retirer')
            .setRequired(true)
        )
    )

    // /economy paye (joueur → joueur) — inchangé
    .addSubcommand((sc) =>
      sc
        .setName('paye')
        .setDescription(
          'Payer un joueur depuis un de vos champs vers un de ses champs.'
        )
        .addStringOption((o) =>
          o
            .setName('source')
            .setDescription('Votre champ source')
            .setRequired(true)
            .addChoices(
              { name: 'Courant (Liquide)', value: 'courant_liquide' },
              { name: 'Entreprise (Liquide)', value: 'entreprise_liquide' }
            )
        )
        .addStringOption((o) =>
          o
            .setName('destination')
            .setDescription('Champ du destinataire')
            .setRequired(true)
            .addChoices(...subAccountChoices)
        )
        .addUserOption((o) =>
          o
            .setName('target')
            .setDescription('Destinataire')
            .setRequired(true)
        )
        .addNumberOption((o) =>
          o
            .setName('montant')
            .setDescription('Montant')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ──────────────────────────────────────────────────────
    // /economy banque — INTERFACE GRAPHIQUE PRINCIPALE
    if (sub === 'banque') {
      const user = interaction.user;
      const acc = getOrCreateAccount(user.id);

      const file = await renderBankCard(user, acc);
      const embed = buildBankEmbed(
        user,
        'Utilise les boutons pour gérer tes comptes. Les montants sont ceux de ton compte courant et de ton compte entreprise.'
      );

      const msg = await interaction.reply({
        embeds: [embed],
        files: [file],
        components: buildMainButtons(),
        fetchReply: true,
      });

      // État local pour les flows
      let currentAction = null; // 'deposit' | 'withdraw' | 'transfer'
      let transferState = {
        account: null, // 'courant' | 'entreprise'
        kind: null, // 'liquide' | 'banque'
        targetId: null,
      };
      let busy = false; // pour éviter plusieurs flows en même temps

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button | ComponentType.StringSelect,
        time: 15 * 60 * 1000,
      });

      collector.on('collect', async (i) => {
        if (i.user.id !== user.id) {
          // Discord enverra son propre message d’erreur, on ne rajoute rien.
          return;
        }

        const accLive = getOrCreateAccount(user.id);

        // ============= BOUTONS PRINCIPAUX =============
        if (i.customId === 'eco_dep') {
          currentAction = 'deposit';
          busy = false;
          transferState = { account: null, kind: null, targetId: null };

          const emb = buildBankEmbed(
            user,
            '🟩 **Dépôt** — choisis sur quel compte déposer (le montant sera déplacé de ton *liquide* vers la *banque* du compte choisi).'
          );
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('eco_dep_courant')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('🏦')
              .setLabel('Compte courant'),
            new ButtonBuilder()
              .setCustomId('eco_dep_entreprise')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('🏢')
              .setLabel('Compte entreprise'),
            new ButtonBuilder()
              .setCustomId('eco_cancel')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('❌')
              .setLabel('Annuler')
          );

          return i.update({
            embeds: [emb],
            files: [await renderBankCard(user, accLive)],
            components: [row],
          });
        }

        if (i.customId === 'eco_with') {
          currentAction = 'withdraw';
          busy = false;
          transferState = { account: null, kind: null, targetId: null };

          const emb = buildBankEmbed(
            user,
            '🟥 **Retrait** — choisis depuis quel compte retirer (la somme passera de la *banque* vers le *liquide* du compte choisi).'
          );
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('eco_with_courant')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('🏦')
              .setLabel('Compte courant'),
            new ButtonBuilder()
              .setCustomId('eco_with_entreprise')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('🏢')
              .setLabel('Compte entreprise'),
            new ButtonBuilder()
              .setCustomId('eco_cancel')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('❌')
              .setLabel('Annuler')
          );

          return i.update({
            embeds: [emb],
            files: [await renderBankCard(user, accLive)],
            components: [row],
          });
        }

        if (i.customId === 'eco_virement') {
          currentAction = 'transfer';
          busy = false;
          transferState = { account: null, kind: null, targetId: null };

          const emb = buildBankEmbed(
            user,
            '💸 **Virement** — étape 1 : choisis le compte à débiter.'
          );
          const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('eco_tr_account')
              .setPlaceholder('Compte à débiter…')
              .addOptions(
                {
                  label: 'Compte courant',
                  value: 'courant',
                  emoji: '🏦',
                  description: 'Virement depuis ton compte courant',
                },
                {
                  label: 'Compte entreprise',
                  value: 'entreprise',
                  emoji: '🏢',
                  description: 'Virement depuis ton compte entreprise',
                }
              )
          );

          return i.update({
            embeds: [emb],
            files: [await renderBankCard(user, accLive)],
            components: [row],
          });
        }

        if (i.customId === 'eco_cancel') {
          currentAction = null;
          busy = false;
          transferState = { account: null, kind: null, targetId: null };
          return i.update({
            embeds: [
              buildBankEmbed(
                user,
                '❎ Action annulée. Utilise les boutons pour relancer une opération.'
              ),
            ],
            files: [await renderBankCard(user, accLive)],
            components: buildMainButtons(),
          });
        }

        // ============= DÉPÔT / RETRAIT (compte choisi) =============
        if (
          ['eco_dep_courant', 'eco_dep_entreprise'].includes(i.customId) ||
          ['eco_with_courant', 'eco_with_entreprise'].includes(i.customId)
        ) {
          if (!currentAction || busy) return;
          busy = true;

          const isCourant =
            i.customId === 'eco_dep_courant' ||
            i.customId === 'eco_with_courant';
          const accountLabel = isCourant
            ? 'compte courant'
            : 'compte entreprise';

          const ask = await i.update({
            embeds: [
              buildBankEmbed(
                user,
                `✍️ Entre maintenant le **montant** à ${
                  currentAction === 'deposit' ? 'déposer' : 'retirer'
                } sur ton **${accountLabel}** en envoyant un message dans le salon (ex: \`250\`).`
              ),
            ],
            files: [await renderBankCard(user, accLive)],
            components: [],
          });

          // On récupère UN message numérique
          const collected = await ask.channel
            .awaitMessages({
              max: 1,
              time: 60_000,
              filter: (m) => m.author.id === user.id,
            })
            .catch(() => null);

          const msgAmount = collected?.first();
          if (!msgAmount) {
            busy = false;
            return ask.edit({
              embeds: [
                buildBankEmbed(
                  user,
                  '⌛ Temps écoulé. Utilise les boutons pour relancer une opération.'
                ),
              ],
              files: [await renderBankCard(user, getOrCreateAccount(user.id))],
              components: buildMainButtons(),
            });
          }

          const amount = Number(msgAmount.content.replace(',', '.'));
          msgAmount.delete().catch(() => {});
          if (!amount || amount <= 0) {
            busy = false;
            return ask.edit({
              embeds: [
                buildBankEmbed(
                  user,
                  '❌ Montant invalide. Utilise les boutons pour recommencer.'
                ),
              ],
              files: [await renderBankCard(user, getOrCreateAccount(user.id))],
              components: buildMainButtons(),
            });
          }

          // On récupère de nouveau l’état compte à jour
          const acc2 = getOrCreateAccount(user.id);

          if (currentAction === 'deposit') {
            if (isCourant) {
              if ((acc2.courant.liquide || 0) < amount) {
                busy = false;
                return ask.edit({
                  embeds: [
                    buildBankEmbed(
                      user,
                      `❌ Fonds insuffisants en **liquide courant** (solde: ${fmt(
                        acc2.courant.liquide || 0
                      )}).`
                    ),
                  ],
                  files: [await renderBankCard(user, acc2)],
                  components: buildMainButtons(),
                });
              }
              acc2.courant.liquide -= amount;
              acc2.courant.banque += amount;
            } else {
              if ((acc2.entreprise.liquide || 0) < amount) {
                busy = false;
                return ask.edit({
                  embeds: [
                    buildBankEmbed(
                      user,
                      `❌ Fonds insuffisants en **liquide entreprise** (solde: ${fmt(
                        acc2.entreprise.liquide || 0
                      )}).`
                    ),
                  ],
                  files: [await renderBankCard(user, acc2)],
                  components: buildMainButtons(),
                });
              }
              acc2.entreprise.liquide -= amount;
              acc2.entreprise.banque += amount;
            }
          } else if (currentAction === 'withdraw') {
            if (isCourant) {
              if ((acc2.courant.banque || 0) < amount) {
                busy = false;
                return ask.edit({
                  embeds: [
                    buildBankEmbed(
                      user,
                      `❌ Fonds insuffisants en **banque courant** (solde: ${fmt(
                        acc2.courant.banque || 0
                      )}).`
                    ),
                  ],
                  files: [await renderBankCard(user, acc2)],
                  components: buildMainButtons(),
                });
              }
              acc2.courant.banque -= amount;
              acc2.courant.liquide += amount;
            } else {
              if ((acc2.entreprise.banque || 0) < amount) {
                busy = false;
                return ask.edit({
                  embeds: [
                    buildBankEmbed(
                      user,
                      `❌ Fonds insuffisants en **banque entreprise** (solde: ${fmt(
                        acc2.entreprise.banque || 0
                      )}).`
                    ),
                  ],
                  files: [await renderBankCard(user, acc2)],
                  components: buildMainButtons(),
                });
              }
              acc2.entreprise.banque -= amount;
              acc2.entreprise.liquide += amount;
            }
          }

          updateAccount(user.id, acc2);
          busy = false;
          currentAction = null;

          return ask.edit({
            embeds: [
              buildBankEmbed(
                user,
                `✅ ${
                  amount > 0 ? fmt(amount) : ''
                } ${
                  currentAction === 'withdraw' ? 'retirés' : 'déposés'
                } sur ton **${accountLabel}**.`
              ),
            ],
            files: [await renderBankCard(user, acc2)],
            components: buildMainButtons(),
          });
        }

        // ============= VIREMENT — SELECT COMPTE =============
        if (i.customId === 'eco_tr_account') {
          if (currentAction !== 'transfer' || busy) return;
          const val = i.values[0]; // 'courant' | 'entreprise'
          transferState.account = val;

          const emb = buildBankEmbed(
            user,
            '💸 **Virement** — étape 2 : choisis le type de fonds à débiter.'
          );
          const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('eco_tr_kind')
              .setPlaceholder('Type de fonds…')
              .addOptions(
                {
                  label: 'Liquide',
                  value: 'liquide',
                  emoji: '💵',
                  description: 'Virement depuis le liquide de ce compte',
                },
                {
                  label: 'Banque',
                  value: 'banque',
                  emoji: '🏦',
                  description: 'Virement depuis la banque de ce compte',
                }
              )
          );

          return i.update({
            embeds: [emb],
            files: [await renderBankCard(user, accLive)],
            components: [row],
          });
        }

        // ============= VIREMENT — SELECT KIND =============
        if (i.customId === 'eco_tr_kind') {
          if (currentAction !== 'transfer' || busy) return;
          const val = i.values[0]; // 'liquide' | 'banque'
          transferState.kind = val;

          const emb = buildBankEmbed(
            user,
            '💸 **Virement** — étape 3 : mentionne maintenant le joueur à créditer (ex: `@Nom`).'
          );

          await i.update({
            embeds: [emb],
            files: [await renderBankCard(user, accLive)],
            components: [],
          });

          // On attend une mention
          const collected = await msg.channel
            .awaitMessages({
              max: 1,
              time: 60_000,
              filter: (m) => m.author.id === user.id,
            })
            .catch(() => null);

          const mention = collected?.first();
          if (!mention) {
            return msg.edit({
              embeds: [
                buildBankEmbed(
                  user,
                  '⌛ Temps écoulé. Utilise les boutons pour relancer le virement.'
                ),
              ],
              files: [await renderBankCard(user, getOrCreateAccount(user.id))],
              components: buildMainButtons(),
            });
          }

          const target = mention.mentions.users.first();
          mention.delete().catch(() => {});
          if (!target || target.bot) {
            return msg.edit({
              embeds: [
                buildBankEmbed(
                  user,
                  '❌ Mention invalide. Utilise les boutons pour relancer le virement.'
                ),
              ],
              files: [await renderBankCard(user, getOrCreateAccount(user.id))],
              components: buildMainButtons(),
            });
          }

          transferState.targetId = target.id;

          const emb2 = buildBankEmbed(
            user,
            `💸 **Virement** — étape 4 : envoie maintenant le **montant** à virer vers ${target} (ex: \`500\`).`
          );

          await msg.edit({
            embeds: [emb2],
            files: [await renderBankCard(user, getOrCreateAccount(user.id))],
            components: [],
          });

          const collected2 = await msg.channel
            .awaitMessages({
              max: 1,
              time: 60_000,
              filter: (m) => m.author.id === user.id,
            })
            .catch(() => null);

          const msgAmount = collected2?.first();
          if (!msgAmount) {
            return msg.edit({
              embeds: [
                buildBankEmbed(
                  user,
                  '⌛ Temps écoulé. Utilise les boutons pour relancer le virement.'
                ),
              ],
              files: [await renderBankCard(user, getOrCreateAccount(user.id))],
              components: buildMainButtons(),
            });
          }

          const amount = Number(msgAmount.content.replace(',', '.'));
          msgAmount.delete().catch(() => {});
          if (!amount || amount <= 0) {
            return msg.edit({
              embeds: [
                buildBankEmbed(
                  user,
                  '❌ Montant invalide. Utilise les boutons pour relancer le virement.'
                ),
              ],
              files: [await renderBankCard(user, getOrCreateAccount(user.id))],
              components: buildMainButtons(),
            });
          }

          // On applique le virement
          const sender = getOrCreateAccount(user.id);
          const recv = getOrCreateAccount(transferState.targetId);

          // determine champ source
          const srcField =
            transferState.account === 'courant'
              ? transferState.kind === 'liquide'
                ? 'courant_liquide'
                : 'courant_banque'
              : transferState.kind === 'liquide'
              ? 'entreprise_liquide'
              : 'entreprise_banque';

          const dstField = 'courant_banque'; // par défaut : banque du compte courant du destinataire

          const sVal = getBalanceRef(sender, srcField);
          const rVal = getBalanceRef(recv, dstField);
          if (sVal < amount) {
            return msg.edit({
              embeds: [
                buildBankEmbed(
                  user,
                  `❌ Fonds insuffisants dans \`${srcField}\` (solde: ${fmt(
                    sVal
                  )}).`
                ),
              ],
              files: [await renderBankCard(user, sender)],
              components: buildMainButtons(),
            });
          }

          setBalanceRef(sender, srcField, sVal - amount);
          setBalanceRef(recv, dstField, rVal + amount);
          updateAccount(user.id, sender);
          updateAccount(transferState.targetId, recv);

          currentAction = null;
          transferState = { account: null, kind: null, targetId: null };

          return msg.edit({
            embeds: [
              buildBankEmbed(
                user,
                `✅ Virement de **${fmt(
                  amount
                )}** effectué depuis \`${srcField}\` vers <@${recv.userId ||
                  transferState.targetId}>\`(courant_banque)\`.`
              ),
            ],
            files: [await renderBankCard(user, sender)],
            components: buildMainButtons(),
          });
        }
      });

      collector.on('end', async () => {
        try {
          await msg.edit({ components: [] });
        } catch {}
      });

      return;
    }

    // ──────────────────────────────────────────────────────
    // /economy voircompte [target] — image seule
    if (sub === 'voircompte') {
      const user = interaction.options.getUser('target');
      const acc = getOrCreateAccount(user.id);

      const file = await renderBankCard(user, acc);
      const emb = new EmbedBuilder()
        .setColor(0x1f2a35)
        .setTitle(`🏦 Carte bancaire de ${user.username}`)
        .setDescription(
          `📊 Résumé rapide :\n` +
            `• Courant — ${fmt(
              (acc.courant.liquide || 0) + (acc.courant.banque || 0)
            )}\n` +
            `• Entreprise — ${fmt(
              (acc.entreprise.liquide || 0) + (acc.entreprise.banque || 0)
            )}`
        )
        .setImage('attachment://compte_banque.png')
        .setFooter(footer);

      return interaction.reply({ embeds: [emb], files: [file] });
    }

    // ──────────────────────────────────────────────────────
    // /economy compte — ancien système (embed texte)
    if (sub === 'compte') {
      const type = interaction.options.getString('type');
      const user = interaction.options.getUser('target') || interaction.user;
      const acc = getOrCreateAccount(user.id);

      if (type === 'courant')
        return interaction.reply({ embeds: [embedCourant(user, acc)] });
      if (type === 'entreprise')
        return interaction.reply({ embeds: [embedEntreprise(user, acc)] });
      if (type === 'epargne')
        return interaction.reply({ embeds: [embedEpargne(user, acc)] });
      return interaction.reply({
        content: 'Type de compte invalide.',
        ephemeral: true,
      });
    }

    // /economy solde — ancien
    if (sub === 'solde') {
      const type = interaction.options.getString('type');
      const acc = getOrCreateAccount(interaction.user.id);
      let val = 0;
      if (type === 'courant')
        val = (acc.courant.liquide || 0) + (acc.courant.banque || 0);
      else if (type === 'entreprise')
        val =
          (acc.entreprise.liquide || 0) + (acc.entreprise.banque || 0);
      else if (type === 'epargne') val = acc.epargne || 0;
      else
        return interaction.reply({
          content: 'Type de compte invalide.',
          ephemeral: true,
        });
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x95a5a6)
            .setDescription(`📊 **Solde ${type} :** ${fmt(val)}`)
            .setFooter(footer),
        ],
      });
    }

    // /economy ajouterfonds — inchangé
    if (sub === 'ajouterfonds') {
      if (!requireBanker(interaction))
        return interaction.reply({
          content: 'Commande réservée aux banquiers.',
          ephemeral: true,
        });
      const user = interaction.options.getUser('target');
      const dest = interaction.options.getString('destination');
      const amount = interaction.options.getNumber('montant');

      const acc = getOrCreateAccount(user.id);
      const before = getBalanceRef(acc, dest);
      if (before === null)
        return interaction.reply({
          content: 'Champ invalide.',
          ephemeral: true,
        });

      setBalanceRef(acc, dest, before + amount);
      updateAccount(user.id, acc);

      const emb = new EmbedBuilder()
        .setColor(0x27ae60)
        .setTitle('💹 Ajout de fonds')
        .setDescription(
          `👤 **Joueur :** ${user}\n` +
            `📍 **Champ :** \`${dest}\`\n` +
            `➕ **Ajout :** ${fmt(amount)}\n` +
            `💼 **Nouveau solde :** ${fmt(getBalanceRef(acc, dest))}`
        )
        .setFooter(footer);

      await interaction.reply({ embeds: [emb] });
      if (BANK_LOG_CHANNEL) {
        interaction.client.channels
          .fetch(BANK_LOG_CHANNEL)
          .then((ch) => ch?.send({ embeds: [emb] }))
          .catch(() => {});
      }
      return;
    }

    // /economy retirerfonds — inchangé
    if (sub === 'retirerfonds') {
      if (!requireBanker(interaction))
        return interaction.reply({
          content: 'Commande réservée aux banquiers.',
          ephemeral: true,
        });
      const user = interaction.options.getUser('target');
      const src = interaction.options.getString('source');
      const amount = interaction.options.getNumber('montant');

      const acc = getOrCreateAccount(user.id);
      const before = getBalanceRef(acc, src);
      if (before === null)
        return interaction.reply({
          content: 'Champ invalide.',
          ephemeral: true,
        });
      if (before < amount)
        return interaction.reply({
          content: `Fonds insuffisants dans \`${src}\` (solde: ${fmt(
            before
          )}).`,
          ephemeral: true,
        });

      setBalanceRef(acc, src, before - amount);
      updateAccount(user.id, acc);

      const emb = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('💸 Retrait de fonds')
        .setDescription(
          `👤 **Joueur :** ${user}\n` +
            `📍 **Champ :** \`${src}\`\n` +
            `➖ **Retrait :** ${fmt(amount)}\n` +
            `💼 **Nouveau solde :** ${fmt(getBalanceRef(acc, src))}`
        )
        .setFooter(footer);

      await interaction.reply({ embeds: [emb] });
      if (BANK_LOG_CHANNEL) {
        interaction.client.channels
          .fetch(BANK_LOG_CHANNEL)
          .then((ch) => ch?.send({ embeds: [emb] }))
          .catch(() => {});
      }
      return;
    }

    // /economy paye — inchangé
    if (sub === 'paye') {
      const target = interaction.options.getUser('target');
      const src = interaction.options.getString('source');
      const dst = interaction.options.getString('destination');
      const amount = interaction.options.getNumber('montant');

      const sender = getOrCreateAccount(interaction.user.id);
      const recv = getOrCreateAccount(target.id);

      const sVal = getBalanceRef(sender, src);
      const rVal = getBalanceRef(recv, dst);
      if (sVal === null || rVal === null)
        return interaction.reply({
          content: 'Champ source/destination invalide.',
          ephemeral: true,
        });
      if (sVal < amount)
        return interaction.reply({
          content: `Fonds insuffisants dans \`${src}\`.`,
          ephemeral: true,
        });

      setBalanceRef(sender, src, sVal - amount);
      setBalanceRef(recv, dst, rVal + amount);
      updateAccount(interaction.user.id, sender);
      updateAccount(target.id, recv);

      const emb = new EmbedBuilder()
        .setColor(0x8e44ad)
        .setTitle('🤝 Paiement effectué')
        .setDescription(
          `👤 **De :** ${interaction.user} \`(${src})\`\n` +
            `👤 **À :** ${target} \`(${dst})\`\n` +
            `💵 **Montant :** ${fmt(amount)}`
        )
        .setFooter(footer);

      return interaction.reply({ embeds: [emb] });
    }
  },
};
