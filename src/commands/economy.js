// src/commands/economy.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");

const path = require("path");
const { createCanvas, loadImage, registerFont } = require("canvas");
const { getOrCreateAccount, updateAccount } = require("../economyData");

const BANKER_ROLE = process.env.BANQUIER_ROLE_ID;
const BANK_LOG_CHANNEL = process.env.BANK_LOG_CHANNEL || null;

// ────────────────────────────────────────────────
// Fonts
const FONT_PATH = path.join(
  __dirname,
  "..",
  "assets",
  "fonts",
  "WesternBangBang-Regular.ttf"
);
try {
  registerFont(FONT_PATH, { family: "WesternBangBang" });
} catch {
  // si la font ne charge pas, on tombera sur la font par défaut
}

// ────────────────────────────────────────────────
// Utils formatage
const fmt = (n) =>
  `${(Number(n) || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} $`;
const footer = { text: "Old Town Western" };

const MAX_LIQUID = 5000; // plafond liquide courant & entreprise

const accountTypes = [
  { name: "Courant", value: "courant" },
  { name: "Entreprise", value: "entreprise" },
  { name: "Epargne", value: "epargne" },
];

const subAccountChoices = [
  { name: "Courant (Liquide)", value: "courant_liquide" },
  { name: "Courant (Banque)", value: "courant_banque" },
  { name: "Entreprise (Liquide)", value: "entreprise_liquide" },
  { name: "Entreprise (Banque)", value: "entreprise_banque" },
  { name: "Épargne", value: "epargne" },
];

function isLiquidField(choice) {
  return choice === "courant_liquide" || choice === "entreprise_liquide";
}

function getBalanceRef(acc, choice) {
  switch (choice) {
    case "courant_liquide":
      return acc.courant.liquide;
    case "courant_banque":
      return acc.courant.banque;
    case "entreprise_liquide":
      return acc.entreprise.liquide;
    case "entreprise_banque":
      return acc.entreprise.banque;
    case "epargne":
      return acc.epargne;
    default:
      return null;
  }
}

function setBalanceRef(acc, choice, val) {
  switch (choice) {
    case "courant_liquide":
      acc.courant.liquide = val;
      break;
    case "courant_banque":
      acc.courant.banque = val;
      break;
    case "entreprise_liquide":
      acc.entreprise.liquide = val;
      break;
    case "entreprise_banque":
      acc.entreprise.banque = val;
      break;
    case "epargne":
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

// ────────────────────────────────────────────────
// Rendu image de compte bancaire

// Templates séparés pour courant / entreprise
const BANK_TEMPLATES = {
  courant: path.join(__dirname, "..", "assets", "bank", "user_bank.png"),
  entreprise: path.join(
    __dirname,
    "..",
    "assets",
    "bank",
    "entreprise_bank.png"
  ),
};

const BANK_BASE_IMAGES = {
  courant: null,
  entreprise: null,
};

async function getBankBaseImage(accountType) {
  const key = accountType === "entreprise" ? "entreprise" : "courant";
  if (!BANK_BASE_IMAGES[key]) {
    BANK_BASE_IMAGES[key] = await loadImage(BANK_TEMPLATES[key]);
  }
  return BANK_BASE_IMAGES[key];
}

/**
 * Rend l'image du compte bancaire pour un type donné.
 * - accountType: 'courant' | 'entreprise'
 * - le solde affiché est le solde BANQUE de ce compte, en vert.
 */
async function renderBankImage(acc, ownerName, accountType = "courant") {
  const type = accountType === "entreprise" ? "entreprise" : "courant";
  const base = await getBankBaseImage(type);

  const canvas = createCanvas(base.width, base.height);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(base, 0, 0, base.width, base.height);

  // Solde banque du compte sélectionné
  const bankBalance =
    type === "courant"
      ? acc.courant?.banque || 0
      : acc.entreprise?.banque || 0;

  const balanceText = fmt(bankBalance);

  // Texte vert, police WesternBangBang
  ctx.font = '40px "WesternBangBang"';
  ctx.fillStyle = "#3CCF4E"; // vert bien visible
  ctx.textAlign = "left";

  // Coordonnées pour écrire à côté du "$" dans la zone "Mon solde"
  // (à ajuster si besoin, mais ça tombe dans la case à gauche)
  const BALANCE_POS = { x: 150, y: 270 };
  ctx.fillText(balanceText, BALANCE_POS.x, BALANCE_POS.y);

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: "bank_panel.png" });
}

