// src/commands/economy.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreateAccount, getAccount, updateAccount } = require('../economyData');

// Pour éviter la duplication, on définit 5 “types de destination” possibles
// qui correspondent aux champs de la structure { courant: { liquide, banque }, entreprise: { liquide, banque }, epargne }
const subAccountChoices = [
  { name: 'Compte Courant (Liquide)',    value: 'courant_liquide' },
  { name: 'Compte Courant (Banque)',     value: 'courant_banque' },
  { name: 'Compte Entreprise (Liquide)', value: 'entreprise_liquide' },
  { name: 'Compte Entreprise (Banque)',  value: 'entreprise_banque' },
  { name: 'Compte Epargne',             value: 'epargne' }
];

/**
 * Récupère la valeur d'un champ (liquide/banque) dans le compte
 * ex: "courant_liquide" => account.courant.liquide
 */
function getBalanceRef(account, choice) {
  switch (choice) {
    case 'courant_liquide':    return account.courant.liquide;
    case 'courant_banque':     return account.courant.banque;
    case 'entreprise_liquide': return account.entreprise.liquide;
    case 'entreprise_banque':  return account.entreprise.banque;
    case 'epargne':            return account.epargne;
    default:                   return null;
  }
}

/**
 * Assigne une valeur à un champ
 */
function setBalanceRef(account, choice, newValue) {
  switch (choice) {
    case 'courant_liquide':    account.courant.liquide = newValue; break;
    case 'courant_banque':     account.courant.banque = newValue;  break;
    case 'entreprise_liquide': account.entreprise.liquide = newValue; break;
    case 'entreprise_banque':  account.entreprise.banque = newValue;  break;
    case 'epargne':            account.epargne = newValue;         break;
  }
}

