// src/commands/entreprise.js
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
  createEnterprise, deleteEnterprise,
  getEnterpriseByOwner, getEnterpriseByMember,
  isOwner, isMember,
  addEmployee, removeEmployee,
  incBank, decBank, addRevenue, getBank,
  addStock, decStock,
  setPrice, getPrice,
  SUPPLIER_WEAPONS, SUPPLIER_HORSES, SUPPLIER_CARTS,
  load: loadEnterprises,
} = require('../data/entreprisesData');

const { getOrCreateAccount, updateAccount } = require('../economyData');
const { addItem } = require('../data/inventoryStore');

// 🔹 lien avec l’écurie (propriété des chevaux / charrettes)
const {
  setPlayerHorse,
  setPlayerCart,
} = require('../data/stableData');

// Ids env
const STAFF_ROLE_ID      = process.env.STAFF_ROLE_ID;
const WINCHESTER_USER_ID = process.env.WINCHESTER_USER_ID || null;

// Helpers d’embed
const ok   = (t) => new EmbedBuilder().setColor(0x2ecc71).setDescription(t);
const ko   = (t) => new EmbedBuilder().setColor(0xe74c3c).setDescription(t);
const info = (t) => new EmbedBuilder().setColor(0x95a5a6).setDescription(t);

const THEME = {
  armurerie: 0xc0392b, // rouge foncé
  ecurie:    0x145a32, // vert sapin
};

const humanize = (id) =>
  String(id).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// Débit / crédit (économie joueurs)
function debitCourant(userId, amount) {
  const acc = getOrCreateAccount(userId);
  acc.courant ||= { liquide: 0, banque: 0, entreprise: 0 };
  if ((acc.courant.liquide || 0) < amount) return false;
  acc.courant.liquide -= amount;
  updateAccount(userId, acc);
  return true;
}
function creditCourant(userId, amount) {
  const acc = getOrCreateAccount(userId);
  acc.courant ||= { liquide: 0, banque: 0, entreprise: 0 };
  acc.courant.liquide += amount;
  updateAccount(userId, acc);
  return true;
}
function creditBanque(userId, amount) {
  const acc = getOrCreateAccount(userId);
  acc.courant ||= { liquide: 0, banque: 0, entreprise: 0 };
  acc.courant.banque += amount;
  updateAccount(userId, acc);
  return true;
}

// Entête entreprise avec solde via getBank()
function titleEmbed(ent, subtitle) {
  const bank = getBank(ent.ownerId);
  const revenues = ent.revenues || 0;
  return new EmbedBuilder()
    .setColor(THEME[ent.type])
    .setTitle(`${ent.name} — ${ent.type === 'armurerie' ? 'Armurerie 🔫' : 'Écurie 🐴'}`)
    .setDescription(subtitle || '')
    .setFooter({ text: `Banque: $${bank.toFixed(2)} • Revenus: $${revenues.toFixed(2)}` });
}

function listStock(ent) {
  if (ent.type === 'armurerie') {
    const lines = Object.entries(ent.stock.weapons || {})
      .sort()
      .map(([id, q]) => `• ${humanize(id)} — **x${q}**`);
    return lines.length ? lines.join('\n') : '_Aucun article en stock_';
  } else {
    const h = Object.entries(ent.stock.horses || {}).map(([id,q]) => `• 🐎 ${humanize(id)} — **x${q}**`);
    const c = Object.entries(ent.stock.carts  || {}).map(([id,q]) => `• 🚚 ${humanize(id)} — **x${q}**`);
    const lines = [...h, ...c];
    return lines.length ? lines.join('\n') : '_Aucun article en stock_';
  }
}

// Options fournisseurs (armurerie)
function supplierOptionsArmurerie() {
  return Object.entries(SUPPLIER_WEAPONS)
    .map(([id, p]) => ({
      label: humanize(id).slice(0, 100),
      value: id,
      description: `$${p.toFixed(2)}`,
      emoji: '🔫',
    }))
    .slice(0, 25);
}