// Embed panel principal
function buildPanelEmbed(description) {
  return new EmbedBuilder()
    .setColor(0x1abc9c)
    .setTitle("💳 Compte bancaire")
    .setDescription(description)
    .setImage("attachment://bank_panel.png")
    .setFooter(footer);
}

// ────────────────────────────────────────────────
// UI boutons

function mainButtonsRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("eco_dep")
      .setEmoji("🏦")
      .setLabel("Dépôt")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("eco_with")
      .setEmoji("💰")
      .setLabel("Retrait")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("eco_transfer")
      .setEmoji("💸")
      .setLabel("Virement")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("eco_close_panel")
      .setEmoji("📑")
      .setLabel("Clôturer")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("eco_close_archive")
      .setEmoji("📕")
      .setLabel("Fermer l’archive")
      .setStyle(ButtonStyle.Secondary)
  );
}

function accountChoiceRow(prefix) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`eco_${prefix}_courant`)
      .setEmoji("🏦")
      .setLabel("Compte courant")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`eco_${prefix}_entreprise`)
      .setEmoji("🏢")
      .setLabel("Compte entreprise")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`eco_${prefix}_cancel`)
      .setEmoji("🟥")
      .setLabel("Annuler")
      .setStyle(ButtonStyle.Danger)
  );
}

function cancelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("eco_cancel_flow")
      .setEmoji("🟥")
      .setLabel("Annuler l’opération")
      .setStyle(ButtonStyle.Danger)
  );
}

function bankKindToField(kind) {
  // 'courant' | 'entreprise' -> champ banque correspondant
  return kind === "courant" ? "courant_banque" : "entreprise_banque";
}

function bankKindLabel(kind) {
  return kind === "courant"
    ? "compte **courant (banque)**"
    : "compte **entreprise (banque)**";
}

