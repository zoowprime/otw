// src/commands/economy.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreateAccount, updateAccount } = require('../economyData');

const BANKER_ROLE = process.env.BANQUIER_ROLE_ID;
const BANK_LOG_CHANNEL = process.env.BANK_LOG_CHANNEL || null;

// ─────────────────────────────────────────────────────────────
// Utils
const fmt = (n) => `${(Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} $`;
const footer = { text: 'otw' };

const accountTypes = [
  { name: 'Courant', value: 'courant' },
  { name: 'Entreprise', value: 'entreprise' },
  { name: 'Epargne', value: 'epargne' },
];

const subAccountChoices = [
  { name: 'Courant (Liquide)',    value: 'courant_liquide' },
  { name: 'Courant (Banque)',     value: 'courant_banque' },
  { name: 'Entreprise (Liquide)', value: 'entreprise_liquide' },
  { name: 'Entreprise (Banque)',  value: 'entreprise_banque' },
  { name: 'Épargne',              value: 'epargne' },
];

function getBalanceRef(acc, choice) {
  switch (choice) {
    case 'courant_liquide':    return acc.courant.liquide;
    case 'courant_banque':     return acc.courant.banque;
    case 'entreprise_liquide': return acc.entreprise.liquide;
    case 'entreprise_banque':  return acc.entreprise.banque;
    case 'epargne':            return acc.epargne;
    default:                   return null;
  }
}

function setBalanceRef(acc, choice, val) {
  switch (choice) {
    case 'courant_liquide':    acc.courant.liquide    = val; break;
    case 'courant_banque':     acc.courant.banque     = val; break;
    case 'entreprise_liquide': acc.entreprise.liquide = val; break;
    case 'entreprise_banque':  acc.entreprise.banque  = val; break;
    case 'epargne':            acc.epargne            = val; break;
  }
}