function embedReply(description) {
  return new EmbedBuilder().setColor(0xff0000).setDescription(description);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('economy')
    .setDescription('Système économique avec champs (liquide, banque) pour courant et entreprise, et épargne.')

    // 1) /economy compte
    .addSubcommand(subcommand =>
      subcommand
        .setName('compte')
        .setDescription('Affiche un compte (courant, entreprise ou epargne) avec Liquide/Banque/Total.')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Choisir le type: courant, entreprise ou epargne')
            .setRequired(true)
            .addChoices(
              { name: 'Courant',    value: 'courant' },
              { name: 'Entreprise', value: 'entreprise' },
              { name: 'Epargne',    value: 'epargne' }
            )
        )
        .addUserOption(option =>
          option.setName('target')
            .setDescription("Afficher le compte de qui ? (facultatif)")
            .setRequired(false)
        )
    )

    // 2) /economy ajouterargent (banquiers)
    .addSubcommand(subcommand =>
      subcommand
        .setName('ajouterargent')
        .setDescription('Ajoute de l’argent dans un champ précis (banquiers uniquement).')
        .addUserOption(option =>
          option.setName('target')
            .setDescription("Le joueur cible")
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('destination')
            .setDescription('Où ajouter l’argent ? (courant_liquide, courant_banque, entreprise_liquide, etc.)')
            .setRequired(true)
            .addChoices(...subAccountChoices)
        )
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription("Le montant à ajouter")
            .setRequired(true)
        )
    )

    // 3) /economy paye
    .addSubcommand(subcommand =>
      subcommand
        .setName('paye')
        .setDescription('Payer un autre joueur depuis un champ (courant_liquide, etc.) vers un autre champ.')
        .addUserOption(option =>
          option.setName('target')
            .setDescription("Le joueur à payer")
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('source')
            .setDescription('Votre champ source (courant_liquide, etc.)')
            .setRequired(true)
            .addChoices(...subAccountChoices)
        )
        .addStringOption(option =>
          option.setName('destination')
            .setDescription("Le champ du destinataire (courant_liquide, etc.)")
            .setRequired(true)
            .addChoices(...subAccountChoices)
        )
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription("Le montant à payer")
            .setRequired(true)
        )
    ),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    // 1) /economy compte
    if (subcommand === 'compte') {
      const type = interaction.options.getString('type'); // "courant", "entreprise" ou "epargne"
      const target = interaction.options.getUser('target') || interaction.user;
      const account = getAccount(target.id) || getOrCreateAccount(target.id);

      if (type === 'courant') {
        // Affiche Liquide + Banque + Total
        const liq = account.courant.liquide;
        const ban = account.courant.banque;
        const total = liq + ban;
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle(`Compte Courant de ${target.username}`)
          .setDescription(
            `**Liquide :** $${liq.toFixed(2)}\n` +
            `**Banque :** $${ban.toFixed(2)}\n` +
            `**Total :** $${total.toFixed(2)}`
          );
        return interaction.reply({ embeds: [embed] });

      } else if (type === 'entreprise') {
        const liq = account.entreprise.liquide;
        const ban = account.entreprise.banque;
        const total = liq + ban;
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle(`Compte Entreprise de ${target.username}`)
          .setDescription(
            `**Liquide :** $${liq.toFixed(2)}\n` +
            `**Banque :** $${ban.toFixed(2)}\n` +
            `**Total :** $${total.toFixed(2)}`
          );
        return interaction.reply({ embeds: [embed] });

      } else if (type === 'epargne') {
        // Epargne est un simple nombre
        const val = account.epargne;
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle(`Compte Epargne de ${target.username}`)
          .setDescription(`**Solde :** $${val.toFixed(2)}`);
        return interaction.reply({ embeds: [embed] });
      } else {
        return interaction.reply({ embeds: [embedReply("Type de compte invalide.")], ephemeral: true });
      }
    }

    // 2) /economy ajouterargent
    if (subcommand === 'ajouterargent') {
      // Vérifie rôle banquier
      if (!interaction.member.roles.cache.has(process.env.BANQUIER_ROLE_ID)) {
        return interaction.reply({ content: "Cette commande est réservée aux banquiers.", ephemeral: true });
      }
      const target = interaction.options.getUser('target');
      const choice = interaction.options.getString('destination'); // ex: "courant_liquide"
      const amount = interaction.options.getNumber('montant');

      const userAccount = getOrCreateAccount(target.id);
      // Récupère la valeur courante
      let oldVal = getBalanceRef(userAccount, choice);
      if (oldVal === null) {
        return interaction.reply({ embeds: [embedReply(`Le champ ${choice} n'existe pas pour ce joueur.`)], ephemeral: true });
      }
      // Ajoute
      const newVal = oldVal + amount;
      setBalanceRef(userAccount, choice, newVal);
      updateAccount(target.id, userAccount);

      return interaction.reply({
        embeds: [embedReply(`$${amount.toFixed(2)} ajoutés à ${choice} pour ${target.username}.`)]
      });
    }

    // 3) /economy paye
    if (subcommand === 'paye') {
      const target = interaction.options.getUser('target');
      const sourceChoice = interaction.options.getString('source');       // ex: "courant_liquide"
      const destChoice = interaction.options.getString('destination');   // ex: "entreprise_banque"
      const amount = interaction.options.getNumber('montant');

      // Comptes payeur
      let senderAcc = getAccount(interaction.user.id) || getOrCreateAccount(interaction.user.id);
      let oldValSender = getBalanceRef(senderAcc, sourceChoice);
      if (oldValSender === null) {
        return interaction.reply({ embeds: [embedReply(`Votre champ ${sourceChoice} n'existe pas.`)], ephemeral: true });
      }
      if (oldValSender < amount) {
        return interaction.reply({ embeds: [embedReply("Fonds insuffisants sur votre champ source.")], ephemeral: true });
      }
      // Comptes destinataire
      let receiverAcc = getAccount(target.id) || getOrCreateAccount(target.id);
      let oldValReceiver = getBalanceRef(receiverAcc, destChoice);
      if (oldValReceiver === null) {
        return interaction.reply({ embeds: [embedReply(`Le champ ${destChoice} n'existe pas pour ${target.username}.`)], ephemeral: true });
      }
      // Débite le payeur
      setBalanceRef(senderAcc, sourceChoice, oldValSender - amount);
      // Crédite le destinataire
      setBalanceRef(receiverAcc, destChoice, oldValReceiver + amount);

      updateAccount(interaction.user.id, senderAcc);
      updateAccount(target.id, receiverAcc);

      return interaction.reply({
        embeds: [embedReply(
          `Vous avez payé $${amount.toFixed(2)} à ${target.username} depuis **${sourceChoice}** vers **${destChoice}**.`
        )]
      });
    }
  }
};
