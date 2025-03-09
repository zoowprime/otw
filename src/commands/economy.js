// src/commands/economy.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreateAccount, updateAccount, getAccount } = require('../economyData');

const embedReply = (description) =>
  new EmbedBuilder().setColor(0xff0000).setDescription(description);

// Options de compte disponibles
const accountTypes = [
  { name: 'courant', value: 'courant' },
  { name: 'epargne', value: 'epargne' },
  { name: 'entreprise', value: 'entreprise' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('economy')
    .setDescription('Commandes économiques')
    
    // Sous-commande: compte (obligatoire: type, facultatif: target)
    .addSubcommand(subcommand =>
      subcommand
        .setName('compte')
        .setDescription('Affiche le compte d’un joueur ou le vôtre')
        // OPTION OBLIGATOIRE en premier :
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type de compte (courant, epargne, entreprise)')
            .setRequired(true)
            .addChoices(...accountTypes)
        )
        // OPTION FACULTATIVE ensuite :
        .addUserOption(option =>
          option.setName('target')
            .setDescription("L'utilisateur dont afficher le compte")
            .setRequired(false)
        )
    )
    
    // Sous-commande: solde (type obligatoire)
    .addSubcommand(subcommand =>
      subcommand
        .setName('solde')
        .setDescription('Affiche le solde d’un compte')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Le type de compte')
            .setRequired(true)
            .addChoices(...accountTypes)
        )
    )
    
    // Sous-commande: declarertaxe (montant requis)
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
    
    // Sous-commande: calculertaxe (montant et taux requis)
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
            .setDescription('Le taux de la taxe (en %)')
            .setRequired(true)
        )
    )
    
    // Sous-commande: ajouterargent (banquiers uniquement)
    .addSubcommand(subcommand =>
      subcommand
        .setName('ajouterargent')
        .setDescription('Ajoute de l’argent à un compte (banquiers uniquement)')
        .addUserOption(option =>
          option.setName('target')
            .setDescription("Le joueur cible")
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription("Le montant à ajouter")
            .setRequired(true)
        )
    )
    
    // Sous-commande: ouvrircompte (pour epargne ou entreprise)
    .addSubcommand(subcommand =>
      subcommand
        .setName('ouvrircompte')
        .setDescription('Ouvre un compte bancaire (epargne ou entreprise)')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type de compte à ouvrir')
            .setRequired(true)
            .addChoices(
              { name: 'epargne', value: 'epargne' },
              { name: 'entreprise', value: 'entreprise' }
            )
        )
    )
    
    // Sous-commande: transférer (banquiers uniquement)
    .addSubcommand(subcommand =>
      subcommand
        .setName('transférer')
        .setDescription('Transfère de l’argent d’un compte à un autre (banquiers uniquement)')
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant à transférer')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type de compte')
            .setRequired(true)
            .addChoices(...accountTypes)
        )
        .addUserOption(option =>
          option.setName('target')
            .setDescription("Le joueur destinataire")
            .setRequired(true)
        )
    )
    
    // Sous-commande: emprunter
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
    
    // Sous-commande: contrat
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
              { name: 'epargne', value: 'epargne' },
              { name: 'courant', value: 'courant' },
              { name: 'entreprise', value: 'entreprise' }
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
    
    // Sous-commande: retirerargent (banquiers uniquement)
    .addSubcommand(subcommand =>
      subcommand
        .setName('retirerargent')
        .setDescription("Retire de l'argent du compte d'un joueur (banquiers uniquement)")
        .addUserOption(option =>
          option.setName('target')
            .setDescription("Le joueur cible")
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription("Le montant à retirer")
            .setRequired(true)
        )
    )
    
    // Sous-commande: retirermoney
    .addSubcommand(subcommand =>
      subcommand
        .setName('retirermoney')
        .setDescription('Retire de l’argent du compte en banque et le met en liquide')
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant à retirer du compte en banque')
            .setRequired(true)
        )
    )
    
    // Sous-commande: depargent
    .addSubcommand(subcommand =>
      subcommand
        .setName('depargent')
        .setDescription('Dépose de l’argent liquide sur le compte en banque')
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant à déposer sur le compte en banque')
            .setRequired(true)
        )
    )
    
    // Sous-commande: paye
    .addSubcommand(subcommand =>
      subcommand
        .setName('paye')
        .setDescription('Effectue un paiement à un autre joueur')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type de compte pour ce paiement')
            .setRequired(true)
            .addChoices(...accountTypes)
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
    
    // Sous-commande: investir
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
            .setDescription("Le nom de l'entreprise")
            .setRequired(true)
        )
    )
    
    // Sous-commande: acheterpart
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
            .setDescription("Le nom de l'entreprise")
            .setRequired(true)
        )
    )
    
    // Sous-commande: achetermaison
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
    
    // Sous-commande: acheterproduit
    .addSubcommand(subcommand =>
      subcommand
        .setName('acheterproduit')
        .setDescription('Acheter un produit')
        .addStringOption(option =>
          option.setName('produit')
            .setDescription('Le nom du produit')
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
    
    // Sous-commande: vendrestock
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
    
    // Sous-commande: remboursement
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

    if (subcommand === 'compte') {
      try {
        const target = interaction.options.getUser('target') || interaction.user;
        const type = interaction.options.getString('type').toLowerCase();
        let account;
        if (type === 'courant') {
          account = getOrCreateAccount(target.id);
        } else {
          account = getAccount(target.id);
          if (!account || account[type] === undefined) {
            return interaction.reply({ embeds: [embedReply(`Le compte ${type} n'est pas créé pour ${target.username}. Veuillez contacter un banquiers.`)], ephemeral: true });
          }
        }
        const value = account[type];
        if (typeof value !== 'number') {
          throw new Error(`La valeur du compte ${type} pour ${target.username} n'est pas un nombre.`);
        }
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle(`Compte ${type} de ${target.username}`)
          .setDescription(`Votre solde pour le compte ${type} est $${value.toFixed(2)}.`);
        return interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Erreur dans la sous-commande /economy compte:", error);
        return interaction.reply({ content: "Une erreur est survenue lors de l'exécution de la commande.", ephemeral: true });
      }
    }

    if (subcommand === 'solde') {
      const type = interaction.options.getString('type').toLowerCase();
      const account = getOrCreateAccount(interaction.user.id);
      if (account[type] === undefined) {
        return interaction.reply({ embeds: [embedReply(`Aucun compte de type ${type} trouvé pour vous.`)], ephemeral: true });
      }
      const value = account[type];
      return interaction.reply({ embeds: [embedReply(`Votre solde pour le compte ${type} est $${value.toFixed(2)}.`)] });
    }

    if (subcommand === 'declarertaxe') {
      const montant = interaction.options.getNumber('montant');
      return interaction.reply({ embeds: [embedReply(`Taxe déclarée: $${montant.toFixed(2)}.`)] });
    }

    if (subcommand === 'calculertaxe') {
      const montant = interaction.options.getNumber('montant');
      const taux = interaction.options.getNumber('taux');
      const taxe = montant * (taux / 100);
      return interaction.reply({ embeds: [embedReply(`La taxe pour $${montant.toFixed(2)} à ${taux}% est $${taxe.toFixed(2)}.`)] });
    }

    if (subcommand === 'ajouterargent') {
      if (!interaction.member.roles.cache.has(process.env.BANQUIER_ROLE_ID)) {
        return interaction.reply({ content: "Cette commande est réservée aux banquiers.", ephemeral: true });
      }
      const target = interaction.options.getUser('target');
      const amount = interaction.options.getNumber('montant');
      const account = getOrCreateAccount(target.id);
      account.courant += amount;
      updateAccount(target.id, account);
      return interaction.reply({ embeds: [embedReply(`$${amount.toFixed(2)} ont été ajoutés au compte de ${target.username}.`)] });
    }

    if (subcommand === 'ouvrircompte') {
      const type = interaction.options.getString('type').toLowerCase();
      const account = getOrCreateAccount(interaction.user.id);
      if (account[type] !== undefined) {
        return interaction.reply({ embeds: [embedReply(`Vous possédez déjà un compte de type ${type}.`)], ephemeral: true });
      }
      account[type] = 0;
      updateAccount(interaction.user.id, account);
      return interaction.reply({ embeds: [embedReply(`Compte de type ${type} créé pour ${interaction.user.username}.`)] });
    }

    if (subcommand === 'transférer') {
      if (!interaction.member.roles.cache.has(process.env.BANQUIER_ROLE_ID)) {
        return interaction.reply({ content: "Cette commande est réservée aux banquiers.", ephemeral: true });
      }
      const amount = interaction.options.getNumber('montant');
      const type = interaction.options.getString('type').toLowerCase();
      const target = interaction.options.getUser('target');
      const senderAccount = getOrCreateAccount(interaction.user.id);
      const receiverAccount = getOrCreateAccount(target.id);
      if (senderAccount[type] === undefined || receiverAccount[type] === undefined) {
        return interaction.reply({ embeds: [embedReply("Type de compte inexistant pour l'un des utilisateurs.")], ephemeral: true });
      }
      if (senderAccount[type] < amount) {
        return interaction.reply({ embeds: [embedReply("Fonds insuffisants sur votre compte.")], ephemeral: true });
      }
      senderAccount[type] -= amount;
      receiverAccount[type] += amount;
      updateAccount(interaction.user.id, senderAccount);
      updateAccount(target.id, receiverAccount);
      return interaction.reply({ embeds: [embedReply(`Transfert de $${amount.toFixed(2)} de votre compte ${type} vers ${target.username} effectué.`)] });
    }

    if (subcommand === 'emprunter') {
      const amount = interaction.options.getNumber('montant');
      const duree = interaction.options.getString('duree');
      return interaction.reply({ embeds: [embedReply(`Demande d'emprunt de $${amount.toFixed(2)} pour ${duree} reçue.`)] });
    }

    if (subcommand === 'contrat') {
      const nomBanque = interaction.options.getString('nombanque');
      const adresseBanque = interaction.options.getString('adressebanque');
      const clientUser = interaction.options.getUser('client');
      const adresseClient = interaction.options.getString('adresseclient');
      const typeCompte = interaction.options.getString('typecompte');
      const depotInitial = interaction.options.getNumber('depotinitial');
      const frais = interaction.options.getNumber('frais');

      const conditions = `Conditions Générales de Soumission d’un Compte Bancaire
Les présentes conditions générales régissent l'ouverture et la gestion d'un compte bancaire auprès de la Banque. En soumettant une demande d'ouverture de compte, le client accepte expressément ces conditions.

Types de Comptes Offerts
• Compte d'Épargne : taux d'intérêt de 5 % annuel.
• Compte Courant : pour transactions quotidiennes.
• Compte d’Entreprise : réservé aux entreprises.
• Dépôt National spécifique pour l’état

Conditions d'Ouverture
• Âge minimum : 18 ans.
• Pièce d'identité valide.
• Dépôt minimum : 50$ pour épargne, 100$ pour courant.

Gestion du Compte
• Maintien d'un solde minimum sur le compte courant.
• Conformité aux lois.
• Notification des changements.

Droits de la Banque
• Modification des taux et frais avec préavis.
• Fermeture du compte en cas de non-respect.

Protection des Fonds
• Fonds protégés jusqu'à 1 000$ par client.

Confidentialité
• Les informations restent confidentielles.

Résiliation
• Clôture possible à tout moment avec remboursement sous 10 jours.`;

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

    if (subcommand === 'retirerargent') {
      if (!interaction.member.roles.cache.has(process.env.BANQUIER_ROLE_ID)) {
        return interaction.reply({ content: "Cette commande est réservée aux banquiers.", ephemeral: true });
      }
      const target = interaction.options.getUser('target');
      const amount = interaction.options.getNumber('montant');
      const account = getOrCreateAccount(target.id);
      if (account.courant < amount) {
        return interaction.reply({ embeds: [embedReply("Fonds insuffisants sur le compte du joueur.")], ephemeral: true });
      }
      account.courant -= amount;
      updateAccount(target.id, account);
      return interaction.reply({ embeds: [embedReply(`$${amount.toFixed(2)} ont été retirés du compte de ${target.username}.`)] });
    }

    if (subcommand === 'retirermoney') {
      const amount = interaction.options.getNumber('montant');
      const account = getOrCreateAccount(interaction.user.id);
      const bankAmount = account.epargne + account.investissement;
      if (bankAmount < amount) {
        return interaction.reply({ embeds: [embedReply("Fonds insuffisants sur votre compte en banque.")], ephemeral: true });
      }
      let reste = amount;
      if (account.epargne >= reste) {
        account.epargne -= reste;
        reste = 0;
      } else {
        reste -= account.epargne;
        account.epargne = 0;
        if (account.investissement >= reste) {
          account.investissement -= reste;
          reste = 0;
        } else {
          return interaction.reply({ embeds: [embedReply("Fonds insuffisants sur votre compte en banque.")], ephemeral: true });
        }
      }
      account.courant += amount;
      updateAccount(interaction.user.id, account);
      return interaction.reply({ embeds: [embedReply(`Vous avez retiré $${amount.toFixed(2)} de votre compte en banque. Nouveau solde liquide: $${account.courant.toFixed(2)}.`)] });
    }

    if (subcommand === 'depargent') {
      const amount = interaction.options.getNumber('montant');
      const account = getOrCreateAccount(interaction.user.id);
      if (account.courant < amount) {
        return interaction.reply({ embeds: [embedReply("Fonds insuffisants en liquide.")], ephemeral: true });
      }
      account.courant -= amount;
      account.epargne += amount;
      updateAccount(interaction.user.id, account);
      return interaction.reply({ embeds: [embedReply(`Vous avez déposé $${amount.toFixed(2)} de votre liquide sur votre compte en banque. Nouveau solde épargne: $${account.epargne.toFixed(2)}.`)] });
    }

    if (subcommand === 'paye') {
      const target = interaction.options.getUser('target');
      const amount = interaction.options.getNumber('montant');
      const type = interaction.options.getString('type').toLowerCase();
      let senderAccount;
      if (type === "courant") {
        senderAccount = getOrCreateAccount(interaction.user.id);
      } else {
        senderAccount = getAccount(interaction.user.id);
        if (!senderAccount || senderAccount[type] === undefined) {
          return interaction.reply({ embeds: [embedReply(`Le compte ${type} n'est pas créé pour vous. Veuillez contacter un banquier.`)], ephemeral: true });
        }
      }
      let receiverAccount;
      if (type === "courant") {
        receiverAccount = getOrCreateAccount(target.id);
      } else {
        receiverAccount = getAccount(target.id);
        if (!receiverAccount || receiverAccount[type] === undefined) {
          return interaction.reply({ embeds: [embedReply(`Le compte ${type} n'est pas créé pour ${target.username}.`)], ephemeral: true });
        }
      }
      if (senderAccount[type] < amount) {
        return interaction.reply({ embeds: [embedReply("Fonds insuffisants sur votre compte pour effectuer ce paiement.")], ephemeral: true });
      }
      senderAccount[type] -= amount;
      receiverAccount[type] += amount;
      updateAccount(interaction.user.id, senderAccount);
      updateAccount(target.id, receiverAccount);
      return interaction.reply({ embeds: [embedReply(`Vous avez payé $${amount.toFixed(2)} à ${target.username} depuis votre compte ${type}.`)] });
    }

    if (subcommand === 'investir') {
      const amount = interaction.options.getNumber('montant');
      const entreprise = interaction.options.getString('entreprise');
      return interaction.reply({ embeds: [embedReply(`Vous avez investi $${amount.toFixed(2)} dans ${entreprise}.`)] });
    }

    if (subcommand === 'acheterpart') {
      const amount = interaction.options.getNumber('montant');
      const entreprise = interaction.options.getString('entreprise');
      return interaction.reply({ embeds: [embedReply(`Vous avez acheté des parts pour $${amount.toFixed(2)} dans ${entreprise}.`)] });
    }

    if (subcommand === 'achetermaison') {
      const prix = interaction.options.getNumber('prix');
      const adresse = interaction.options.getString('adresse');
      return interaction.reply({ embeds: [embedReply(`Maison achetée à ${adresse} pour $${prix.toFixed(2)}.`)] });
    }

    if (subcommand === 'acheterproduit') {
      const produit = interaction.options.getString('produit');
      const quantite = interaction.options.getNumber('quantite');
      const prix = interaction.options.getNumber('prix');
      return interaction.reply({ embeds: [embedReply(`Vous avez acheté ${quantite} ${produit} pour $${prix.toFixed(2)}.`)] });
    }

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

    if (subcommand === 'remboursement') {
      const montant = interaction.options.getNumber('montant');
      const emprunt = interaction.options.getString('emprunt');
      return interaction.reply({ embeds: [embedReply(`Remboursement de $${montant.toFixed(2)} effectué pour l'emprunt ${emprunt}.`)] });
    }
  }
};
