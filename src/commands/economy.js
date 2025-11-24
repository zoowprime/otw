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
const { createCanvas, loadImage } = require("canvas");
const { getOrCreateAccount, updateAccount } = require("../economyData");

const BANKER_ROLE = process.env.BANQUIER_ROLE_ID;
const BANK_LOG_CHANNEL = process.env.BANK_LOG_CHANNEL || null;

// ────────────────────────────────────────────────
// Utils formatage
const fmt = (n) =>
  `${(Number(n) || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} $`;
const footer = { text: "Old Town Western" };

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

const BANK_TEMPLATE = path.join(
  __dirname,
  "..",
  "assets",
  "bank",
  "compte_banque.png"
);

let BANK_BASE_IMAGE = null;

async function getBankBaseImage() {
  if (!BANK_BASE_IMAGE) {
    BANK_BASE_IMAGE = await loadImage(BANK_TEMPLATE);
  }
  return BANK_BASE_IMAGE;
}

// Coordonnées des textes sur ton template 1024x1024
const COORDS = {
  courantBanque: { x: 260, y: 325 },
  courantLiquide: { x: 260, y: 395 },
  entrepriseBanque: { x: 755, y: 325 },
  entrepriseLiquide: { x: 755, y: 395 },
  owner: { x: 200, y: 590 },
};

async function renderBankImage(acc, ownerName) {
  const base = await getBankBaseImage();
  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(base, 0, 0, 1024, 1024);

  ctx.fillStyle = "#E8F8FF";
  ctx.font = '30px "Times New Roman"';
  ctx.textAlign = "left";

  const cb = fmt(acc.courant.banque || 0);
  const cl = fmt(acc.courant.liquide || 0);
  const eb = fmt(acc.entreprise.banque || 0);
  const el = fmt(acc.entreprise.liquide || 0);

  ctx.fillText(cb, COORDS.courantBanque.x, COORDS.courantBanque.y);
  ctx.fillText(cl, COORDS.courantLiquide.x, COORDS.courantLiquide.y);
  ctx.fillText(eb, COORDS.entrepriseBanque.x, COORDS.entrepriseBanque.y);
  ctx.fillText(el, COORDS.entrepriseLiquide.x, COORDS.entrepriseLiquide.y);

  ctx.font = '32px "Times New Roman"';
  ctx.fillText(ownerName, COORDS.owner.x, COORDS.owner.y);

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: "compte_banque.png" });
}

// Embed panel principal (utilise l’attachment compte_banque.png)
function buildPanelEmbed(description) {
  return new EmbedBuilder()
    .setColor(0x1abc9c)
    .setTitle("💳 Compte bancaire")
    .setDescription(description)
    .setImage("attachment://compte_banque.png")
    .setFooter(footer);
}

// ────────────────────────────────────────────────
// UI boutons

function mainButtonsRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("eco_dep")
      .setEmoji("🏦")
      .setLabel("Déposer des sous")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("eco_with")
      .setEmoji("💰")
      .setLabel("Retirer des sous")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("eco_transfer")
      .setEmoji("💸")
      .setLabel("Faire un virement")
      .setStyle(ButtonStyle.Primary)
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
    )

    // /economy paye (paiement joueur → joueur)
    .addSubcommand((sc) =>
      sc
        .setName("paye")
        .setDescription(
          "Payer un joueur depuis un de vos champs vers un de ses champs."
        )
        .addStringOption((o) =>
          o
            .setName("source")
            .setDescription("Votre champ source")
            .setRequired(true)
            .addChoices(
              { name: "Courant (Liquide)", value: "courant_liquide" },
              { name: "Entreprise (Liquide)", value: "entreprise_liquide" }
            )
        )
        .addStringOption((o) =>
          o
            .setName("destination")
            .setDescription("Champ du destinataire")
            .setRequired(true)
            .addChoices(...subAccountChoices)
        )
        .addUserOption((o) =>
          o.setName("target").setDescription("Destinataire").setRequired(true)
        )
        .addNumberOption((o) =>
          o.setName("montant").setDescription("Montant").setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ─────────────────────────────────────
    // PANEL GRAPHIQUE /economy compte
    if (sub === "compte") {
      const user = interaction.user;
      let acc = getOrCreateAccount(user.id);

      const file = await renderBankImage(
        acc,
        interaction.member?.displayName || user.username
      );

      const panelEmbed = buildPanelEmbed(
        "💳 **Interface de compte bancaire.**\nUtilise les boutons ci-dessous pour **déposer** ou **retirer** de l’argent.\n*(Seul le propriétaire du message peut interagir.)*"
      );

      const msg = await interaction.reply({
        embeds: [panelEmbed],
        files: [file],
        components: [mainButtonsRow()],
        fetchReply: true,
      });

      let currentFlow = null; // 'dep' ou 'with'
      let currentAccount = null; // 'courant' ou 'entreprise'

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 24 * 60 * 60 * 1000,
        filter: (i) => i.user.id === user.id && i.message.id === msg.id,
      });

      collector.on("collect", async (btn) => {
        try {
          // Reset du flow
          if (
            btn.customId === "eco_cancel_flow" ||
            btn.customId.endsWith("_cancel")
          ) {
            currentFlow = null;
            currentAccount = null;
            return btn.update({
              embeds: [
                buildPanelEmbed(
                  "💳 Interface de compte bancaire remise à zéro.\nUtilise les boutons pour **déposer**, **retirer** ou **faire un virement**."
                ),
              ],
              components: [mainButtonsRow()],
            });
          }

          // 1) Choix Déposer / Retirer
          if (btn.customId === "eco_dep") {
            currentFlow = "dep";
            currentAccount = null;
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
            return btn.update({
              embeds: [
                buildPanelEmbed(
                  "💰 **Retrait d’argent**\nChoisis le **compte à débiter**.\nL’argent sera pris de la **banque** et versé en **liquide**."
                ),
              ],
              components: [accountChoiceRow("with")],
            });
          }

          // virement : placeholder pour l’instant
          if (btn.customId === "eco_transfer") {
            return btn.update({
              embeds: [
                buildPanelEmbed(
                  "💸 Le système de virement via ce panel sera ajouté plus tard.\nEn attendant, utilise la commande `/economy paye` pour payer un joueur."
                ),
              ],
              components: [mainButtonsRow()],
            });
          }

          // 2) Choix compte pour dépôt / retrait
          if (btn.customId === "eco_dep_courant") currentAccount = "courant";
          if (btn.customId === "eco_dep_entreprise")
            currentAccount = "entreprise";
          if (btn.customId === "eco_with_courant") currentAccount = "courant";
          if (btn.customId === "eco_with_entreprise")
            currentAccount = "entreprise";

          if (currentFlow && currentAccount && btn.customId.startsWith("eco_")) {
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
                    return;
                  }
                  acc.courant.liquide = liq - amount;
                  acc.courant.banque =
                    (acc.courant.banque || 0) + amount;
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
                    return;
                  }
                  acc.entreprise.liquide = liq - amount;
                  acc.entreprise.banque =
                    (acc.entreprise.banque || 0) + amount;
                }
              } else if (currentFlow === "with") {
                // retrait : banque -> liquide
                if (currentAccount === "courant") {
                  const ban = acc.courant.banque || 0;
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
                    return;
                  }
                  acc.courant.banque = ban - amount;
                  acc.courant.liquide =
                    (acc.courant.liquide || 0) + amount;
                } else {
                  const ban = acc.entreprise.banque || 0;
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
                    return;
                  }
                  acc.entreprise.banque = ban - amount;
                  acc.entreprise.liquide =
                    (acc.entreprise.liquide || 0) + amount;
                }
              }

              updateAccount(user.id, acc);
              const newFile = await renderBankImage(
                acc,
                interaction.member?.displayName || user.username
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
        // Tu peux éventuellement griser les boutons ici si tu veux,
        // pour l’instant on laisse tel quel.
      });

      return;
    }

    // ─────────────────────────────────────
    // /economy voircompte (consultation simple, inchangé en texte+image)
    if (sub === "voircompte") {
      const user = interaction.options.getUser("target");
      const acc = getOrCreateAccount(user.id);

      const file = await renderBankImage(
        acc,
        interaction.guild?.members.cache.get(user.id)?.displayName ||
          user.username
      );

      return interaction.reply({
        content: `💳 **Compte de ${user}**`,
        files: [file],
      });
    }

    // ─────────────────────────────────────
    // /economy solde (inchangé)
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

    // ─────────────────────────────────────
    // /economy paye (inchangé)
    if (sub === "paye") {
      const target = interaction.options.getUser("target");
      const src = interaction.options.getString("source");
      const dst = interaction.options.getString("destination");
      const amount = interaction.options.getNumber("montant");

      const sender = getOrCreateAccount(interaction.user.id);
      const recv = getOrCreateAccount(target.id);

      const sVal = getBalanceRef(sender, src);
      const rVal = getBalanceRef(recv, dst);
      if (sVal === null || rVal === null)
        return interaction.reply({
          content: "Champ source/destination invalide.",
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
        .setTitle("🤝 Paiement effectué")
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