function embedCourant(user, acc) {
  const liq = acc.courant.liquide || 0;
  const ban = acc.courant.banque  || 0;
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
  const ban = acc.entreprise.banque  || 0;
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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('economy')
    .setDescription('Comptes & opérations (courant, entreprise, épargne).')

    // /economy compte
    .addSubcommand(sc =>
      sc.setName('compte')
        .setDescription('Affiche le compte choisi.')
        .addStringOption(o =>
          o.setName('type').setDescription('Type de compte')
            .setRequired(true).addChoices(...accountTypes)
        )
        .addUserOption(o =>
          o.setName('target').setDescription("Joueur cible (optionnel)")
        )
    )

    // /economy solde (raccourci numérique)
    .addSubcommand(sc =>
      sc.setName('solde')
        .setDescription('Affiche le solde total du compte choisi.')
        .addStringOption(o =>
          o.setName('type').setDescription('Type de compte')
            .setRequired(true).addChoices(...accountTypes)
        )
    )

    // /economy ajouterfonds (banquier)
    .addSubcommand(sc =>
      sc.setName('ajouterfonds')
        .setDescription("Ajoute des fonds dans un champ précis (banquiers).")
        .addUserOption(o => o.setName('target').setDescription('Joueur cible').setRequired(true))
        .addStringOption(o =>
          o.setName('destination').setDescription('Champ cible')
            .setRequired(true).addChoices(...subAccountChoices)
        )
        .addNumberOption(o => o.setName('montant').setDescription('Montant à ajouter').setRequired(true))
    )

    // /economy retirerfonds (banquier)  ✅ NOUVEAU
    .addSubcommand(sc =>
      sc.setName('retirerfonds')
        .setDescription("Retire des fonds d'un joueur (liquide/banque, courant/entreprise/épargne).")
        .addUserOption(o => o.setName('target').setDescription('Joueur cible').setRequired(true))
        .addStringOption(o =>
          o.setName('source').setDescription('Champ à débiter')
            .setRequired(true).addChoices(...subAccountChoices)
        )
        .addNumberOption(o => o.setName('montant').setDescription('Montant à retirer').setRequired(true))
    )

    // /economy paye (paiement joueur → joueur)
    .addSubcommand(sc =>
      sc.setName('paye')
        .setDescription('Payer un joueur depuis un de vos champs vers un de ses champs.')
        .addStringOption(o =>
          o.setName('source').setDescription('Votre champ source')
            .setRequired(true)
            .addChoices(
              { name: 'Courant (Liquide)', value: 'courant_liquide' },
              { name: 'Entreprise (Liquide)', value: 'entreprise_liquide' }
            )
        )
        .addStringOption(o =>
          o.setName('destination').setDescription('Champ du destinataire')
            .setRequired(true).addChoices(...subAccountChoices)
        )
        .addUserOption(o => o.setName('target').setDescription('Destinataire').setRequired(true))
        .addNumberOption(o => o.setName('montant').setDescription('Montant').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // /economy compte
    if (sub === 'compte') {
      const type = interaction.options.getString('type');
      const user = interaction.options.getUser('target') || interaction.user;
      const acc = getOrCreateAccount(user.id);

      if (type === 'courant') return interaction.reply({ embeds: [embedCourant(user, acc)] });
      if (type === 'entreprise') return interaction.reply({ embeds: [embedEntreprise(user, acc)] });
      if (type === 'epargne') return interaction.reply({ embeds: [embedEpargne(user, acc)] });
      return interaction.reply({ content: 'Type de compte invalide.', ephemeral: true });
    }

    // /economy solde
    if (sub === 'solde') {
      const type = interaction.options.getString('type');
      const acc = getOrCreateAccount(interaction.user.id);
      let val = 0;
      if (type === 'courant') val = (acc.courant.liquide || 0) + (acc.courant.banque || 0);
      else if (type === 'entreprise') val = (acc.entreprise.liquide || 0) + (acc.entreprise.banque || 0);
      else if (type === 'epargne') val = acc.epargne || 0;
      else return interaction.reply({ content: 'Type de compte invalide.', ephemeral: true });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x95a5a6).setDescription(`📊 **Solde ${type} :** ${fmt(val)}`).setFooter(footer)] });
    }

    // /economy ajouterfonds (banquier)
    if (sub === 'ajouterfonds') {
      if (!requireBanker(interaction)) return interaction.reply({ content: 'Commande réservée aux banquiers.', ephemeral: true });
      const user = interaction.options.getUser('target');
      const dest = interaction.options.getString('destination');
      const amount = interaction.options.getNumber('montant');

      const acc = getOrCreateAccount(user.id);
      const before = getBalanceRef(acc, dest);
      if (before === null) return interaction.reply({ content: 'Champ invalide.', ephemeral: true });

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
        interaction.client.channels.fetch(BANK_LOG_CHANNEL).then(ch => ch?.send({ embeds: [emb] })).catch(() => {});
      }
      return;
    }

    // /economy retirerfonds (banquier)
    if (sub === 'retirerfonds') {
      if (!requireBanker(interaction)) return interaction.reply({ content: 'Commande réservée aux banquiers.', ephemeral: true });
      const user = interaction.options.getUser('target');
      const src  = interaction.options.getString('source');
      const amount = interaction.options.getNumber('montant');

      const acc = getOrCreateAccount(user.id);
      const before = getBalanceRef(acc, src);
      if (before === null) return interaction.reply({ content: 'Champ invalide.', ephemeral: true });
      if (before < amount) return interaction.reply({ content: `Fonds insuffisants dans \`${src}\` (solde: ${fmt(before)}).`, ephemeral: true });

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
        interaction.client.channels.fetch(BANK_LOG_CHANNEL).then(ch => ch?.send({ embeds: [emb] })).catch(() => {});
      }
      return;
    }

    // /economy paye
    if (sub === 'paye') {
      const target = interaction.options.getUser('target');
      const src = interaction.options.getString('source');
      const dst = interaction.options.getString('destination');
      const amount = interaction.options.getNumber('montant');

      const sender = getOrCreateAccount(interaction.user.id);
      const recv   = getOrCreateAccount(target.id);

      const sVal = getBalanceRef(sender, src);
      const rVal = getBalanceRef(recv, dst);
      if (sVal === null || rVal === null) return interaction.reply({ content: 'Champ source/destination invalide.', ephemeral: true });
      if (sVal < amount) return interaction.reply({ content: `Fonds insuffisants dans \`${src}\`.`, ephemeral: true });

      setBalanceRef(sender, src, sVal - amount);
      setBalanceRef(recv,   dst, rVal + amount);
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