// ────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName("economy")
    .setDescription("Comptes & opérations (courant, entreprise, épargne).")

    // PANEL GRAPHIQUE
    .addSubcommand((sc) =>
      sc
        .setName("compte")
        .setDescription(
          "Affiche ton compte bancaire avec l’interface graphique."
        )
        .addStringOption((o) =>
          o
            .setName("type")
            .setDescription("Type de compte à afficher")
            .setRequired(true)
            .addChoices(
              { name: "Compte courant", value: "courant" },
              { name: "Compte entreprise", value: "entreprise" }
            )
        )
    )

    // Voir le compte de quelqu’un (image uniquement)
    .addSubcommand((sc) =>
      sc
        .setName("voircompte")
        .setDescription("Voir le compte bancaire complet d’un joueur.")
        .addUserOption((o) =>
          o
            .setName("target")
            .setDescription("Joueur à consulter")
            .setRequired(true)
        )
    )

    // /economy solde
    .addSubcommand((sc) =>
      sc
        .setName("solde")
        .setDescription("Affiche le solde total du compte choisi.")
        .addStringOption((o) =>
          o
            .setName("type")
            .setDescription("Type de compte")
            .setRequired(true)
            .addChoices(...accountTypes)
        )
    )

    // /economy ajouterfonds (banquier)
    .addSubcommand((sc) =>
      sc
        .setName("ajouterfonds")
        .setDescription("Ajoute des fonds dans un champ précis (banquiers).")
        .addUserOption((o) =>
          o.setName("target").setDescription("Joueur cible").setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName("destination")
            .setDescription("Champ cible")
            .setRequired(true)
            .addChoices(...subAccountChoices)
        )
        .addNumberOption((o) =>
          o
            .setName("montant")
            .setDescription("Montant à ajouter")
            .setRequired(true)
        )
    )

    // /economy retirerfonds (banquier)
    .addSubcommand((sc) =>
      sc
        .setName("retirerfonds")
        .setDescription(
          "Retire des fonds d'un joueur (liquide/banque, courant/entreprise/épargne)."
        )
        .addUserOption((o) =>
          o.setName("target").setDescription("Joueur cible").setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName("source")
            .setDescription("Champ à débiter")
            .setRequired(true)
            .addChoices(...subAccountChoices)
        )
        .addNumberOption((o) =>
          o
            .setName("montant")
            .setDescription("Montant à retirer")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ─────────────────────────────────────
    // PANEL GRAPHIQUE /economy compte
    if (sub === "compte") {
      const user = interaction.user;
      const panelType =
        interaction.options.getString("type") === "entreprise"
          ? "entreprise"
          : "courant";

      let acc = getOrCreateAccount(user.id);

      const file = await renderBankImage(
        acc,
        interaction.member?.displayName || user.username,
        panelType
      );

      const panelEmbed = buildPanelEmbed(
        "💳 **Interface de compte bancaire.**\nUtilise les boutons pour **dépôt**, **retrait**, **virement**, ou pour **clôturer / fermer l’archive**.\n*(Seul le propriétaire du message peut interagir.)*"
      );

      const msg = await interaction.reply({
        embeds: [panelEmbed],
        files: [file],
        components: [mainButtonsRow()],
        fetchReply: true,
      });

      let currentFlow = null; // 'dep' | 'with' | 'transfer' | null
      let currentAccount = null; // pour dep/with : 'courant' | 'entreprise'
      let transferSource = null; // pour transfer : 'courant' | 'entreprise'
      let transferTarget = null; // pour transfer : 'courant' | 'entreprise'

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 24 * 60 * 60 * 1000,
        filter: (i) => i.user.id === user.id && i.message.id === msg.id,
      });

      collector.on("collect", async (btn) => {
        try {
          // Fermer l’archive (supprime le message)
          if (btn.customId === "eco_close_archive") {
            await btn.reply({
              content: "📕 Archive fermée.",
              ephemeral: true,
            });
            collector.stop("archive_closed");
            await msg.delete().catch(() => {});
            return;
          }

          // Clôturer le panel (désactive les actions)
          if (btn.customId === "eco_close_panel") {
            currentFlow = null;
            currentAccount = null;
            transferSource = null;
            transferTarget = null;
            collector.stop("panel_closed");
            return btn.update({
              embeds: [
                buildPanelEmbed(
                  "📑 **Archive clôturée.**\nCette interface est maintenant en lecture seule."
                ),
              ],
              components: [],
            });
          }

          // RESET flow (annuler)
          if (
            btn.customId === "eco_cancel_flow" ||
            btn.customId.endsWith("_cancel")
          ) {
            currentFlow = null;
            currentAccount = null;
            transferSource = null;
            transferTarget = null;
            return btn.update({
              embeds: [
                buildPanelEmbed(
                  "💳 Interface de compte bancaire remise à zéro.\nUtilise les boutons pour **dépôt**, **retrait**, **virement**."
                ),
              ],
              components: [mainButtonsRow()],
            });
          }

          // 1) Boutons principaux
          if (btn.customId === "eco_dep") {
            currentFlow = "dep";
            currentAccount = null;
            transferSource = null;
            transferTarget = null;
            return btn.update({
              embeds: [
                buildPanelEmbed(
                  "🏦 **Dépôt d’argent**\nChoisis le **compte à créditer**.\nL’argent sera pris dans le **liquide** et envoyé vers la **banque**."
                ),
              ],
              components: [accountChoiceRow("dep")],
            });
          }

          if (btn.customId === "eco_with") {
            currentFlow = "with";
            currentAccount = null;
            transferSource = null;
            transferTarget = null;
            return btn.update({
              embeds: [
                buildPanelEmbed(
                  "💰 **Retrait d’argent**\nChoisis le **compte à débiter**.\nL’argent sera pris de la **banque** et versé en **liquide**."
                ),
              ],
              components: [accountChoiceRow("with")],
            });
          }

          if (btn.customId === "eco_transfer") {
            // Démarrage du flux de virement banque -> banque (toi ou un autre joueur)
            currentFlow = "transfer";
            currentAccount = null;
            transferSource = null;
            transferTarget = null;
            return btn.update({
              embeds: [
                buildPanelEmbed(
                  "💸 **Virement bancaire**\nTu vas faire un virement de **banque à banque** entre un de tes comptes (courant/entreprise) et un compte (courant/entreprise) d’un joueur.\n\n👉 Commence par choisir le **compte SOURCE (banque)**."
                ),
              ],
              components: [accountChoiceRow("trsrc")],
            });
          }

          // 2) Choix de compte pour dépôt / retrait
          if (btn.customId === "eco_dep_courant") currentAccount = "courant";
          if (btn.customId === "eco_dep_entreprise")
            currentAccount = "entreprise";
          if (btn.customId === "eco_with_courant") currentAccount = "courant";
          if (btn.customId === "eco_with_entreprise")
            currentAccount = "entreprise";

          // 3) Choix SOURCE / DEST pour virement
          if (btn.customId === "eco_trsrc_courant") {
            transferSource = "courant";
            transferTarget = null;
            return btn.update({
              embeds: [
                buildPanelEmbed(
                  `💸 **Virement bancaire**\nSource : ${bankKindLabel(
                    transferSource
                  )}.\n\n👉 Choisis maintenant le **compte DESTINATION (banque)**.`
                ),
              ],
              components: [accountChoiceRow("trdst")],
            });
          }

          if (btn.customId === "eco_trsrc_entreprise") {
            transferSource = "entreprise";
            transferTarget = null;
            return btn.update({
              embeds: [
                buildPanelEmbed(
                  `💸 **Virement bancaire**\nSource : ${bankKindLabel(
                    transferSource
                  )}.\n\n👉 Choisis maintenant le **compte DESTINATION (banque)**.`
                ),
              ],
              components: [accountChoiceRow("trdst")],
            });
          }

          if (btn.customId === "eco_trdst_courant") {
            transferTarget = "courant";
          }
          if (btn.customId === "eco_trdst_entreprise") {
            transferTarget = "entreprise";
          }

          // Si on est en mode virement et qu’on a source + destination
          if (
            currentFlow === "transfer" &&
            transferSource &&
            transferTarget &&
            (btn.customId === "eco_trdst_courant" ||
              btn.customId === "eco_trdst_entreprise")
          ) {
            if (transferSource === transferTarget) {
              // même compte -> pas de sens
              transferTarget = null;
              return btn.update({
                embeds: [
                  buildPanelEmbed(
                    "❌ Le **compte source** et le **compte destination** doivent être **différents**.\nChoisis à nouveau le compte destination."
                  ),
                ],
                components: [accountChoiceRow("trdst")],
              });
            }

            const labelSrc = bankKindLabel(transferSource);
            const labelDst = bankKindLabel(transferTarget);

            // Étape 1 : montant
            await btn.update({
              embeds: [
                buildPanelEmbed(
                  `✏️ Indique maintenant le **montant à virer** de ${labelSrc} vers ${labelDst}.\nEnvoie simplement un message avec un nombre (ex: \`500\`).`
                ),
              ],
              components: [cancelRow()],
            });

            const amountCollector = msg.channel.createMessageCollector({
              time: 60_000,
              max: 1,
              filter: (m) => m.author.id === user.id,
            });

            amountCollector.on("collect", async (m) => {
              const raw = m.content.replace(",", ".").trim();
              const amount = Number(raw);
              if (!Number.isFinite(amount) || amount <= 0) {
                await msg.edit({
                  embeds: [
                    buildPanelEmbed(
                      "❌ Montant invalide. Virement annulé.\nRéessaie avec un nombre positif."
                    ),
                  ],
                  components: [mainButtonsRow()],
                });
                setTimeout(() => m.delete().catch(() => {}), 2000);
                currentFlow = null;
                transferSource = null;
                transferTarget = null;
                return;
              }

              // Étape 2 : joueur cible
              await msg.edit({
                embeds: [
                  buildPanelEmbed(
                    `👤 Montant à virer : **${fmt(
                      amount
                    )}** de ${labelSrc} vers ${labelDst}.\n\n👉 Maintenant, **mentionne le joueur cible** dans ce salon (ex: @Nom). Tu peux te mentionner toi-même pour un virement interne.`
                  ),
                ],
                components: [cancelRow()],
              });

              const targetCollector = msg.channel.createMessageCollector({
                time: 60_000,
                max: 1,
                filter: (mm) => mm.author.id === user.id,
              });

              targetCollector.on("collect", async (mm) => {
                const target = mm.mentions.users.first();
                if (!target || target.bot) {
                  await msg.edit({
                    embeds: [
                      buildPanelEmbed(
                        "❌ Mention invalide. Virement annulé.\nRelance l’opération."
                      ),
                    ],
                    components: [mainButtonsRow()],
                  });
                  setTimeout(() => mm.delete().catch(() => {}), 2000);
                  currentFlow = null;
                  transferSource = null;
                  transferTarget = null;
                  return;
                }

                // On effectue le virement (self ou autre joueur)
                if (target.id === user.id) {
                  // Virement interne (toi → toi)
                  const accSelf = getOrCreateAccount(user.id);
                  const srcField = bankKindToField(transferSource);
                  const dstField = bankKindToField(transferTarget);

                  const srcBalance = getBalanceRef(accSelf, srcField) || 0;
                  const dstBalance = getBalanceRef(accSelf, dstField) || 0;

                  if (srcBalance < amount) {
                    await msg.edit({
                      embeds: [
                        buildPanelEmbed(
                          `❌ Fonds insuffisants dans ${bankKindLabel(
                            transferSource
                          )}.\nSolde actuel : ${fmt(srcBalance)}.`
                        ),
                      ],
                      components: [mainButtonsRow()],
                    });
                    setTimeout(() => mm.delete().catch(() => {}), 2000);
                    setTimeout(() => m.delete().catch(() => {}), 2000);
                    currentFlow = null;
                    transferSource = null;
                    transferTarget = null;
                    return;
                  }

                  setBalanceRef(accSelf, srcField, srcBalance - amount);
                  setBalanceRef(accSelf, dstField, dstBalance + amount);
                  updateAccount(user.id, accSelf);

                  const newFile = await renderBankImage(
                    accSelf,
                    interaction.member?.displayName || user.username,
                    panelType
                  );

                  await msg.edit({
                    embeds: [
                      buildPanelEmbed(
                        `✅ Virement **interne** effectué : **${fmt(
                          amount
                        )}** transférés de ${bankKindLabel(
                          transferSource
                        )} vers ${bankKindLabel(transferTarget)}.`
                      ),
                    ],
                    files: [newFile],
                    components: [mainButtonsRow()],
                  });

                  setTimeout(() => mm.delete().catch(() => {}), 2000);
                  setTimeout(() => m.delete().catch(() => {}), 2000);

                  currentFlow = null;
                  transferSource = null;
                  transferTarget = null;
                  return;
                }

                // VIREMENT VERS UN AUTRE JOUEUR
                const senderAcc = getOrCreateAccount(user.id);
                const recvAcc = getOrCreateAccount(target.id);

                const srcField = bankKindToField(transferSource); // ex: "courant_banque"
                const dstField = bankKindToField(transferTarget); // ex: "entreprise_banque"

                const srcBalance = getBalanceRef(senderAcc, srcField) || 0;
                const dstBalance = getBalanceRef(recvAcc, dstField) || 0;

                if (srcBalance < amount) {
                  await msg.edit({
                    embeds: [
                      buildPanelEmbed(
                        `❌ Fonds insuffisants dans ${bankKindLabel(
                          transferSource
                        )}.\nSolde actuel : ${fmt(srcBalance)}.`
                      ),
                    ],
                    components: [mainButtonsRow()],
                  });
                  setTimeout(() => mm.delete().catch(() => {}), 2000);
                  setTimeout(() => m.delete().catch(() => {}), 2000);
                  currentFlow = null;
                  transferSource = null;
                  transferTarget = null;
                  return;
                }

                setBalanceRef(senderAcc, srcField, srcBalance - amount);
                setBalanceRef(recvAcc, dstField, dstBalance + amount);

                updateAccount(user.id, senderAcc);
                updateAccount(target.id, recvAcc);

                const newFile = await renderBankImage(
                  senderAcc,
                  interaction.member?.displayName || user.username,
                  panelType
                );

                await msg.edit({
                  embeds: [
                    buildPanelEmbed(
                      `✅ Virement effectué : **${fmt(
                        amount
                      )}** transférés de ${bankKindLabel(
                        transferSource
                      )} vers ${bankKindLabel(
                        transferTarget
                      )} du joueur ${target}.`
                    ),
                  ],
                  files: [newFile],
                  components: [mainButtonsRow()],
                });

                setTimeout(() => mm.delete().catch(() => {}), 2000);
                setTimeout(() => m.delete().catch(() => {}), 2000);

                currentFlow = null;
                transferSource = null;
                transferTarget = null;
              });

              targetCollector.on("end", async (collected2) => {
                if (collected2.size === 0) {
                  await msg.edit({
                    embeds: [
                      buildPanelEmbed(
                        "⌛ Temps écoulé sans mention de joueur.\nInterface remise à zéro."
                      ),
                    ],
                    components: [mainButtonsRow()],
                  });
                  currentFlow = null;
                  transferSource = null;
                  transferTarget = null;
                }
              });
            });

            amountCollector.on("end", async (collected) => {
              if (collected.size === 0) {
                await msg.edit({
                  embeds: [
                    buildPanelEmbed(
                      "⌛ Temps écoulé sans montant.\nInterface remise à zéro."
                    ),
                  ],
                  components: [mainButtonsRow()],
                });
                currentFlow = null;
                transferSource = null;
                transferTarget = null;
              }
            });

            return;
          }

          // 4) Dépôt / Retrait : déclenchement de la saisie du montant
          if (
            currentFlow &&
            currentFlow !== "transfer" &&
            currentAccount &&
            btn.customId.startsWith("eco_")
          ) {
            const actionLabel =
              currentFlow === "dep" ? "à **déposer**" : "à **retirer**";
            const compteLabel =
              currentAccount === "courant"
                ? "compte **courant**"
                : "compte **entreprise**";

            await btn.update({
              embeds: [
                buildPanelEmbed(
                  `✏️ Indique maintenant le **montant ${actionLabel}** pour ton ${compteLabel}.\nEnvoie simplement un message avec un nombre (ex: \`250\`).`
                ),
              ],
              components: [cancelRow()],
            });

            const msgCollector = msg.channel.createMessageCollector({
              time: 60_000,
              max: 1,
              filter: (m) => m.author.id === user.id,
            });

            msgCollector.on("collect", async (m) => {
              const raw = m.content.replace(",", ".").trim();
              const amount = Number(raw);
              if (!Number.isFinite(amount) || amount <= 0) {
                await msg.edit({
                  embeds: [
                    buildPanelEmbed(
                      "❌ Montant invalide. Opération annulée.\nRéessaie avec un nombre positif."
                    ),
                  ],
                  components: [mainButtonsRow()],
                });
                setTimeout(() => m.delete().catch(() => {}), 2000);
                return;
              }

              acc = getOrCreateAccount(user.id);

              if (currentFlow === "dep") {
                // dépôt : liquide -> banque
                if (currentAccount === "courant") {
                  const liq = acc.courant.liquide || 0;
                  if (liq < amount) {
                    await msg.edit({
                      embeds: [
                        buildPanelEmbed(
                          `❌ Fonds insuffisants en **liquide courant**.\nSolde actuel : ${fmt(
                            liq
                          )}.`
                        ),
                      ],
                      components: [mainButtonsRow()],
                    });
                    setTimeout(() => m.delete().catch(() => {}), 2000);
                    return;
                  }
                  acc.courant.liquide = liq - amount;
                  acc.courant.banque = (acc.courant.banque || 0) + amount;
                } else {
                  const liq = acc.entreprise.liquide || 0;
                  if (liq < amount) {
                    await msg.edit({
                      embeds: [
                        buildPanelEmbed(
                          `❌ Fonds insuffisants en **liquide entreprise**.\nSolde actuel : ${fmt(
                            liq
                          )}.`
                        ),
                      ],
                      components: [mainButtonsRow()],
                    });
                    setTimeout(() => m.delete().catch(() => {}), 2000);
                    return;
                  }
                  acc.entreprise.liquide = liq - amount;
                  acc.entreprise.banque =
                    (acc.entreprise.banque || 0) + amount;
                }
              } else if (currentFlow === "with") {
                // retrait : banque -> liquide (→ CAP 5000)
                if (currentAccount === "courant") {
                  const ban = acc.courant.banque || 0;
                  const liq = acc.courant.liquide || 0;
                  if (ban < amount) {
                    await msg.edit({
                      embeds: [
                        buildPanelEmbed(
                          `❌ Fonds insuffisants en **banque courant**.\nSolde actuel : ${fmt(
                            ban
                          )}.`
                        ),
                      ],
                      components: [mainButtonsRow()],
                    });
                    setTimeout(() => m.delete().catch(() => {}), 2000);
                    return;
                  }
                  const newLiq = liq + amount;
                  if (newLiq > MAX_LIQUID) {
                    await msg.edit({
                      embeds: [
                        buildPanelEmbed(
                          `❌ Tu ne peux pas avoir plus de ${MAX_LIQUID}$ en **liquide courant**.\nSolde liquide actuel : ${fmt(
                            liq
                          )}.`
                        ),
                      ],
                      components: [mainButtonsRow()],
                    });
                    setTimeout(() => m.delete().catch(() => {}), 2000);
                    return;
                  }
                  acc.courant.banque = ban - amount;
                  acc.courant.liquide = newLiq;
                } else {
                  const ban = acc.entreprise.banque || 0;
                  const liq = acc.entreprise.liquide || 0;
                  if (ban < amount) {
                    await msg.edit({
                      embeds: [
                        buildPanelEmbed(
                          `❌ Fonds insuffisants en **banque entreprise**.\nSolde actuel : ${fmt(
                            ban
                          )}.`
                        ),
                      ],
                      components: [mainButtonsRow()],
                    });
                    setTimeout(() => m.delete().catch(() => {}), 2000);
                    return;
                  }
                  const newLiq = liq + amount;
                  if (newLiq > MAX_LIQUID) {
                    await msg.edit({
                      embeds: [
                        buildPanelEmbed(
                          `❌ Tu ne peux pas avoir plus de ${MAX_LIQUID}$ en **liquide entreprise**.\nSolde liquide actuel : ${fmt(
                            liq
                          )}.`
                        ),
                      ],
                      components: [mainButtonsRow()],
                    });
                    setTimeout(() => m.delete().catch(() => {}), 2000);
                    return;
                  }
                  acc.entreprise.banque = ban - amount;
                  acc.entreprise.liquide = newLiq;
                }
              }

              updateAccount(user.id, acc);
              const newFile = await renderBankImage(
                acc,
                interaction.member?.displayName || user.username,
                panelType
              );

              const actionDone =
                currentFlow === "dep" ? "déposé" : "retiré";

              await msg.edit({
                embeds: [
                  buildPanelEmbed(
                    `✅ Tu as **${actionDone} ${fmt(
                      amount
                    )}** sur ton ${
                      currentAccount === "courant"
                        ? "compte courant"
                        : "compte entreprise"
                    }.\nUtilise à nouveau les boutons pour une autre opération.`
                  ),
                ],
                files: [newFile],
                components: [mainButtonsRow()],
              });

              setTimeout(() => m.delete().catch(() => {}), 2000);

              currentFlow = null;
              currentAccount = null;
            });

            msgCollector.on("end", async (collected) => {
              if (collected.size === 0) {
                await msg.edit({
                  embeds: [
                    buildPanelEmbed(
                      "⌛ Temps écoulé sans montant.\nInterface remise à zéro."
                    ),
                  ],
                  components: [mainButtonsRow()],
                });
                currentFlow = null;
                currentAccount = null;
              }
            });

            return;
          }
        } catch (err) {
          console.error("Erreur interaction economy:", err);
          if (!btn.replied && !btn.deferred) {
            await btn.reply({
              content: "❌ Erreur pendant l’opération.",
              ephemeral: false,
            });
          }
        }
      });

      collector.on("end", async () => {
        // rien de spécial, on laisse le message tel quel
      });

      return;
    }

    // ─────────────────────────────────────
    // /economy voircompte
    if (sub === "voircompte") {
      const user = interaction.options.getUser("target");
      const acc = getOrCreateAccount(user.id);

      // Par défaut on affiche le compte courant
      const file = await renderBankImage(
        acc,
        interaction.guild?.members.cache.get(user.id)?.displayName ||
          user.username,
        "courant"
      );

      return interaction.reply({
        content: `💳 **Compte courant de ${user}**`,
        files: [file],
      });
    }

    // ─────────────────────────────────────
    // /economy solde
    if (sub === "solde") {
      const type = interaction.options.getString("type");
      const acc = getOrCreateAccount(interaction.user.id);
      let val = 0;
      if (type === "courant")
        val = (acc.courant.liquide || 0) + (acc.courant.banque || 0);
      else if (type === "entreprise")
        val =
          (acc.entreprise.liquide || 0) + (acc.entreprise.banque || 0);
      else if (type === "epargne") val = acc.epargne || 0;
      else
        return interaction.reply({
          content: "Type de compte invalide.",
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

    // ─────────────────────────────────────
    // /economy ajouterfonds (banquier)
    if (sub === "ajouterfonds") {
      if (!requireBanker(interaction))
        return interaction.reply({
          content: "Commande réservée aux banquiers.",
          ephemeral: true,
        });
      const user = interaction.options.getUser("target");
      const dest = interaction.options.getString("destination");
      const amount = interaction.options.getNumber("montant");

      const acc = getOrCreateAccount(user.id);
      const before = getBalanceRef(acc, dest);
      if (before === null)
        return interaction.reply({
          content: "Champ invalide.",
          ephemeral: true,
        });

      if (isLiquidField(dest)) {
        const newVal = (before || 0) + amount;
        if (newVal > MAX_LIQUID) {
          return interaction.reply({
            content: `❌ Ce joueur ne peut pas recevoir plus de liquide sur ce compte (plafond ${MAX_LIQUID}$).`,
            ephemeral: true,
          });
        }
      }

      setBalanceRef(acc, dest, before + amount);
      updateAccount(user.id, acc);

      const emb = new EmbedBuilder()
        .setColor(0x27ae60)
        .setTitle("💹 Ajout de fonds")
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

    // ─────────────────────────────────────
    // /economy retirerfonds (banquier)
    if (sub === "retirerfonds") {
      if (!requireBanker(interaction))
        return interaction.reply({
          content: "Commande réservée aux banquiers.",
          ephemeral: true,
        });
      const user = interaction.options.getUser("target");
      const src = interaction.options.getString("source");
      const amount = interaction.options.getNumber("montant");

      const acc = getOrCreateAccount(user.id);
      const before = getBalanceRef(acc, src);
      if (before === null)
        return interaction.reply({
          content: "Champ invalide.",
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
        .setTitle("💸 Retrait de fonds")
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
  },
};
