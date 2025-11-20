// src/commands/saloon.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require('discord.js');

const {
  createSaloon,
  deleteSaloon,
  getSaloonByOwner,
  getSaloonByMember,
  isOwner,
  isMember,
  addEmployee,
  removeEmployee,
  addRevenue,
  addStock,
  decStock,
  setPrice,
  getPrice,
  SUPPLIER_DRINKS,
  SUPPLIER_FOODS,
  load: loadSaloons,
} = require('../data/saloonData');

const { getOrCreateAccount, updateAccount } = require('../economyData');
const { addItem } = require('../data/inventoryStore');

const STAFF_ROLE_ID       = process.env.STAFF_ROLE_ID;
const WINCHESTER_USER_ID  = process.env.WINCHESTER_USER_ID || null;

// ─────────────────────────────────────────────────────────────
// Helpers visuels

const COLOR_SALOON = 0xe74c3c; // rouge clair conseillé

const ok   = (t) => new EmbedBuilder().setColor(0x2ecc71).setDescription(t);
const ko   = (t) => new EmbedBuilder().setColor(0xe74c3c).setDescription(t);
const info = (t) => new EmbedBuilder().setColor(0x95a5a6).setDescription(t);

const humanize = (txt) =>
  String(txt || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// ─────────────────────────────────────────────────────────────
// Économie helpers (compte joueur + compte entreprise du patron)

function getEntrepriseBank(userId) {
  const acc = getOrCreateAccount(userId);
  acc.entreprise ||= { liquide: 0, banque: 0 };
  return acc.entreprise.banque || 0;
}

function decEntrepriseBank(userId, amount) {
  const acc = getOrCreateAccount(userId);
  acc.entreprise ||= { liquide: 0, banque: 0 };
  if ((acc.entreprise.banque || 0) < amount) throw new Error('NO_FUNDS');
  acc.entreprise.banque -= amount;
  updateAccount(userId, acc);
  return acc.entreprise.banque;
}

function creditEntrepriseBank(userId, amount) {
  const acc = getOrCreateAccount(userId);
  acc.entreprise ||= { liquide: 0, banque: 0 };
  acc.entreprise.banque += amount;
  updateAccount(userId, acc);
  return acc.entreprise.banque;
}

function creditEntrepriseLiquide(userId, amount) {
  const acc = getOrCreateAccount(userId);
  acc.entreprise ||= { liquide: 0, banque: 0 };
  acc.entreprise.liquide += amount;
  updateAccount(userId, acc);
  return acc.entreprise.liquide;
}

function debitCourant(userId, amount) {
  const acc = getOrCreateAccount(userId);
  acc.courant ||= { liquide: 0, banque: 0, entreprise: 0 };
  if ((acc.courant.liquide || 0) < amount) return false;
  acc.courant.liquide -= amount;
  updateAccount(userId, acc);
  return true;
}

// ─────────────────────────────────────────────────────────────
// Helpers affichage saloon

function buildHeaderEmbed(saloon, subtitle) {
  const bank = getEntrepriseBank(saloon.ownerId);
  return new EmbedBuilder()
    .setColor(COLOR_SALOON)
    .setTitle(`${saloon.name} — Saloon 🍸`)
    .setDescription(subtitle || '')
    .setThumbnail('https://raw.githubusercontent.com/zoowprime/otw/main/src/assets/icones/alcool_bouteille.png')
    .setFooter({
      text: `Banque entreprise: $${bank.toFixed(2)} • Revenus cumulés: $${(saloon.revenues || 0).toFixed(2)}`,
    });
}

function computePotentialValue(saloon) {
  let total = 0;
  const prices = saloon.prices || {};
  for (const [id, qty] of Object.entries(saloon.stock.drinks || {})) {
    const p = prices[id] || 0;
    total += p * qty;
  }
  for (const [id, qty] of Object.entries(saloon.stock.foods || {})) {
    const p = prices[id] || 0;
    total += p * qty;
  }
  return total;
}

function listStock(saloon) {
  const lines = [];

  for (const [id, qty] of Object.entries(saloon.stock.drinks || {})) {
    lines.push(`🍾 **${humanize(id)}** — x${qty}`);
  }
  for (const [id, qty] of Object.entries(saloon.stock.foods || {})) {
    lines.push(`🥫 **${humanize(id)}** — x${qty}`);
  }

  return lines.length ? lines.join('\n') : '_Aucun article en stock_';
}

// Fournisseur → options de sélection
function supplierOptions() {
  const drinkOpts = Object.entries(SUPPLIER_DRINKS).map(([id, data]) => ({
    label: data.label,
    value: `d:${id}`,
    description: `Alcool • Import $${data.importPrice.toFixed(2)}`,
    emoji: '🍾',
  }));

  const foodOpts = Object.entries(SUPPLIER_FOODS).map(([id, data]) => ({
    label: data.label,
    value: `f:${id}`,
    description: `Nourriture • Import $${data.importPrice.toFixed(2)}`,
    emoji: '🥫',
  }));

  return [...drinkOpts, ...foodOpts].slice(0, 25);
}

// ─────────────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('saloon')
    .setDescription('Gestion des saloons (commerce alcool & nourriture)')
    .addSubcommand(sc =>
      sc
        .setName('créer')
        .setDescription('Créer un saloon (STAFF)')
        .addUserOption(o =>
          o.setName('propriétaire').setDescription('Patron du saloon').setRequired(true),
        )
        .addStringOption(o =>
          o.setName('nom').setDescription('Nom du saloon').setRequired(true),
        ),
    )
    .addSubcommand(sc =>
      sc
        .setName('recruter')
        .setDescription('Recruter un employé')
        .addUserOption(o =>
          o.setName('membre').setDescription('Membre à recruter').setRequired(true),
        ),
    )
    .addSubcommand(sc =>
      sc
        .setName('virer')
        .setDescription('Renvoyer un employé')
        .addUserOption(o =>
          o.setName('membre').setDescription('Membre à renvoyer').setRequired(true),
        ),
    )
    .addSubcommand(sc => sc.setName('stock').setDescription('Voir le stock du saloon'))
    .addSubcommand(sc => sc.setName('voir').setDescription('Voir la fiche du saloon (patron)'))
    .addSubcommand(sc =>
      sc.setName('commander').setDescription('Commander auprès du fournisseur'),
    )
    .addSubcommand(sc =>
      sc
        .setName('définirprix')
        .setDescription('Définir le prix de vente d’un produit'),
    )
    .addSubcommand(sc =>
      sc
        .setName('modifierprix')
        .setDescription('Modifier le prix d’un produit'),
    )
    .addSubcommand(sc =>
      sc.setName('vendre').setDescription('Vendre un produit à un client'),
    )
    .addSubcommand(sc =>
      sc
        .setName('supprimer')
        .setDescription('Supprimer un saloon (STAFF)'),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ──────────────────────────────────────────────────────
    // /saloon créer (STAFF)
    if (sub === 'créer') {
      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
        return interaction.reply({
          embeds: [ko('⛔ Seuls les membres du staff peuvent créer un saloon.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      const owner = interaction.options.getUser('propriétaire');
      const name = interaction.options.getString('nom').trim();

      if (!owner || owner.bot) {
        return interaction.reply({
          embeds: [ko('❌ Propriétaire invalide.')],
          flags: MessageFlags.Ephemeral,
        });
      }
      if (getSaloonByOwner(owner.id)) {
        return interaction.reply({
          embeds: [ko('❌ Ce joueur possède déjà un saloon.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      try {
        const saloon = createSaloon(owner.id, name);
        const emb = buildHeaderEmbed(
          saloon,
          `👤 Patron : <@${saloon.ownerId}>\n🏷️ Saloon créé avec succès.`,
        );
        return interaction.reply({ embeds: [emb] });
      } catch {
        return interaction.reply({
          embeds: [ko('❌ Erreur lors de la création du saloon.')],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // Pour toutes les autres sous-commandes, on récupère le saloon où se trouve l’utilisateur
    const saloon = getSaloonByMember(interaction.user.id);
    if (!saloon && sub !== 'supprimer') {
      return interaction.reply({
        embeds: [ko('❌ Tu ne fais partie d’aucun saloon.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ──────────────────────────────────────────────────────
    // /saloon recruter
    if (sub === 'recruter') {
      if (!isOwner(saloon, interaction.user.id)) {
        return interaction.reply({
          embeds: [ko('⛔ Seul le patron peut recruter des employés.')],
          flags: MessageFlags.Ephemeral,
        });
      }
      const member = interaction.options.getUser('membre');
      if (!member || member.bot) {
        return interaction.reply({
          embeds: [ko('❌ Membre invalide.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      try {
        const updated = addEmployee(saloon.ownerId, member.id);
        return interaction.reply({
          embeds: [
            ok(
              `🤝 <@${member.id}> rejoint l’équipe du saloon (**${updated.employees.length}/3**).`,
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      } catch (e) {
        const msg =
          e.message === 'MAX_EMP'
            ? '❌ Limite atteinte : 3 employés.'
            : e.message === 'ALREADY_EMP'
            ? '❌ Ce membre fait déjà partie du saloon.'
            : '❌ Erreur lors du recrutement.';
        return interaction.reply({
          embeds: [ko(msg)],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // ──────────────────────────────────────────────────────
    // /saloon virer
    if (sub === 'virer') {
      if (!isOwner(saloon, interaction.user.id)) {
        return interaction.reply({
          embeds: [ko('⛔ Seul le patron peut renvoyer un employé.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      const member = interaction.options.getUser('membre');
      if (!member) {
        return interaction.reply({
          embeds: [ko('❌ Membre invalide.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('saloon_fire_yes')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🟩')
          .setLabel('Confirmer'),
        new ButtonBuilder()
          .setCustomId('saloon_fire_no')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🟥')
          .setLabel('Annuler'),
      );

      await interaction.reply({
        embeds: [info(`Êtes-vous sûr de vouloir renvoyer **${member.username}** ?`)],
        components: [row],
        flags: MessageFlags.Ephemeral,
      });

      const msg = await interaction.fetchReply();
      const click = await msg
        .awaitMessageComponent({
          componentType: ComponentType.Button,
          time: 60_000,
          filter: i => i.user.id === interaction.user.id,
        })
        .catch(() => null);

      if (!click) {
        return msg.edit({
          components: [],
          embeds: [ko('⌛ Temps écoulé, action annulée.')],
        });
      }

      if (click.customId === 'saloon_fire_no') {
        return click.update({
          components: [],
          embeds: [info('❎ Renvoi annulé.')],
        });
      }

      try {
        removeEmployee(saloon.ownerId, member.id);
        return click.update({
          components: [],
          embeds: [ok(`✅ ${member} a été renvoyé du saloon.`)],
        });
      } catch {
        return click.update({
          components: [],
          embeds: [ko('❌ Erreur lors du renvoi.')],
        });
      }
    }

    // ──────────────────────────────────────────────────────
    // /saloon stock
    if (sub === 'stock') {
      const bank = getEntrepriseBank(saloon.ownerId);
      const potential = computePotentialValue(saloon);
      const emb = buildHeaderEmbed(saloon, '📦 Stock actuel du saloon')
        .addFields(
          {
            name: 'Stock',
            value: listStock(saloon),
          },
          {
            name: 'Valeur potentielle (si tout est vendu aux prix définis)',
            value: `💰 ~ **$${potential.toFixed(2)}**`,
          },
          {
            name: 'Solde banque entreprise',
            value: `$${bank.toFixed(2)}`,
          },
        );

      return interaction.reply({
        embeds: [emb],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ──────────────────────────────────────────────────────
    // /saloon voir (patron)
    if (sub === 'voir') {
      if (!isOwner(saloon, interaction.user.id)) {
        return interaction.reply({
          embeds: [ko('⛔ Seul le patron peut voir la fiche complète du saloon.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      const bank = getEntrepriseBank(saloon.ownerId);
      const emb = new EmbedBuilder()
        .setColor(COLOR_SALOON)
        .setTitle(`${saloon.name} — Saloon 🍸`)
        .addFields(
          { name: 'Patron', value: `<@${saloon.ownerId}>`, inline: true },
          {
            name: 'Solde banque entreprise',
            value: `$${bank.toFixed(2)}`,
            inline: true,
          },
          {
            name: 'Employés',
            value: saloon.employees.length
              ? saloon.employees.map(id => `<@${id}>`).join(' • ')
              : '_Aucun employé_',
          },
          {
            name: 'Stock détaillé',
            value: listStock(saloon),
          },
        )
        .setFooter({
          text: `ID interne (patron): ${saloon.ownerId} • Revenus cumulés: $${(
            saloon.revenues || 0
          ).toFixed(2)}`,
        });

      return interaction.reply({
        embeds: [emb],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ──────────────────────────────────────────────────────
    // /saloon commander
    if (sub === 'commander') {
      if (!isMember(saloon, interaction.user.id)) {
        return interaction.reply({
          embeds: [ko('⛔ Tu n’es pas membre de ce saloon.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      const options = supplierOptions();
      if (!options.length) {
        return interaction.reply({
          embeds: [info('Aucun produit fournisseur configuré.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('saloon_order_item')
          .setPlaceholder('Choisis un produit à commander…')
          .addOptions(options),
      );

      await interaction.reply({
        embeds: [buildHeaderEmbed(saloon, '🧾 Sélectionne un produit fournisseur')],
        components: [row],
        flags: MessageFlags.Ephemeral,
      });

      const msg = await interaction.fetchReply();
      const selItem = await msg
        .awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          time: 90_000,
          filter: i => i.user.id === interaction.user.id,
        })
        .catch(() => null);

      if (!selItem) {
        return msg.edit({
          components: [],
          embeds: [ko('⌛ Temps écoulé, commande annulée.')],
        });
      }

      const raw = selItem.values[0]; // d:whiskey_rye ou f:jerky
      const kind = raw.startsWith('d:') ? 'drinks' : 'foods';
      const businessId = raw.slice(2);
      const catalogue =
        kind === 'drinks' ? SUPPLIER_DRINKS : SUPPLIER_FOODS;
      const meta = catalogue[businessId];

      if (!meta) {
        return selItem.update({
          components: [],
          embeds: [ko('❌ Produit introuvable dans le catalogue.')],
        });
      }

      // Sélection quantité
      const qtyRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('saloon_order_qty')
          .setPlaceholder('Choisis la quantité à importer…')
          .addOptions(
            [1, 5, 10, 20].map(n => ({
              label: `${n} unités`,
              value: String(n),
              description: `Coût import: $${(n * meta.importPrice).toFixed(2)}`,
              emoji: '📦',
            })),
          ),
      );

      await selItem.update({
        embeds: [
          buildHeaderEmbed(
            saloon,
            `🧾 Produit sélectionné : **${meta.label}**\nChoisis maintenant la quantité à commander.`,
          ),
        ],
        components: [qtyRow],
      });

      const selQty = await msg
        .awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          time: 90_000,
          filter: i => i.user.id === interaction.user.id,
        })
        .catch(() => null);

      if (!selQty) {
        return msg.edit({
          components: [],
          embeds: [ko('⌛ Temps écoulé, commande annulée.')],
        });
      }

      const qty = Number(selQty.values[0]) || 1;
      const total = qty * meta.importPrice;
      const solde = getEntrepriseBank(saloon.ownerId);

      if (solde < total) {
        return selQty.update({
          components: [],
          embeds: [
            ko(
              `❌ Fonds insuffisants en banque entreprise.\nSolde: $${solde.toFixed(
                2,
              )} • Requis: $${total.toFixed(2)}`,
            ),
          ],
        });
      }

      try {
        decEntrepriseBank(saloon.ownerId, total);
        if (WINCHESTER_USER_ID) {
          creditEntrepriseBank(WINCHESTER_USER_ID, total);
        }
        addStock(saloon.ownerId, businessId, qty, kind);

        return selQty.update({
          components: [],
          embeds: [
            ok(
              `✅ Commande validée : **${meta.label}** x${qty} pour **$${total.toFixed(
                2,
              )}**.\nBanque entreprise restante: $${getEntrepriseBank(
                saloon.ownerId,
              ).toFixed(2)}`,
            ),
          ],
        });
      } catch {
        return selQty.update({
          components: [],
          embeds: [ko('❌ Erreur lors de la commande.')],
        });
      }
    }

    // ──────────────────────────────────────────────────────
    // /saloon définirprix & /saloon modifierprix
    if (sub === 'définirprix' || sub === 'modifierprix') {
      // Construire la liste des produits en stock
      const items = [
        ...Object.entries(saloon.stock.drinks || {}).map(([id, qty]) => ({
          id,
          qty,
          emoji: '🍾',
        })),
        ...Object.entries(saloon.stock.foods || {}).map(([id, qty]) => ({
          id,
          qty,
          emoji: '🥫',
        })),
      ].filter(it => it.qty > 0);

      if (!items.length) {
        return interaction.reply({
          embeds: [info('📦 Aucun produit en stock à tarifer.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('saloon_setprice_item')
          .setPlaceholder('Sélectionne le produit à tarifer…')
          .addOptions(
            items.slice(0, 25).map(it => ({
              label: humanize(it.id),
              value: it.id,
              emoji: it.emoji,
              description: `Stock: ${it.qty} • Prix actuel: ${
                getPrice(saloon.ownerId, it.id) ?? 'non défini'
              }`,
            })),
          ),
      );

      await interaction.reply({
        embeds: [buildHeaderEmbed(saloon, '💵 Choisis le produit à tarifer.')],
        components: [row],
        flags: MessageFlags.Ephemeral,
      });

      const msg = await interaction.fetchReply();
      const sel = await msg
        .awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          time: 90_000,
          filter: i => i.user.id === interaction.user.id,
        })
        .catch(() => null);

      if (!sel) {
        return msg.edit({
          components: [],
          embeds: [ko('⌛ Temps écoulé, tarification annulée.')],
        });
      }

      const targetId = sel.values[0];

      await sel.update({
        components: [],
        embeds: [
          buildHeaderEmbed(
            saloon,
            `✏️ Produit sélectionné : **${humanize(
              targetId,
            )}**.\nEnvoie maintenant **le prix de vente** dans ce salon (ex: \`5.25\`).`,
          ),
        ],
      });

      const collected = await interaction.channel
        .awaitMessages({
          max: 1,
          time: 90_000,
          filter: m => m.author.id === interaction.user.id,
        })
        .catch(() => null);

      const m = collected?.first();
      if (!m) {
        return msg.edit({
          components: [],
          embeds: [ko('⌛ Aucun prix reçu, opération annulée.')],
        });
      }

      const value = parseFloat(m.content.replace(',', '.'));
      m.delete().catch(() => {});

      if (!Number.isFinite(value) || value <= 0) {
        return msg.edit({
          components: [],
          embeds: [ko('❌ Prix invalide. Utilise un nombre positif (ex: 4.5).')],
        });
      }

      setPrice(saloon.ownerId, targetId, value);

      return msg.edit({
        components: [],
        embeds: [
          ok(
            `✅ Prix défini pour **${humanize(
              targetId,
            )}** : **$${value.toFixed(2)}**.`,
          ),
        ],
      });
    }

    // ──────────────────────────────────────────────────────
    // /saloon vendre
    if (sub === 'vendre') {
      if (!isMember(saloon, interaction.user.id)) {
        return interaction.reply({
          embeds: [ko('⛔ Tu ne fais pas partie de ce saloon.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      const items = [
        ...Object.entries(saloon.stock.drinks || {}).map(([id, qty]) => ({
          id,
          qty,
          emoji: '🍾',
          bucket: 'drinks',
          meta: SUPPLIER_DRINKS[id],
        })),
        ...Object.entries(saloon.stock.foods || {}).map(([id, qty]) => ({
          id,
          qty,
          emoji: '🥫',
          bucket: 'foods',
          meta: SUPPLIER_FOODS[id],
        })),
      ].filter(it => it.qty > 0);

      if (!items.length) {
        return interaction.reply({
          embeds: [info('📦 Aucun produit vendable en stock.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('saloon_sell_item')
          .setPlaceholder('Choisis le produit à vendre…')
          .addOptions(
            items.slice(0, 25).map(it => ({
              label: it.meta?.label || humanize(it.id),
              value: JSON.stringify({ id: it.id, bucket: it.bucket }),
              emoji: it.emoji,
              description: `Stock: ${it.qty} • Prix: $${(
                getPrice(saloon.ownerId, it.id) || 0
              ).toFixed(2)}`,
            })),
          ),
      );

      await interaction.reply({
        embeds: [buildHeaderEmbed(saloon, '🧾 Sélectionne le produit à vendre.')],
        components: [row],
        flags: MessageFlags.Ephemeral,
      });

      const msg = await interaction.fetchReply();
      const sel = await msg
        .awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          time: 90_000,
          filter: i => i.user.id === interaction.user.id,
        })
        .catch(() => null);

      if (!sel) {
        return msg.edit({
          components: [],
          embeds: [ko('⌛ Temps écoulé, vente annulée.')],
        });
      }

      const parsed = JSON.parse(sel.values[0]);
      const price = getPrice(saloon.ownerId, parsed.id) || 0;
      const base =
        parsed.bucket === 'drinks'
          ? SUPPLIER_DRINKS[parsed.id]
          : SUPPLIER_FOODS[parsed.id];

      if (!price || !base) {
        return sel.update({
          components: [],
          embeds: [ko('❌ Produit ou prix invalide.')],
        });
      }

      await sel.update({
        components: [],
        embeds: [
          buildHeaderEmbed(
            saloon,
            `👉 Mentionne maintenant le **client** dans ce salon (ex: @Nom) pour vendre **${base.label}** à **$${price.toFixed(
              2,
            )}**.`,
          ),
        ],
      });

      const mentionCol = await interaction.channel
        .awaitMessages({
          max: 1,
          time: 90_000,
          filter: m => m.author.id === interaction.user.id,
        })
        .catch(() => null);

      const m = mentionCol?.first();
      const client = m?.mentions?.users?.first();
      if (!client || client.bot) {
        if (m) m.delete().catch(() => {});
        return msg.edit({
          components: [],
          embeds: [ko('❌ Mention invalide, vente annulée.')],
        });
      }
      if (m) m.delete().catch(() => {});

      // Confirmation côté client
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('saloon_buy_yes')
          .setLabel('Accepter')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('saloon_buy_no')
          .setLabel('Refuser')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger),
      );

      const prompt = await interaction.channel.send({
        content: `${client}`,
        allowedMentions: { users: [client.id] },
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR_SALOON)
            .setTitle('Confirmation d’achat')
            .setDescription(
              `Acceptez-vous l’achat de **${base.label}** pour **$${price.toFixed(
                2,
              )}** ?`,
            ),
        ],
        components: [confirmRow],
      });

      const click = await prompt
        .awaitMessageComponent({
          componentType: ComponentType.Button,
          time: 120_000,
          filter: i => i.user.id === client.id,
        })
        .catch(() => null);

      if (!click) {
        await prompt.edit({ components: [] }).catch(() => {});
        return msg.edit({
          components: [],
          embeds: [info('⌛ Demande d’achat expirée.')],
        });
      }

      if (click.customId === 'saloon_buy_no') {
        await click.update({
          components: [],
          embeds: [info('❎ Achat refusé, aucune transaction effectuée.')],
        });
        return;
      }

      // Paiement client
      if (!debitCourant(client.id, price)) {
        await click.update({
          components: [],
          embeds: [ko('❌ Fonds insuffisants pour le client.')],
        });
        return;
      }

      // Crédit saloon (liquide entreprise) + revenus cumulés
      creditEntrepriseLiquide(saloon.ownerId, price);
      addRevenue(saloon.ownerId, price);

      // Stock - et ajout item dans inventaire
      try {
        decStock(saloon.ownerId, parsed.id, 1, parsed.bucket);
        addItem(client.id, base.baseItemId, 1);
      } catch {
        // rollback paiement
        const acc = getOrCreateAccount(client.id);
        acc.courant ||= { liquide: 0, banque: 0, entreprise: 0 };
        acc.courant.liquide += price;
        updateAccount(client.id, acc);

        return click.update({
          components: [],
          embeds: [ko('❌ Erreur de stock, vente annulée.')],
        });
      }

      await click.update({
        components: [],
        embeds: [
          ok(
            `✅ Vente confirmée : **${base.label}** vendu à ${client} pour **$${price.toFixed(
              2,
            )}**.`,
          ),
        ],
      });

      return;
    }

    // ──────────────────────────────────────────────────────
    // /saloon supprimer (STAFF)
    if (sub === 'supprimer') {
      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
        return interaction.reply({
          embeds: [ko('⛔ Seuls les membres du staff peuvent supprimer un saloon.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      const db = loadSaloons();
      const ownerIds = Object.keys(db.saloons || {});
      if (!ownerIds.length) {
        return interaction.reply({
          embeds: [info('Aucun saloon enregistré.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('saloon_delete_owner')
          .setPlaceholder('Choisis le saloon à supprimer (par patron)…')
          .addOptions(
            ownerIds.slice(0, 25).map(id => {
              const s = db.saloons[id];
              return {
                label: s?.name || `Saloon du patron ${id}`,
                value: id,
                description: `Patron: ${id}`,
                emoji: '🗑️',
              };
            }),
          ),
      );

      await interaction.reply({
        embeds: [info('Sélectionne le saloon à supprimer.')],
        components: [row],
        flags: MessageFlags.Ephemeral,
      });

      const msg = await interaction.fetchReply();
      const sel = await msg
        .awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          time: 90_000,
          filter: i => i.user.id === interaction.user.id,
        })
        .catch(() => null);

      if (!sel) {
        return msg.edit({
          components: [],
          embeds: [ko('⌛ Temps écoulé, suppression annulée.')],
        });
      }

      const ownerId = sel.values[0];

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('saloon_del_yes')
          .setLabel('Confirmer')
          .setEmoji('🟩')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('saloon_del_no')
          .setLabel('Annuler')
          .setEmoji('🟥')
          .setStyle(ButtonStyle.Danger),
      );

      await sel.update({
        components: [confirmRow],
        embeds: [
          info(
            `Voulez-vous vraiment **supprimer définitivement** le saloon du patron <@${ownerId}> ?`,
          ),
        ],
      });

      const click = await msg
        .awaitMessageComponent({
          componentType: ComponentType.Button,
          time: 90_000,
          filter: i => i.user.id === interaction.user.id,
        })
        .catch(() => null);

      if (!click) {
        return msg.edit({
          components: [],
          embeds: [ko('⌛ Temps écoulé, suppression annulée.')],
        });
      }

      if (click.customId === 'saloon_del_no') {
        return click.update({
          components: [],
          embeds: [info('❎ Suppression annulée.')],
        });
      }

      deleteSaloon(ownerId);

      return click.update({
        components: [],
        embeds: [ok('✅ Saloon supprimé avec succès (stock, employés, historique supprimés).')],
      });
    }
  },
};
