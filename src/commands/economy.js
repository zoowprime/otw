// src/commands/economy.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreateAccount, updateAccount, getAccount } = require('../economyData');

const embedReply = (description) =>
  new EmbedBuilder().setColor(0xff0000).setDescription(description);

// Définition des types de compte globaux pour l'affichage général
const accountTypes = [
  { name: 'Courant', value: 'courant' },
  { name: 'Entreprise', value: 'entreprise' },
  { name: 'Epargne', value: 'epargne' }
];

// Définition des sous-champs pour les opérations sur un champ précis
const subAccountChoices = [
  { name: 'Courant (Liquide)',    value: 'courant_liquide' },
  { name: 'Courant (Banque)',     value: 'courant_banque' },
  { name: 'Entreprise (Liquide)', value: 'entreprise_liquide' },
  { name: 'Entreprise (Banque)',  value: 'entreprise_banque' },
  { name: 'Epargne',              value: 'epargne' }
];

/**
 * Accède à la valeur d'un sous-champ dans un compte.
 * ex: "courant_liquide" → account.courant.liquide
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
 * Affecte une valeur à un sous-champ dans un compte.
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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('economy')
    .setDescription('Système économique avec comptes courant, entreprise et épargne.')
    
    // Sous-commande: /economy compte
    .addSubcommand(subcommand =>
      subcommand
        .setName('compte')
        .setDescription('Affiche un compte (Courant, Entreprise ou Epargne) avec ses détails.')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Choisissez le type de compte (courant, entreprise ou epargne)')
            .setRequired(true)
            .addChoices(...accountTypes)
        )
        .addUserOption(option =>
          option.setName('target')
            .setDescription("Afficher le compte d'un autre joueur (facultatif)")
            .setRequired(false)
        )
    )
    
    // Sous-commande: /economy solde
    .addSubcommand(subcommand =>
      subcommand
        .setName('solde')
        .setDescription('Affiche le solde d’un compte pour vous')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type de compte (courant, entreprise ou epargne)')
            .setRequired(true)
            .addChoices(...accountTypes)
        )
    )
    
    // Sous-commande: /economy declarertaxe
    .addSubcommand(subcommand =>
      subcommand
        .setName('declarertaxe')
        .setDescription('Déclare une taxe')
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant de la taxe')
            .setRequired(true)
        )
    )
    
    // Sous-commande: /economy calculertaxe
    .addSubcommand(subcommand =>
      subcommand
        .setName('calculertaxe')
        .setDescription('Calcule la taxe sur un montant')
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant')
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName('taux')
            .setDescription('Le taux (en %)')
            .setRequired(true)
        )
    )
    
    // Sous-commande: /economy ajouterargent (banquiers uniquement)
    .addSubcommand(subcommand =>
      subcommand
        .setName('ajouterargent')
        .setDescription('Ajoute de l’argent dans un sous-champ (banquiers uniquement)')
        .addUserOption(option =>
          option.setName('target')
            .setDescription("Le joueur cible")
            .setRequired(true)
        )
        // Description raccourcie pour respecter la limite (<= 100 caractères)
        .addStringOption(option =>
          option.setName('destination')
            .setDescription('Champ (ex: courant_liquide, courant_banque, entreprise_liquide, entreprise_banque, epargne)')
            .setRequired(true)
            .addChoices(...subAccountChoices)
        )
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription("Le montant à ajouter")
            .setRequired(true)
        )
    )
    
    // Sous-commande: /economy ouvrircompte (banquiers uniquement)
    .addSubcommand(subcommand =>
      subcommand
        .setName('ouvrircompte')
        .setDescription('Ouvre un compte (épargne ou entreprise) pour un joueur (banquiers uniquement)')
        .addUserOption(option =>
          option.setName('target')
            .setDescription("Le joueur pour lequel ouvrir le compte")
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type de compte à ouvrir (épargne ou entreprise)')
            .setRequired(true)
            .addChoices(
              { name: 'Epargne', value: 'epargne' },
              { name: 'Entreprise', value: 'entreprise' }
            )
        )
    )
    
    // Sous-commande: /economy transférer (banquiers uniquement)
    .addSubcommand(subcommand =>
      subcommand
        .setName('transférer')
        .setDescription('Transfère de l’argent d’un sous-champ à un autre (banquiers uniquement)')
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant à transférer')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type de sous-champ concerné')
            .setRequired(true)
            .addChoices(...subAccountChoices)
        )
        .addUserOption(option =>
          option.setName('target')
            .setDescription("Le joueur destinataire")
            .setRequired(true)
        )
    )
    
    // Sous-commande: /economy emprunter
    .addSubcommand(subcommand =>
      subcommand
        .setName('emprunter')
        .setDescription("Demande d'emprunt")
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant à emprunter')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('duree')
            .setDescription("La durée de l’emprunt (ex: 12 mois)")
            .setRequired(true)
        )
    )
    
    // Sous-commande: /economy contrat
    .addSubcommand(subcommand =>
      subcommand
        .setName('contrat')
        .setDescription("Création d'une demande d'ouverture de compte bancaire")
        .addStringOption(option =>
          option.setName('nombanque')
            .setDescription('Nom de la Banque')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('adressebanque')
            .setDescription('Adresse de la Banque')
            .setRequired(true)
        )
        .addUserOption(option =>
          option.setName('client')
            .setDescription('Le client (mention)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('adresseclient')
            .setDescription('Adresse du Client')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('typecompte')
            .setDescription('Type de Compte')
            .setRequired(true)
            .addChoices(
              { name: 'Courant', value: 'courant' },
              { name: 'Entreprise', value: 'entreprise' },
              { name: 'Epargne', value: 'epargne' }
            )
        )
        .addNumberOption(option =>
          option.setName('depotinitial')
            .setDescription('Montant de Dépôt Initial')
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName('frais')
            .setDescription('Frais Bancaires')
            .setRequired(true)
        )
    )
    
    // Sous-commande: /economy retirerargent (banquiers uniquement, retire du compte courant)
    .addSubcommand(subcommand =>
      subcommand
        .setName('retirerargent')
        .setDescription("Retire de l'argent du compte courant d'un joueur (banquiers uniquement)")
        .addUserOption(option =>
          option.setName('target')
            .setDescription('Le joueur cible')
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant à retirer')
            .setRequired(true)
        )
    )
    
    // Sous-commande: /economy retirermoney (conversion de fonds du compte (courant ou entreprise) vers liquide)
    .addSubcommand(subcommand =>
      subcommand
        .setName('retirermoney')
        .setDescription('Convertit des fonds d’un compte bancaire (courant ou entreprise) en liquide')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Compte source (courant ou entreprise)')
            .setRequired(true)
            .addChoices(
              { name: 'Courant', value: 'courant' },
              { name: 'Entreprise', value: 'entreprise' }
            )
        )
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant à convertir')
            .setRequired(true)
        )
    )
    
    // Sous-commande: /economy depargent (conversion de fonds du liquide vers un compte)
    .addSubcommand(subcommand =>
      subcommand
        .setName('depargent')
        .setDescription('Dépose de l’argent liquide dans un compte (courant ou entreprise)')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Compte cible (courant ou entreprise)')
            .setRequired(true)
            .addChoices(
              { name: 'Courant', value: 'courant' },
              { name: 'Entreprise', value: 'entreprise' }
            )
        )
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant à déposer')
            .setRequired(true)
        )
    )
    
    // Sous-commande: /economy paye (transfert entre joueurs)
    .addSubcommand(subcommand =>
      subcommand
        .setName('paye')
        .setDescription('Effectue un paiement à un autre joueur depuis un champ source vers un champ destination')
        .addStringOption(option =>
          option.setName('source')
            .setDescription('Votre champ source (courant_liquide ou entreprise_liquide)')
            .setRequired(true)
            .addChoices(
              { name: 'Courant (Liquide)', value: 'courant_liquide' },
              { name: 'Entreprise (Liquide)', value: 'entreprise_liquide' }
            )
        )
        .addStringOption(option =>
          option.setName('destination')
            .setDescription("Champ du destinataire (ex: courant_banque, entreprise_banque, epargne)")
            .setRequired(true)
            .addChoices(...subAccountChoices)
        )
        .addUserOption(option =>
          option.setName('target')
            .setDescription('Le joueur à payer')
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant à payer')
            .setRequired(true)
        )
    )
    
    // Sous-commande: /economy investir
    .addSubcommand(subcommand =>
      subcommand
        .setName('investir')
        .setDescription('Investit dans une entreprise')
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant à investir')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('entreprise')
            .setDescription("Nom de l'entreprise")
            .setRequired(true)
        )
    )
    
    // Sous-commande: /economy acheterpart
    .addSubcommand(subcommand =>
      subcommand
        .setName('acheterpart')
        .setDescription('Acheter des parts dans une entreprise')
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant pour acheter des parts')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('entreprise')
            .setDescription("Nom de l'entreprise")
            .setRequired(true)
        )
    )
    
    // Sous-commande: /economy achetermaison
    .addSubcommand(subcommand =>
      subcommand
        .setName('achetermaison')
        .setDescription('Acheter une maison')
        .addNumberOption(option =>
          option.setName('prix')
            .setDescription('Le prix de la maison')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('adresse')
            .setDescription("L'adresse de la maison")
            .setRequired(true)
        )
    )
    
    // Sous-commande: /economy acheterproduit
    .addSubcommand(subcommand =>
      subcommand
        .setName('acheterproduit')
        .setDescription('Acheter un produit')
        .addStringOption(option =>
          option.setName('produit')
            .setDescription('Nom du produit')
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName('quantite')
            .setDescription('La quantité à acheter')
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName('prix')
            .setDescription('Le prix du produit')
            .setRequired(true)
        )
    )
    
    // Sous-commande: /economy vendrestock
    .addSubcommand(subcommand =>
      subcommand
        .setName('vendrestock')
        .setDescription('Vendre des stocks')
        .addStringOption(option =>
          option.setName('type')
            .setDescription("Le type d'item")
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName('quantite')
            .setDescription('La quantité à vendre')
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName('prixtotal')
            .setDescription('Le prix total de la vente')
            .setRequired(true)
        )
    )
    
    // Sous-commande: /economy remboursement
    .addSubcommand(subcommand =>
      subcommand
        .setName('remboursement')
        .setDescription("Rembourser un emprunt")
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant à rembourser')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('emprunt')
            .setDescription("L'identifiant de l'emprunt")
            .setRequired(true)
        )
    ),
    
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    // ─────────────────────────────────────────────────────────────
    // /economy compte
    if (subcommand === 'compte') {
      try {
        const type = interaction.options.getString('type').toLowerCase();
        const target = interaction.options.getUser('target') || interaction.user;
        const account = getOrCreateAccount(target.id);
        if (type === 'courant') {
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
          const val = account.epargne;
          const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle(`Compte Epargne de ${target.username}`)
            .setDescription(`**Solde :** $${val.toFixed(2)}`);
          return interaction.reply({ embeds: [embed] });
        } else {
          return interaction.reply({ embeds: [embedReply("Type de compte invalide.")], ephemeral: true });
        }
      } catch (error) {
        console.error("Erreur /economy compte:", error);
        return interaction.reply({ content: "Une erreur est survenue lors de l'exécution de la commande.", ephemeral: true });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // /economy solde
    if (subcommand === 'solde') {
      const type = interaction.options.getString('type').toLowerCase();
      const account = getOrCreateAccount(interaction.user.id);
      let value;
      if (type === 'courant') {
        value = account.courant.liquide + account.courant.banque;
      } else if (type === 'entreprise') {
        value = account.entreprise.liquide + account.entreprise.banque;
      } else if (type === 'epargne') {
        value = account.epargne;
      } else {
        return interaction.reply({ embeds: [embedReply("Type de compte invalide.")], ephemeral: true });
      }
      return interaction.reply({ embeds: [embedReply(`Votre solde pour le compte ${type} est $${value.toFixed(2)}.`)] });
    }

    // ─────────────────────────────────────────────────────────────
    // /economy declarertaxe
    if (subcommand === 'declarertaxe') {
      const montant = interaction.options.getNumber('montant');
      return interaction.reply({ embeds: [embedReply(`Taxe déclarée: $${montant.toFixed(2)}.`)] });
    }

    // ─────────────────────────────────────────────────────────────
    // /economy calculertaxe
    if (subcommand === 'calculertaxe') {
      const montant = interaction.options.getNumber('montant');
      const taux = interaction.options.getNumber('taux');
      const taxe = montant * (taux / 100);
      return interaction.reply({ embeds: [embedReply(`La taxe pour $${montant.toFixed(2)} à ${taux}% est $${taxe.toFixed(2)}.`)] });
    }

    // ─────────────────────────────────────────────────────────────
    // /economy ajouterargent (banquiers)
    if (subcommand === 'ajouterargent') {
      if (!interaction.member.roles.cache.has(process.env.BANQUIER_ROLE_ID)) {
        return interaction.reply({ content: "Cette commande est réservée aux banquiers.", ephemeral: true });
      }
      const target = interaction.options.getUser('target');
      const destChoice = interaction.options.getString('destination');
      const amount = interaction.options.getNumber('montant');
      const account = getOrCreateAccount(target.id);
      let oldVal = getBalanceRef(account, destChoice);
      if (oldVal === null) {
        return interaction.reply({ embeds: [embedReply(`Le champ ${destChoice} n'existe pas pour ce joueur.`)], ephemeral: true });
      }
      const newVal = oldVal + amount;
      setBalanceRef(account, destChoice, newVal);
      updateAccount(target.id, account);
      return interaction.reply({ embeds: [embedReply(`$${amount.toFixed(2)} ont été ajoutés dans ${destChoice} pour ${target.username}.`)] });
    }

    // ─────────────────────────────────────────────────────────────
    // /economy ouvrircompte (banquiers)
    if (subcommand === 'ouvrircompte') {
      if (!interaction.member.roles.cache.has(process.env.BANQUIER_ROLE_ID)) {
        return interaction.reply({ content: "Cette commande est réservée aux banquiers.", ephemeral: true });
      }
      const target = interaction.options.getUser('target');
      const type = interaction.options.getString('type').toLowerCase();
      const allowedTypes = ['epargne', 'entreprise'];
      if (!allowedTypes.includes(type)) {
        return interaction.reply({ embeds: [embedReply("Type de compte invalide. Seuls 'epargne' et 'entreprise' sont autorisés.")], ephemeral: true });
      }
      const account = getOrCreateAccount(target.id);
      if (account[type] !== undefined && account[type] !== 0) {
        return interaction.reply({ embeds: [embedReply(`${target.username} possède déjà un compte de type ${type}.`)], ephemeral: true });
      }
      account[type] = 0;
      updateAccount(target.id, account);
      return interaction.reply({ embeds: [embedReply(`Compte de type ${type} créé pour ${target.username}.`)] });
    }

    // ─────────────────────────────────────────────────────────────
    // /economy transférer (banquiers)
    if (subcommand === 'transférer') {
      if (!interaction.member.roles.cache.has(process.env.BANQUIER_ROLE_ID)) {
        return interaction.reply({ content: "Cette commande est réservée aux banquiers.", ephemeral: true });
      }
      const amount = interaction.options.getNumber('montant');
      const subChoice = interaction.options.getString('type');
      const target = interaction.options.getUser('target');
      const senderAccount = getOrCreateAccount(interaction.user.id);
      const receiverAccount = getOrCreateAccount(target.id);
      if (getBalanceRef(senderAccount, subChoice) < amount) {
        return interaction.reply({ embeds: [embedReply("Fonds insuffisants sur votre compte pour cette opération.")], ephemeral: true });
      }
      setBalanceRef(senderAccount, subChoice, getBalanceRef(senderAccount, subChoice) - amount);
      setBalanceRef(receiverAccount, subChoice, getBalanceRef(receiverAccount, subChoice) + amount);
      updateAccount(interaction.user.id, senderAccount);
      updateAccount(target.id, receiverAccount);
      return interaction.reply({ embeds: [embedReply(`Transfert de $${amount.toFixed(2)} de ${interaction.user.username} vers ${target.username} dans ${subChoice} effectué.`)] });
    }

    // ─────────────────────────────────────────────────────────────
    // /economy emprunter
    if (subcommand === 'emprunter') {
      const amount = interaction.options.getNumber('montant');
      const duree = interaction.options.getString('duree');
      return interaction.reply({ embeds: [embedReply(`Demande d'emprunt de $${amount.toFixed(2)} pour ${duree} reçue.`)] });
    }

    // ─────────────────────────────────────────────────────────────
    // /economy contrat
    if (subcommand === 'contrat') {
      const nomBanque = interaction.options.getString('nombanque');
      const adresseBanque = interaction.options.getString('adressebanque');
      const clientUser = interaction.options.getUser('client');
      const adresseClient = interaction.options.getString('adresseclient');
      const typeCompte = interaction.options.getString('typecompte');
      const depotInitial = interaction.options.getNumber('depotinitial');
      const frais = interaction.options.getNumber('frais');
      const conditions = `Conditions Générales de Soumission d’un Compte Bancaire
Les présentes conditions régissent l'ouverture d'un compte. (Texte complet ici)`;
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Demande d'ouverture de compte bancaire")
        .setDescription(
          `**Nom de la Banque :** ${nomBanque}\n` +
          `**Adresse de la Banque :** ${adresseBanque}\n\n` +
          `**Nom du Client :** ${clientUser.username}\n` +
          `**Adresse du Client :** ${adresseClient}\n` +
          `**Type de Compte :** ${typeCompte}\n` +
          `**Montant de Dépôt Initial :** $${depotInitial.toFixed(2)}\n` +
          `**Frais Bancaires :** $${frais.toFixed(2)}\n\n` +
          conditions
        );
      return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────────────────────────
    // /economy retirerargent (banquiers)
    if (subcommand === 'retirerargent') {
      if (!interaction.member.roles.cache.has(process.env.BANQUIER_ROLE_ID)) {
        return interaction.reply({ content: "Cette commande est réservée aux banquiers.", ephemeral: true });
      }
      const target = interaction.options.getUser('target');
      const amount = interaction.options.getNumber('montant');
      const account = getOrCreateAccount(target.id);
      if (account.courant.banque < amount) {
        return interaction.reply({ embeds: [embedReply("Fonds insuffisants sur le compte courant (banque) du joueur.")], ephemeral: true });
      }
      account.courant.banque -= amount;
      updateAccount(target.id, account);
      return interaction.reply({ embeds: [embedReply(`$${amount.toFixed(2)} ont été retirés du compte courant (banque) de ${target.username}.`)] });
    }

    // ─────────────────────────────────────────────────────────────
    // /economy retirermoney (conversion du compte (courant ou entreprise) vers liquide)
    if (subcommand === 'retirermoney') {
      const type = interaction.options.getString('type').toLowerCase(); // "courant" ou "entreprise"
      const amount = interaction.options.getNumber('montant');
      const account = getOrCreateAccount(interaction.user.id);
      if (account[type].banque < amount) {
        return interaction.reply({ embeds: [embedReply(`Fonds insuffisants dans le compte ${type} (banque).`)], ephemeral: true });
      }
      account[type].banque -= amount;
      account[type].liquide += amount;
      updateAccount(interaction.user.id, account);
      return interaction.reply({ embeds: [embedReply(`Vous avez converti $${amount.toFixed(2)} du compte ${type} (banque) en liquide. Nouveau solde ${type} liquide: $${account[type].liquide.toFixed(2)}.`)] });
    }

    // ─────────────────────────────────────────────────────────────
    // /economy depargent (conversion du liquide vers un compte bancaire)
    if (subcommand === 'depargent') {
      const type = interaction.options.getString('type').toLowerCase(); // "courant" ou "entreprise"
      const amount = interaction.options.getNumber('montant');
      const account = getOrCreateAccount(interaction.user.id);
      if (account[type].liquide < amount) {
        return interaction.reply({ embeds: [embedReply("Fonds insuffisants en liquide.")], ephemeral: true });
      }
      account[type].liquide -= amount;
      account[type].banque += amount;
      updateAccount(interaction.user.id, account);
      return interaction.reply({ embeds: [embedReply(`Vous avez déposé $${amount.toFixed(2)} dans le compte ${type} (banque). Nouveau solde ${type} banque: $${account[type].banque.toFixed(2)}.`)] });
    }

    // ─────────────────────────────────────────────────────────────
    // /economy paye (paiement entre joueurs)
    if (subcommand === 'paye') {
      const target = interaction.options.getUser('target');
      const sourceChoice = interaction.options.getString('source').toLowerCase(); // ex: "courant_liquide" ou "entreprise_liquide"
      const destinationChoice = interaction.options.getString('destination').toLowerCase(); // ex: "courant_banque", "entreprise_banque", ou "epargne"
      const amount = interaction.options.getNumber('montant');
      
      const senderAcc = getOrCreateAccount(interaction.user.id);
      const receiverAcc = getOrCreateAccount(target.id);
      
      let senderValue = getBalanceRef(senderAcc, sourceChoice);
      let receiverValue = getBalanceRef(receiverAcc, destinationChoice);
      
      if (senderValue === null || receiverValue === null) {
        return interaction.reply({ embeds: [embedReply("Champ source ou destination invalide.")], ephemeral: true });
      }
      
      if (senderValue < amount) {
        return interaction.reply({ embeds: [embedReply("Fonds insuffisants sur votre champ source.")], ephemeral: true });
      }
      
      setBalanceRef(senderAcc, sourceChoice, senderValue - amount);
      setBalanceRef(receiverAcc, destinationChoice, receiverValue + amount);
      
      updateAccount(interaction.user.id, senderAcc);
      updateAccount(target.id, receiverAcc);
      
      return interaction.reply({ embeds: [embedReply(`Vous avez payé $${amount.toFixed(2)} à ${target.username} depuis votre ${sourceChoice} vers leur ${destinationChoice}.`)] });
    }

    // ─────────────────────────────────────────────────────────────
    // /economy investir
    if (subcommand === 'investir') {
      const amount = interaction.options.getNumber('montant');
      const entreprise = interaction.options.getString('entreprise');
      return interaction.reply({ embeds: [embedReply(`Vous avez investi $${amount.toFixed(2)} dans ${entreprise}.`)] });
    }

    // ─────────────────────────────────────────────────────────────
    // /economy acheterpart
    if (subcommand === 'acheterpart') {
      const amount = interaction.options.getNumber('montant');
      const entreprise = interaction.options.getString('entreprise');
      return interaction.reply({ embeds: [embedReply(`Vous avez acheté des parts pour $${amount.toFixed(2)} dans ${entreprise}.`)] });
    }

    // ─────────────────────────────────────────────────────────────
    // /economy achetermaison
    if (subcommand === 'achetermaison') {
      const prix = interaction.options.getNumber('prix');
      const adresse = interaction.options.getString('adresse');
      return interaction.reply({ embeds: [embedReply(`Maison achetée à ${adresse} pour $${prix.toFixed(2)}.`)] });
    }

    // ─────────────────────────────────────────────────────────────
    // /economy acheterproduit
    if (subcommand === 'acheterproduit') {
      const produit = interaction.options.getString('produit');
      const quantite = interaction.options.getNumber('quantite');
      const prix = interaction.options.getNumber('prix');
      return interaction.reply({ embeds: [embedReply(`Vous avez acheté ${quantite} ${produit} pour $${prix.toFixed(2)}.`)] });
    }

    // ─────────────────────────────────────────────────────────────
    // /economy vendrestock
    if (subcommand === 'vendrestock') {
      const itemType = interaction.options.getString('type').toLowerCase();
      const quantite = interaction.options.getNumber('quantite');
      const prixtotal = interaction.options.getNumber('prixtotal');
      if (!global.stockData || !global.stockData[itemType] || global.stockData[itemType].quantite < quantite) {
        return interaction.reply({ embeds: [embedReply(`Stock insuffisant pour ${itemType}.`)], ephemeral: true });
      }
      global.stockData[itemType].quantite -= quantite;
      global.stockData[itemType].prixtotal -= prixtotal;
      return interaction.reply({ embeds: [embedReply(`Vous avez vendu ${quantite} de ${itemType} pour un total de $${prixtotal.toFixed(2)}.`)] });
    }

    // ─────────────────────────────────────────────────────────────
    // /economy remboursement
    if (subcommand === 'remboursement') {
      const montant = interaction.options.getNumber('montant');
      const emprunt = interaction.options.getString('emprunt');
      return interaction.reply({ embeds: [embedReply(`Remboursement de $${montant.toFixed(2)} effectué pour l'emprunt ${emprunt}.`)] });
    }
  }
};
