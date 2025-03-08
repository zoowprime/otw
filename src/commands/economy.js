// src/commands/economy.js
const { 
  SlashCommandBuilder, 
  EmbedBuilder 
} = require('discord.js');
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
    
    // /economy compte [target] [type]
    .addSubcommand(subcommand =>
      subcommand
        .setName('compte')
        .setDescription('Affiche le compte d’un joueur ou le vôtre')
        .addUserOption(option =>
          option.setName('target')
            .setDescription("L'utilisateur dont afficher le compte")
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type de compte (courant, epargne, entreprise)')
            .setRequired(true)
            .addChoices(...accountTypes)
        )
    )
    
    // /economy solde [type]
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
    
    // /economy declarertaxe [montant]
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
    
    // /economy calculertaxe [montant] [taux]
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
    
    // /economy ajouterargent [target] [montant]
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
    
    // /economy ouvrircompte [type]
    .addSubcommand(subcommand =>
      subcommand
        .setName('ouvrircompte')
        .setDescription('Ouvre un compte bancaire (epargne ou entreprise uniquement)')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Sélectionnez le type de compte à ouvrir')
            .setRequired(true)
            .addChoices(
              // Le compte courant existe de base, on ne le propose pas ici
              { name: 'epargne', value: 'epargne' },
              { name: 'entreprise', value: 'entreprise' }
            )
        )
    )
    
    // /economy transférer [montant] [target] [type]
    .addSubcommand(subcommand =>
      subcommand
        .setName('transférer')
        .setDescription('Transfère de l’argent d’un compte à un autre (banquiers uniquement)')
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant à transférer')
            .setRequired(true)
        )
        .addUserOption(option =>
          option.setName('target')
            .setDescription("Le joueur destinataire")
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type de compte')
            .setRequired(true)
            .addChoices(...accountTypes)
        )
    )
    
    // /economy emprunter [montant] [duree]
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
            .setDescription('La durée de l’emprunt (ex: 12 mois)')
            .setRequired(true)
        )
    )
    
    // /economy contrat [...]
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
    
    // /economy retirerargent [target] [montant]
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
    
    // /economy retirermoney [montant]
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
    
    // /economy depargent [montant]
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
    
    // /economy paye [target] [montant] [type]
    .addSubcommand(subcommand =>
      subcommand
        .setName('paye')
        .setDescription('Effectue un paiement à un autre joueur')
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
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Sélectionnez le type de compte pour ce paiement')
            .setRequired(true)
            .addChoices(...accountTypes)
        )
    )
    
    // /economy investir [montant] [entreprise]
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
    
    // /economy acheterpart [montant] [entreprise]
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
    
    // /economy achetermaison [prix] [adresse]
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
    
    // /economy acheterproduit [produit] [quantite] [prix]
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
    
    // /economy vendrestock [type] [quantite] [prixtotal]
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
    
    // /economy remboursement [montant] [emprunt]
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

    // /economy compte [target] [type]
    if (subcommand === 'compte') {
      const target = interaction.options.getUser('target') || interaction.user;
      const type = interaction.options.getString('type').toLowerCase();
      let account;
      if (type === 'courant') {
        account = getOrCreateAccount(target.id);
      } else {
        // Pour epargne et entreprise, le compte doit exister (créé par un banquier)
        account = getAccount(target.id);
        if (!account || account[type] === undefined) {
          return interaction.reply({ embeds: [embedReply(`Le compte ${type} n'est pas créé pour ${target.username}. Veuillez contacter un banquier.`)], ephemeral: true });
        }
      }
      const value = account[type];
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`Compte ${type} de ${target.username}`)
        .setDescription(`Votre solde pour le compte ${type} est $${value.toFixed(2)}.`);
      return interaction.reply({ embeds: [embed] });
    }
    
    // /economy solde [type]
    if (subcommand === 'solde') {
      const type = interaction.options.getString('type').toLowerCase();
      const account = getOrCreateAccount(interaction.user.id);
      if (account[type] === undefined) {
        return interaction.reply({ embeds: [embedReply(`Aucun compte de type ${type} trouvé pour vous.`)], ephemeral: true });
      }
      const value = account[type];
      return interaction.reply({ embeds: [embedReply(`Votre solde pour le compte ${type} est $${value.toFixed(2)}.`)] });
    }
    
    // /economy declarertaxe [montant]
    if (subcommand === 'declarertaxe') {
      const montant = interaction.options.getNumber('montant');
      return interaction.reply({ embeds: [embedReply(`Taxe déclarée: $${montant.toFixed(2)}.`)] });
    }
    
    // /economy calculertaxe [montant] [taux]
    if (subcommand === 'calculertaxe') {
      const montant = interaction.options.getNumber('montant');
      const taux = interaction.options.getNumber('taux');
      const taxe = montant * (taux / 100);
      return interaction.reply({ embeds: [embedReply(`La taxe pour $${montant.toFixed(2)} à ${taux}% est $${taxe.toFixed(2)}.`)] });
    }
    
    // /economy ajouterargent [target] [montant]
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
    
    // /economy ouvrircompte [type]
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
    
    // /economy transférer [montant] [target] [type]
    if (subcommand === 'transférer') {
      if (!interaction.member.roles.cache.has(process.env.BANQUIER_ROLE_ID)) {
        return interaction.reply({ content: "Cette commande est réservée aux banquiers.", ephemeral: true });
      }
      const amount = interaction.options.getNumber('montant');
      const target = interaction.options.getUser('target');
      const type = interaction.options.getString('type').toLowerCase();
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
    
    // /economy emprunter [montant] [duree]
    if (subcommand === 'emprunter') {
      const amount = interaction.options.getNumber('montant');
      const duree = interaction.options.getString('duree');
      return interaction.reply({ embeds: [embedReply(`Demande d'emprunt de $${amount.toFixed(2)} pour ${duree} reçue.`)] });
    }
    
    // /economy contrat [nombanque] [adressebanque] [client] [adresseclient] [typecompte] [depotinitial] [frais]
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
La Banque propose plusieurs types de comptes, notamment :
• Compte d'Épargne : destiné à la constitution d'un capital avec un taux d'intérêt de 5 % annuel.
• Compte Courant : conçu pour les transactions quotidiennes.
• Compte d’Entreprise : réservé aux entreprises.
• Dépôt National spécifique pour l’état

Conditions d'Ouverture de Compte
Pour ouvrir un compte, le Client doit :
• Être âgé d'au moins 18 ans.
• Présenter une pièce d'identité valide et des références.
• Déposer un montant minimum (50$ pour un compte d’épargne et 100$ pour un compte courant).

Gestion du Compte
Le Client s'engage à :
• Maintenir un solde minimum sur le compte courant.
• Utiliser le compte conformément aux lois.
• Informer la Banque de tout changement de situation.

Droits et Obligations de la Banque
La Banque se réserve le droit de :
• Modifier les taux d'intérêt et frais de service.
• Fermer le compte sans préavis en cas de non-respect.

Protection des Fonds
Les fonds déposés sont protégés jusqu'à 1 000$ par client.

Confidentialité et Sécurité
La Banque s'engage à préserver la confidentialité des informations du Client.

Résiliation du Compte
Le Client peut clôturer son compte à tout moment, avec remboursement des fonds restants dans un délai de 10 jours ouvrables.

Signatures :
Signature du Représentant de la Banque`;
      
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
    
    // /economy retirerargent [target] [montant]
    if (subcommand === 'retirerargent') {
      if (!interaction.member.roles.cache.has(process.env.BANQUIER_ROLE_ID)) {
        return interaction.reply({ content: "Cette commande est réservée aux banquiers.", ephemeral: true });
      }
      const target = interaction.options.getUser('target');
      const montant = interaction.options.getNumber('montant');
      const account = getOrCreateAccount(target.id);
      if (account.courant < montant) {
        return interaction.reply({ embeds: [embedReply("Fonds insuffisants sur le compte du joueur.")], ephemeral: true });
      }
      account.courant -= montant;
      updateAccount(target.id, account);
      return interaction.reply({ embeds: [embedReply(`$${montant.toFixed(2)} ont été retirés du compte de ${target.username}.`)] });
    }
    
    // /economy retirermoney [montant]
    if (subcommand === 'retirermoney') {
      const montant = interaction.options.getNumber('montant');
      const account = getOrCreateAccount(interaction.user.id);
      const bankAmount = account.epargne + account.investissement;
      if (bankAmount < montant) {
        return interaction.reply({ embeds: [embedReply("Fonds insuffisants sur votre compte en banque.")], ephemeral: true });
      }
      let reste = montant;
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
      account.courant += montant;
      updateAccount(interaction.user.id, account);
      return interaction.reply({ embeds: [embedReply(`Vous avez retiré $${montant.toFixed(2)} de votre compte en banque. Nouveau solde liquide: $${account.courant.toFixed(2)}.`)] });
    }
    
    // /economy depargent [montant]
    if (subcommand === 'depargent') {
      const montant = interaction.options.getNumber('montant');
      const account = getOrCreateAccount(interaction.user.id);
      if (account.courant < montant) {
        return interaction.reply({ embeds: [embedReply("Fonds insuffisants en liquide.")], ephemeral: true });
      }
      account.courant -= montant;
      account.epargne += montant;
      updateAccount(interaction.user.id, account);
      return interaction.reply({ embeds: [embedReply(`Vous avez déposé $${montant.toFixed(2)} de votre liquide sur votre compte en banque. Nouveau solde épargne: $${account.epargne.toFixed(2)}.`)] });
    }
    
    // /economy paye [target] [montant] [type]
    if (subcommand === 'paye') {
      const target = interaction.options.getUser('target');
      const montant = interaction.options.getNumber('montant');
      const type = interaction.options.getString('type').toLowerCase();
      // Pour payer, si le type n'est pas 'courant', vérifier que le compte existe
      let senderAccount;
      if (type === 'courant') {
        senderAccount = getOrCreateAccount(interaction.user.id);
      } else {
        senderAccount = getAccount(interaction.user.id);
        if (!senderAccount || senderAccount[type] === undefined) {
          return interaction.reply({ embeds: [embedReply(`Le compte ${type} n'est pas créé pour vous. Veuillez contacter un banquier.`)], ephemeral: true });
        }
      }
      let receiverAccount;
      if (type === 'courant') {
        receiverAccount = getOrCreateAccount(target.id);
      } else {
        receiverAccount = getAccount(target.id);
        if (!receiverAccount || receiverAccount[type] === undefined) {
          return interaction.reply({ embeds: [embedReply(`Le compte ${type} n'est pas créé pour ${target.username}.`)], ephemeral: true });
        }
      }
      if (senderAccount[type] < montant) {
        return interaction.reply({ embeds: [embedReply("Fonds insuffisants sur votre compte pour effectuer ce paiement.")], ephemeral: true });
      }
      senderAccount[type] -= montant;
      receiverAccount[type] += montant;
      updateAccount(interaction.user.id, senderAccount);
      updateAccount(target.id, receiverAccount);
      return interaction.reply({ embeds: [embedReply(`Vous avez payé $${montant.toFixed(2)} à ${target.username} depuis votre compte ${type}.`)] });
    }
    
    // /economy investir [montant] [entreprise]
    if (subcommand === 'investir') {
      const montant = interaction.options.getNumber('montant');
      const entreprise = interaction.options.getString('entreprise');
      return interaction.reply({ embeds: [embedReply(`Vous avez investi $${montant.toFixed(2)} dans ${entreprise}.`)] });
    }
    
    // /economy acheterpart [montant] [entreprise]
    if (subcommand === 'acheterpart') {
      const montant = interaction.options.getNumber('montant');
      const entreprise = interaction.options.getString('entreprise');
      return interaction.reply({ embeds: [embedReply(`Vous avez acheté des parts pour $${montant.toFixed(2)} dans ${entreprise}.`)] });
    }
    
    // /economy achetermaison [prix] [adresse]
    if (subcommand === 'achetermaison') {
      const prix = interaction.options.getNumber('prix');
      const adresse = interaction.options.getString('adresse');
      return interaction.reply({ embeds: [embedReply(`Maison achetée à ${adresse} pour $${prix.toFixed(2)}.`)] });
    }
    
    // /economy acheterproduit [produit] [quantite] [prix]
    if (subcommand === 'acheterproduit') {
      const produit = interaction.options.getString('produit');
      const quantite = interaction.options.getNumber('quantite');
      const prix = interaction.options.getNumber('prix');
      return interaction.reply({ embeds: [embedReply(`Vous avez acheté ${quantite} ${produit} pour $${prix.toFixed(2)}.`)] });
    }
    
    // /economy vendrestock [type] [quantite] [prixtotal]
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
    
    // /economy remboursement [montant] [emprunt]
    if (subcommand === 'remboursement') {
      const montant = interaction.options.getNumber('montant');
      const emprunt = interaction.options.getString('emprunt');
      return interaction.reply({ embeds: [embedReply(`Remboursement de $${montant.toFixed(2)} effectué pour l'emprunt ${emprunt}.`)] });
    }
  }
};