// Groupes de chevaux par catégorie (clé = premier segment de l’ID)
function groupHorsesByCategory() {
  const buckets = {};
  for (const [id, price] of Object.entries(SUPPLIER_HORSES)) {
    const catKey = id.split('_')[0]; // ex: "american", "appaloosa", "breton", ...
    if (!buckets[catKey]) buckets[catKey] = [];
    buckets[catKey].push({ id, price });
  }
  return buckets;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('entreprise')
    .setDescription('Gestion des entreprises Armurerie / Écurie')
    .addSubcommand(sc => sc.setName('créer').setDescription('Créer une entreprise (STAFF)')
      .addUserOption(o => o.setName('propriétaire').setDescription('Patron').setRequired(true))
      .addStringOption(o => o.setName('nom').setDescription('Nom de l’entreprise').setRequired(true))
      .addStringOption(o => o.setName('type').setDescription('Type')
        .addChoices(
          { name: 'Armurerie 🔫', value: 'armurerie' },
          { name: 'Écurie 🐴',   value: 'ecurie' }
        ).setRequired(true))
    )
    .addSubcommand(sc => sc.setName('recruter').setDescription('Recruter un employé')
      .addUserOption(o => o.setName('membre').setDescription('Membre à recruter').setRequired(true)))
    .addSubcommand(sc => sc.setName('virer').setDescription('Renvoyer un employé')
      .addUserOption(o => o.setName('membre').setDescription('Membre à renvoyer').setRequired(true)))
    .addSubcommand(sc => sc.setName('stock').setDescription('Voir le stock de mon entreprise'))
    .addSubcommand(sc => sc.setName('voir').setDescription('Voir la fiche entreprise (patron)'))
    .addSubcommand(sc => sc.setName('commander').setDescription('Commander auprès du fournisseur'))
    .addSubcommand(sc => sc.setName('définirprix').setDescription('Définir le prix de vente d’un item'))
    .addSubcommand(sc => sc.setName('modifierprix').setDescription('Modifier le prix d’un item'))
    .addSubcommand(sc => sc.setName('vendre').setDescription('Vendre un item à un client'))
    .addSubcommand(sc => sc.setName('supprimer').setDescription('Supprimer une entreprise (STAFF)')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ──────────────────────────────────────────────────────
    // /entreprise créer — STAFF ONLY
    if (sub === 'créer') {
      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
        return interaction.reply({ embeds:[ko('⛔ Réservé au staff.')], flags: MessageFlags.Ephemeral });
      }
      const owner = interaction.options.getUser('propriétaire');
      const name  = interaction.options.getString('nom').trim();
      const type  = interaction.options.getString('type');

      if (!owner || owner.bot) {
        return interaction.reply({ embeds:[ko('❌ Propriétaire invalide.')], flags: MessageFlags.Ephemeral });
      }
      if (getEnterpriseByOwner(owner.id)) {
        return interaction.reply({ embeds:[ko('❌ Ce joueur possède déjà une entreprise.')], flags: MessageFlags.Ephemeral });
      }

      try {
        const ent = createEnterprise(owner.id, name, type);
        const emb = titleEmbed(ent, `👤 Patron: <@${ent.ownerId}>\n🏷️ Créée avec succès.`);
        return interaction.reply({ embeds:[emb] });
      } catch {
        return interaction.reply({ embeds:[ko('❌ Erreur création.')], flags: MessageFlags.Ephemeral });
      }
    }

    // Entreprise de l’utilisateur (patron ou employé)
    const ent = getEnterpriseByMember(interaction.user.id);
    if (!ent) {
      return interaction.reply({ embeds:[ko('❌ Tu ne fais partie d’aucune entreprise.')], flags: MessageFlags.Ephemeral });
    }

    // ──────────────────────────────────────────────────────
    if (sub === 'recruter') {
      if (!isOwner(ent, interaction.user.id)) {
        return interaction.reply({ embeds:[ko('⛔ Seul le patron peut recruter.')], flags: MessageFlags.Ephemeral });
      }
      const member = interaction.options.getUser('membre');
      if (!member || member.bot) {
        return interaction.reply({ embeds:[ko('❌ Membre invalide.')], flags: MessageFlags.Ephemeral });
      }
      try {
        addEmployee(ent.ownerId, member.id);
        return interaction.reply({
          embeds:[ok(`🤝 <@${member.id}> rejoint l’équipe (**${getEnterpriseByOwner(ent.ownerId).employees.length}/4**).`)],
          flags: MessageFlags.Ephemeral
        });
      } catch (e) {
        const msg =
          e.message === 'MAX_EMP'    ? '❌ Limite atteinte (4).' :
          e.message === 'ALREADY_EMP'? '❌ Déjà employé.' :
                                        '❌ Erreur.';
        return interaction.reply({ embeds:[ko(msg)], flags: MessageFlags.Ephemeral });
      }
    }

    // ──────────────────────────────────────────────────────
    if (sub === 'virer') {
      if (!isOwner(ent, interaction.user.id)) {
        return interaction.reply({ embeds:[ko('⛔ Seul le patron peut renvoyer.')], flags: MessageFlags.Ephemeral });
      }
      const member = interaction.options.getUser('membre');
      if (!member) return interaction.reply({ embeds:[ko('❌ Membre invalide.')], flags: MessageFlags.Ephemeral });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ent_kick_yes').setStyle(ButtonStyle.Success).setEmoji('🟩').setLabel('Confirmer'),
        new ButtonBuilder().setCustomId('ent_kick_no').setStyle(ButtonStyle.Danger).setEmoji('🟥').setLabel('Annuler')
      );
      await interaction.reply({ embeds:[info(`Voulez-vous renvoyer **${member.username}** ?`)], components:[row], flags: MessageFlags.Ephemeral });

      const msg = await interaction.fetchReply();
      const click = await msg.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 60_000,
        filter: i => i.user.id === interaction.user.id,
      }).catch(()=>null);
      if (!click) return msg.edit({ components:[], embeds:[ko('⌛ Temps écoulé.')] });

      if (click.customId === 'ent_kick_no') return click.update({ components:[], embeds:[info('❎ Annulé.')] });

      try {
        removeEmployee(ent.ownerId, member.id);
        return click.update({ components:[], embeds:[ok(`✅ ${member} a été renvoyé.`)] });
      } catch {
        return click.update({ components:[], embeds:[ko('❌ Erreur.')] });
      }
    }

    // ──────────────────────────────────────────────────────
    if (sub === 'stock') {
      const emb = titleEmbed(ent, '📦 Stock actuel')
        .addFields({ name: 'Inventaire', value: listStock(ent) });
      return interaction.reply({ embeds:[emb], flags: MessageFlags.Ephemeral });
    }

    // ──────────────────────────────────────────────────────
    if (sub === 'voir') {
      if (!isOwner(ent, interaction.user.id)) {
        return interaction.reply({ embeds:[ko('⛔ Réservé au patron.')], flags: MessageFlags.Ephemeral });
      }
      const bank = getBank(ent.ownerId);
      const emb = new EmbedBuilder()
        .setColor(THEME[ent.type])
        .setTitle(`${ent.name} — ${ent.type === 'armurerie' ? 'Armurerie 🔫' : 'Écurie 🐴'}`)
        .addFields(
          { name: 'Patron', value: `<@${ent.ownerId}>`, inline: true },
          { name: 'Solde banque', value: `$${bank.toFixed(2)}`, inline: true },
          { name: 'Employés', value: ent.employees.length ? ent.employees.map(id=>`<@${id}>`).join(' • ') : '_Aucun_', inline: false },
          { name: 'Stock', value: listStock(ent) },
        )
        .setFooter({ text: `ID interne: ${ent.ownerId} • Revenus $${(ent.revenues||0).toFixed(2)}` });
      return interaction.reply({ embeds:[emb], flags: MessageFlags.Ephemeral });
    }

    // ──────────────────────────────────────────────────────
    // /entreprise commander
    if (sub === 'commander') {
      if (!isMember(ent, interaction.user.id)) {
        return interaction.reply({ embeds:[ko('⛔ Non autorisé.')], flags: MessageFlags.Ephemeral });
      }

      // ARMURERIE : une seule liste
      if (ent.type === 'armurerie') {
        const opts = supplierOptionsArmurerie();
        if (!opts.length) {
          return interaction.reply({ embeds:[info('Aucun article fournisseur configuré.')], flags: MessageFlags.Ephemeral });
        }

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('ent_order_item_armurerie')
            .setPlaceholder('Choisis une arme à commander…')
            .addOptions(opts)
        );
        await interaction.reply({
          embeds:[titleEmbed(ent, '🧾 Sélectionne une arme fournisseur')],
          components:[row],
          flags: MessageFlags.Ephemeral
        });

        const msg = await interaction.fetchReply();
        const sel = await msg.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          time: 90_000,
          filter: i => i.user.id === interaction.user.id,
        }).catch(()=>null);
        if (!sel) return msg.edit({ components:[], embeds:[ko('⌛ Temps écoulé.')] });

        const choice = sel.values[0];
        const priceUnit = SUPPLIER_WEAPONS[choice] || 0;
        const itemId = choice;
        const qty = 1;
        const total = priceUnit * qty;
        const solde = getBank(ent.ownerId);

        if (solde < total) {
          return sel.update({ components:[], embeds:[ko(`❌ Fonds insuffisants en banque entreprise. Requis: $${total.toFixed(2)}`)] });
        }

        try {
          decBank(ent.ownerId, total);
          if (WINCHESTER_USER_ID) creditBanque(WINCHESTER_USER_ID, total);
          addStock(ent.ownerId, itemId, qty, null);
          return sel.update({ components:[], embeds:[ok(`✅ Commandé **${humanize(itemId)}** x${qty} pour **$${total.toFixed(2)}**.`)] });
        } catch {
          return sel.update({ components:[], embeds:[ko('❌ Erreur commande.')] });
        }
      }

      // ÉCURIE : 2 étapes → catégorie puis monture
      const horsesByCat = groupHorsesByCategory();
      const catOptions = Object.entries(horsesByCat).map(([catKey, list]) => ({
        label: `🐎 ${humanize(catKey)}`.slice(0, 100),
        value: catKey,
        description: `${list.length} monture(s)`,
        emoji: '🐎',
      }));

      if (Object.keys(SUPPLIER_CARTS).length > 0) {
        catOptions.push({
          label: '🚚 Charrettes',
          value: '__carts',
          description: `${Object.keys(SUPPLIER_CARTS).length} modèle(s)`,
          emoji: '🚚',
        });
      }

      if (!catOptions.length) {
        return interaction.reply({
          embeds:[info('Aucun cheval / charrette configuré chez le fournisseur.')],
          flags: MessageFlags.Ephemeral
        });
      }

      const rowCat = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ent_order_cat')
          .setPlaceholder('Choisis une catégorie de montures…')
          .addOptions(catOptions.slice(0, 25))
      );

      await interaction.reply({
        embeds:[titleEmbed(ent, '🧾 Étape 1 — Choisis la catégorie')],
        components:[rowCat],
        flags: MessageFlags.Ephemeral
      });

      const msg = await interaction.fetchReply();
      const selCat = await msg.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        time: 90_000,
        filter: i => i.user.id === interaction.user.id,
      }).catch(()=>null);
      if (!selCat) return msg.edit({ components:[], embeds:[ko('⌛ Temps écoulé.')] });

      const pickedCat = selCat.values[0];
      let secondOptions = [];
      let bucket = null;

      if (pickedCat === '__carts') {
        bucket = 'carts';
        secondOptions = Object.entries(SUPPLIER_CARTS).map(([id, price]) => ({
          label: humanize(id).slice(0, 100),
          value: id,
          description: `$${price.toFixed(2)}`,
          emoji: '🚚',
        }));
      } else {
        bucket = 'horses';
        const horses = horsesByCat[pickedCat] || [];
        secondOptions = horses.map(({ id, price }) => ({
          label: humanize(id).slice(0, 100),
          value: id,
          description: `$${price.toFixed(2)}`,
          emoji: '🐎',
        }));
      }

      if (!secondOptions.length) {
        return selCat.update({
          components: [],
          embeds: [ko('❌ Aucun modèle disponible dans cette catégorie.')]
        });
      }

      const rowItem = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ent_order_item_ecurie')
          .setPlaceholder('Choisis la monture à commander…')
          .addOptions(secondOptions.slice(0, 25))
      );

      await selCat.update({
        embeds: [titleEmbed(ent, '🧾 Étape 2 — Choisis la monture')],
        components: [rowItem],
      });

      const selItem = await msg.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        time: 90_000,
        filter: i => i.user.id === interaction.user.id,
      }).catch(()=>null);
      if (!selItem) return msg.edit({ components:[], embeds:[ko('⌛ Temps écoulé.')] });

      const itemId = selItem.values[0];
      let priceUnit = 0;
      if (bucket === 'horses') {
        priceUnit = SUPPLIER_HORSES[itemId] || 0;
      } else {
        priceUnit = SUPPLIER_CARTS[itemId] || 0;
      }

      const qty = 1;
      const total = priceUnit * qty;
      const solde = getBank(ent.ownerId);

      if (solde < total) {
        return selItem.update({
          components: [],
          embeds: [ko(`❌ Fonds insuffisants en banque entreprise. Requis: $${total.toFixed(2)}`)]
        });
      }

      try {
        decBank(ent.ownerId, total);
        if (WINCHESTER_USER_ID) creditBanque(WINCHESTER_USER_ID, total);
        addStock(ent.ownerId, itemId, qty, bucket);
        return selItem.update({
          components: [],
          embeds: [ok(`✅ Commandé **${humanize(itemId)}** x${qty} pour **$${total.toFixed(2)}**.`)]
        });
      } catch {
        return selItem.update({ components:[], embeds:[ko('❌ Erreur commande.')] });
      }
    }

    // ──────────────────────────────────────────────────────
    if (sub === 'définirprix' || sub === 'modifierprix') {
      const entries = ent.type === 'armurerie'
        ? Object.keys(ent.stock.weapons || {})
        : [...Object.keys(ent.stock.horses || {}), ...Object.keys(ent.stock.carts || {})];
      if (!entries.length) return interaction.reply({ embeds:[info('📦 Stock vide.')], flags: MessageFlags.Ephemeral });

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ent_setprice_item')
          .setPlaceholder('Sélectionne l’article à tarifer…')
          .addOptions(entries.slice(0,25).map(id => ({
            label: humanize(id),
            value: id,
            description: `Prix actuel: ${getPrice(ent.ownerId, id) ?? '—'}`,
            emoji: ent.type === 'armurerie' ? '💵' : '🏷️'
          })))
      );
      await interaction.reply({ embeds:[titleEmbed(ent, '💵 Choisis l’article à tarifer')], components:[row], flags: MessageFlags.Ephemeral });

      const msg = await interaction.fetchReply();
      const sel = await msg.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        time: 90_000,
        filter: i => i.user.id === interaction.user.id,
      }).catch(()=>null);
      if (!sel) return msg.edit({ components:[], embeds:[ko('⌛ Temps écoulé.')] });

      const targetId = sel.values[0];

      // ⚠️ MAX 5 boutons par row → 4 presets + 1 Annuler
      const presetsValues = [5, 10, 25, 50];
      const presetButtons = presetsValues.map(v =>
        new ButtonBuilder()
          .setCustomId(`ent_price_${v}`)
          .setLabel(`$${v}`)
          .setStyle(ButtonStyle.Secondary)
      );
      const cancelButton = new ButtonBuilder()
        .setCustomId('ent_price_cancel')
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Danger);

      const rowBtns = new ActionRowBuilder().addComponents(
        ...presetButtons,
        cancelButton
      );

      await sel.update({
        embeds: [titleEmbed(ent, `Tarifer **${humanize(targetId)}** — choisis un preset`)],
        components: [rowBtns]
      });

      const click = await msg.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 90_000,
        filter: i => i.user.id === interaction.user.id,
      }).catch(()=>null);
      if (!click) return msg.edit({ components:[], embeds:[ko('⌛ Temps écoulé.')] });
      if (click.customId === 'ent_price_cancel') {
        return click.update({ components:[], embeds:[info('❎ Annulé.')] });
      }

      const val = Number(click.customId.replace('ent_price_', '')) || 0;
      setPrice(ent.ownerId, targetId, val);
      return click.update({ components:[], embeds:[ok(`✅ Prix défini: **${humanize(targetId)}** → **$${val.toFixed(2)}**`)] });
    }

    // ──────────────────────────────────────────────────────
    if (sub === 'vendre') {
      if (!isMember(ent, interaction.user.id)) {
        return interaction.reply({ embeds:[ko('⛔ Non autorisé.')], flags: MessageFlags.Ephemeral });
      }

      // Build liste des items vendables (>0)
      let items = [];
      if (ent.type === 'armurerie') {
        items = Object.entries(ent.stock.weapons || {})
          .filter(([,q]) => q>0)
          .map(([id,q]) => ({ id, qty:q, emoji:'🔫' }));
      } else {
        items = [
          ...Object.entries(ent.stock.horses || {}).filter(([,q])=>q>0).map(([id,q]) => ({ id, qty:q, emoji:'🐎', bucket:'horses' })),
          ...Object.entries(ent.stock.carts  || {}).filter(([,q])=>q>0).map(([id,q]) => ({ id, qty:q, emoji:'🛒', bucket:'carts'  })),
        ];
      }
      if (!items.length) return interaction.reply({ embeds:[info('📦 Aucun article vendable en stock.')], flags: MessageFlags.Ephemeral });

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ent_sell_item')
          .setPlaceholder('Choisis l’objet à vendre…')
          .addOptions(items.slice(0,25).map(it => ({
            label: humanize(it.id), value: JSON.stringify(it),
            description: `Stock: ${it.qty} • Prix: $${(getPrice(ent.ownerId, it.id) ?? 0).toFixed(2)}`,
            emoji: it.emoji
          })))
      );
      await interaction.reply({
        embeds:[titleEmbed(ent, '🧾 Sélectionne l’article à vendre')],
        components:[row],
        flags: MessageFlags.Ephemeral
      });

      const msg = await interaction.fetchReply();
      const sel = await msg.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        time: 90_000,
        filter: i => i.user.id === interaction.user.id,
      }).catch(()=>null);
      if (!sel) return msg.edit({ components:[], embeds:[ko('⌛ Temps écoulé.')] });

      const picked = JSON.parse(sel.values[0]);
      const price = getPrice(ent.ownerId, picked.id) || 0;
      if (!price) return sel.update({ components:[], embeds:[ko('❌ Aucun prix défini.')] });

      // Demander la mention du client
      await sel.update({ components:[], embeds:[info('👉 Mentionne maintenant le client dans ce salon (ex: @Nom).')] });

      const mention = await interaction.channel.awaitMessages({
        max: 1,
        time: 90_000,
        filter: m => m.author.id === interaction.user.id
      }).catch(()=>null);
      const m = mention?.first();
      const client = m?.mentions?.users?.first();
      if (!client || client.bot) {
        if (m) m.delete().catch(()=>{});
        return msg.edit({ embeds:[ko('❌ Mention invalide.')], components:[] });
      }
      if (m) m.delete().catch(()=>{});

      // Confirmation côté client
      const confirm = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ent_buy_yes').setLabel('Accepter').setEmoji('✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ent_buy_no').setLabel('Refuser').setEmoji('❌').setStyle(ButtonStyle.Danger),
      );
      const prompt = await interaction.channel.send({
        content: `${client}`,
        allowedMentions: { users: [client.id] },
        embeds: [new EmbedBuilder()
          .setColor(THEME[ent.type])
          .setTitle('Confirmation d’achat')
          .setDescription(`Voulez-vous acheter **${humanize(picked.id)}** pour **$${price.toFixed(2)}** ?`)
        ],
        components: [confirm]
      });

      const click = await prompt.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 120_000,
        filter: i => i.user.id === client.id,
      }).catch(()=>null);

      if (!click) {
        await prompt.edit({ components: [] }).catch(()=>{});
        return msg.edit({ embeds:[info('⌛ Demande expirée.')], components:[] });
      }
      if (click.customId === 'ent_buy_no') {
        await click.update({ components:[], embeds:[info('❎ Achat refusé.')] });
        return;
      }

      // Paiement
      if (!debitCourant(client.id, price)) {
        await click.update({ components:[], embeds:[ko('❌ Fonds insuffisants.')] });
        return;
      }
      incBank(ent.ownerId, price);
      addRevenue(ent.ownerId, price);

      // Décrément stock + Attribution
      try {
        if (ent.type === 'armurerie') {
          decStock(ent.ownerId, picked.id, 1);
          addItem(client.id, picked.id, 1); // ajout inventaire
        } else {
          // Retire du stock de l’écurie
          decStock(ent.ownerId, picked.id, 1, picked.bucket);
          // Assigne au joueur pour /écurie
          if (picked.bucket === 'horses') {
            setPlayerHorse(client.id, picked.id);
          } else if (picked.bucket === 'carts') {
            setPlayerCart(client.id, picked.id);
          }
        }
      } catch {
        // rollback paiement si erreur stock
        creditCourant(client.id, price);
        // re-crédite la banque entreprise (en annulant la décrémentation précédente via incBank)
        decBank(ent.ownerId, -price);
        return click.update({ components:[], embeds:[ko('❌ Erreur stock/attribution.')] });
      }

      await click.update({ components:[], embeds:[ok(`✅ Vente confirmée : **${humanize(picked.id)}** à ${client} pour **$${price.toFixed(2)}**.`)] });
      return;
    }

    // ──────────────────────────────────────────────────────
    if (sub === 'supprimer') {
      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
        return interaction.reply({ embeds:[ko('⛔ Réservé au staff.')], flags: MessageFlags.Ephemeral });
      }
      const allOwnerIds = Object.keys(loadEnterprises().enterprises || {});
      if (!allOwnerIds.length) {
        return interaction.reply({ embeds:[info('Aucune entreprise.')], flags: MessageFlags.Ephemeral });
      }

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ent_del_owner')
          .setPlaceholder('Choisis l’entreprise à supprimer (par patron)…')
          .addOptions(allOwnerIds.slice(0,25).map(id => ({
            label: `Patron ${id}`, value: id, description: 'Supprimer définitivement', emoji: '🗑️'
          })))
      );
      await interaction.reply({ embeds:[info('Sélectionne l’entreprise à supprimer')], components:[row], flags: MessageFlags.Ephemeral });

      const msg = await interaction.fetchReply();
      const sel = await msg.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        time: 90_000,
        filter: i => i.user.id === interaction.user.id,
      }).catch(()=>null);
      if (!sel) return msg.edit({ components:[], embeds:[ko('⌛ Temps écoulé.')] });

      const ownerId = sel.values[0];
      const rowBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ent_del_yes').setLabel('Confirmer').setEmoji('🟩').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ent_del_no').setLabel('Annuler').setEmoji('🟥').setStyle(ButtonStyle.Danger),
      );
      await sel.update({ components:[rowBtn], embeds:[info(`Supprimer définitivement l’entreprise du patron <@${ownerId}> ?`)] });

      const click = await msg.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 90_000,
        filter: i => i.user.id === interaction.user.id,
      }).catch(()=>null);
      if (!click) return msg.edit({ components:[], embeds:[ko('⌛ Temps écoulé.')] });
      if (click.customId === 'ent_del_no') return click.update({ components:[], embeds:[info('❎ Annulé.')] });

      deleteEnterprise(ownerId);
      return click.update({ components:[], embeds:[ok('✅ Entreprise supprimée.')] });
    }
  }
};
