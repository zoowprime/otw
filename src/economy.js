// src/economy.js
require('dotenv').config({ path: './id.env' });
const { EmbedBuilder } = require('discord.js');
const { getOrCreateAccount, updateAccount, getAccount } = require('./economyData');
const { handleMsgsuprCommand } = require('./commands/msgsupr'); // Commande de suppression de messages

// Vérifie si un membre possède un rôle donné
function hasRole(member, roleId) {
  return member.roles.cache.has(roleId);
}

const embedReply = (description) =>
  new EmbedBuilder().setColor(0xff0000).setDescription(description);

// Liste des items disponibles pour la commande ajouterstock
const availableItems = {
  // Armes
  "cattleman_revolver": 18.50,
  "navy_revolver": 18.00,
  "double_action_revolver": 19.00,
  "schofield_revolver": 20.50,
  "lemat_revolver": 25.25,
  "volcanic_pistol": 18.50,
  "litchfield_rifle": 26.25,
  "evans_rifle": 32.25,
  "lancaster_rifle": 32.25,
  "carabine_a_repetition": 32.25,
  "fusil_a_petit_gibier": 15.25,
  "fusil_springfield": 19.75,
  "fusil_a_verrou": 26.25,
  // Chevaux (exemples)
  "american_paint_tobiano": 100.00,
  "american_paint_overo": 100.00,
  "american_paint_balzane": 110.00,
  "american_paint_overo_gris": 120.00,
  "appaloosa_cape_leopard": 100.00,
  "appaloosa_capee": 100.00,
  "appaloosa_leopard": 120.00,
  "appaloosa_leopard_brun": 120.00,
  // Alcools
  "vin_parisien_bouteille": 12.00,
  "vin_parisien_tonneau": 1800.00,
  "vin_bordelais_bouteille": 15.00,
  "vin_bordelais_tonneau": 2200.00,
  "champagne_bouteille": 20.00,
  "champagne_tonneau": 3000.00,
  "whisky_anglais_bouteille": 15.00,
  "whisky_anglais_tonneau": 2500.00,
  "whisky_ecossais_bouteille": 18.00,
  "whisky_ecossais_tonneau": 3500.00,
  "whisky_irlandais_bouteille": 14.00,
  "whisky_irlandais_tonneau": 2000.00,
  // Ajoutez ici le reste de vos items...
};

if (!global.stockData) global.stockData = {};

async function handleEconomyCommand(message) {
  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  switch (command) {
    // !compte [@joueur] [type]
    case "compte": {
      // Si un utilisateur est mentionné, affiche son compte, sinon le vôtre.
      // Le type de compte est requis pour epargne et entreprise.
      const target = message.mentions.members.first() || message.member;
      const type = args[0] ? args[0].toLowerCase() : "courant"; // Par défaut courant
      // Pour le compte courant, on le crée automatiquement. Sinon, on vérifie qu'il existe.
      let account;
      if (type === "courant") {
        account = getOrCreateAccount(target.id);
      } else {
        account = getAccount(target.id);
        if (!account || account[type] === undefined) {
          return message.reply({ embeds: [embedReply(`Le compte ${type} n'est pas créé pour ${target.user.username}. Veuillez contacter un banquier.`)] });
        }
      }
      const value = account[type];
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`Compte ${type} de ${target.user.username}`)
        .setDescription(`Votre solde pour le compte ${type} est $${value.toFixed(2)}.`);
      return message.reply({ embeds: [embed] });
    }

    // !solde [type]
    case "solde": {
      if (args.length < 1)
        return message.reply({ embeds: [embedReply("Usage: !solde [type]")] });
      const type = args[0].toLowerCase();
      const account = getOrCreateAccount(message.author.id);
      if (account[type] === undefined) {
        return message.reply({ embeds: [embedReply(`Aucun compte de type ${type} trouvé pour vous.`)] });
      }
      const value = account[type];
      return message.reply({ embeds: [embedReply(`Votre solde pour le compte ${type} est $${value.toFixed(2)}.`)] });
    }

    // !ajouterargent [@joueur] [montant]
    case "ajouterargent": {
      if (!hasRole(message.member, process.env.BANQUIER_ROLE_ID))
        return message.reply({ embeds: [embedReply("Cette commande est réservée aux banquiers.")] });
      if (args.length < 2)
        return message.reply({ embeds: [embedReply("Usage: !ajouterargent [@joueur] [montant]")] });
      const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
      if (!target)
        return message.reply({ embeds: [embedReply("Joueur non trouvé.")] });
      const amount = parseFloat(args[1].replace('$', '').replace(',', '.'));
      if (isNaN(amount))
        return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const account = getOrCreateAccount(target.id);
      account.courant += amount;
      updateAccount(target.id, account);
      return message.reply({ embeds: [embedReply(`$${amount.toFixed(2)} ont été ajoutés au compte de ${target.user.tag}.`)] });
    }

    // !ouvrircompte [type]
    // Seules les commandes pour créer un compte epargne ou entreprise (le compte courant existe de base)
    case "ouvrircompte": {
      if (!hasRole(message.member, process.env.BANQUIER_ROLE_ID))
        return message.reply({ embeds: [embedReply("Cette commande est réservée aux banquiers.")] });
      if (args.length < 1)
        return message.reply({ embeds: [embedReply("Usage: !ouvrircompte [type] (epargne/entreprise)")] });
      const type = args[0].toLowerCase();
      if (type === "courant") {
        return message.reply({ embeds: [embedReply("Le compte courant est créé automatiquement.")] });
      }
      const account = getOrCreateAccount(message.author.id);
      if (account[type] !== undefined) {
        return message.reply({ embeds: [embedReply(`Vous possédez déjà un compte de type ${type}.`)] });
      }
      account[type] = 0;
      updateAccount(message.author.id, account);
      return message.reply({ embeds: [embedReply(`Compte de type ${type} créé pour ${message.author.tag}.`)] });
    }

    // !transférer [montant] [destinataire] [type]
    case "transférer": {
      if (!hasRole(message.member, process.env.BANQUIER_ROLE_ID))
        return message.reply({ embeds: [embedReply("Cette commande est réservée aux banquiers.")] });
      if (args.length < 3)
        return message.reply({ embeds: [embedReply("Usage: !transférer [montant] [destinataire] [type]")] });
      const amount = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(amount))
        return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const target = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
      if (!target)
        return message.reply({ embeds: [embedReply("Destinataire non trouvé.")] });
      const type = args[2].toLowerCase();
      const senderAccount = getOrCreateAccount(message.author.id);
      const receiverAccount = getOrCreateAccount(target.id);
      if (senderAccount[type] === undefined || receiverAccount[type] === undefined) {
        return message.reply({ embeds: [embedReply("Type de compte inexistant pour l'un des utilisateurs.")], ephemeral: true });
      }
      if (senderAccount[type] < amount) {
        return message.reply({ embeds: [embedReply("Fonds insuffisants sur votre compte.")], ephemeral: true });
      }
      senderAccount[type] -= amount;
      receiverAccount[type] += amount;
      updateAccount(message.author.id, senderAccount);
      updateAccount(target.id, receiverAccount);
      return message.reply({ embeds: [embedReply(`Transfert de $${amount.toFixed(2)} de votre compte ${type} vers ${target.user.tag} effectué.`)] });
    }

    // !emprunter [montant] [durée]
    case "emprunter": {
      if (args.length < 2)
        return message.reply({ embeds: [embedReply("Usage: !emprunter [montant] [durée]")] });
      const amount = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(amount))
        return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const duree = args[1];
      // Logique d'emprunt à développer
      return message.reply({ embeds: [embedReply(`Demande d'emprunt de $${amount.toFixed(2)} pour ${duree} reçue.`)] });
    }

    // !contrat [nombanque] [adressebanque] [@client] [adresseclient] [typecompte] [depotinitial] [frais]
    case "contrat": {
      if (args.length < 7)
        return message.reply({ embeds: [embedReply("Usage: !contrat [nombanque] [adressebanque] [@client] [adresseclient] [typecompte] [depotinitial] [frais]")] });
      const nomBanque = args[0];
      const adresseBanque = args[1];
      const client = message.mentions.members.first();
      if (!client)
        return message.reply({ embeds: [embedReply("Client non trouvé.")] });
      const adresseClient = args[2]; // Vous pouvez ajuster si l'adresse comporte des espaces
      const typeCompte = args[3].toLowerCase();
      const depotInitial = parseFloat(args[4].replace('$', '').replace(',', '.'));
      const frais = parseFloat(args[5].replace('$', '').replace(',', '.'));
      if (isNaN(depotInitial) || isNaN(frais))
        return message.reply({ embeds: [embedReply("Montant de dépôt ou frais invalide.")] });
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

Protection
• Fonds protégés jusqu'à 1 000$ par client.

Confidentialité
• Les informations restent confidentielles.

Résiliation
• Clôture possible à tout moment avec remboursement sous 10 jours.

Signatures :
Signature du Représentant de la Banque`;
      
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Demande d'ouverture de compte bancaire")
        .setDescription(
          `**Nom de la Banque :** ${nomBanque}\n` +
          `**Adresse de la Banque :** ${adresseBanque}\n\n` +
          `**Nom du Client :** ${client.user.username}\n` +
          `**Adresse du Client :** ${adresseClient}\n` +
          `**Type de Compte :** ${typeCompte}\n` +
          `**Montant de Dépôt Initial :** $${depotInitial.toFixed(2)}\n` +
          `**Frais Bancaires :** $${frais.toFixed(2)}\n\n` +
          conditions
        );
      return message.reply({ embeds: [embed] });
    }

    // !retirerargent [@joueur] [montant]
    case "retirerargent": {
      if (!hasRole(message.member, process.env.BANQUIER_ROLE_ID))
        return message.reply({ embeds: [embedReply("Cette commande est réservée aux banquiers.")] });
      if (args.length < 2)
        return message.reply({ embeds: [embedReply("Usage: !retirerargent [@joueur] [montant]")] });
      const target = message.mentions.members.first();
      if (!target)
        return message.reply({ embeds: [embedReply("Joueur non trouvé.")] });
      const amount = parseFloat(args[1].replace('$', '').replace(',', '.'));
      if (isNaN(amount) || amount <= 0)
        return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const account = getOrCreateAccount(target.id);
      if (account.courant < amount)
        return message.reply({ embeds: [embedReply("Fonds insuffisants sur le compte du joueur.")] });
      account.courant -= amount;
      updateAccount(target.id, account);
      return message.reply({ embeds: [embedReply(`$${amount.toFixed(2)} ont été retirés du compte de ${target.user.tag}.`)] });
    }

    // !retirermoney [montant]
    case "retirermoney": {
      if (args.length < 1)
        return message.reply({ embeds: [embedReply("Usage: !retirermoney [montant]")] });
      const amount = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(amount))
        return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const account = getOrCreateAccount(message.author.id);
      const bankAmount = account.epargne + account.investissement;
      if (bankAmount < amount) {
        return message.reply({ embeds: [embedReply("Fonds insuffisants sur votre compte en banque.")], ephemeral: true });
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
          return message.reply({ embeds: [embedReply("Fonds insuffisants sur votre compte en banque.")], ephemeral: true });
        }
      }
      account.courant += amount;
      updateAccount(message.author.id, account);
      return message.reply({ embeds: [embedReply(`Vous avez retiré $${amount.toFixed(2)} de votre compte en banque. Nouveau solde liquide: $${account.courant.toFixed(2)}.`)] });
    }

    // !depargent [montant]
    case "depargent": {
      if (args.length < 1)
        return message.reply({ embeds: [embedReply("Usage: !depargent [montant]")] });
      const amount = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(amount))
        return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const account = getOrCreateAccount(message.author.id);
      if (account.courant < amount) {
        return message.reply({ embeds: [embedReply("Fonds insuffisants en liquide.")], ephemeral: true });
      }
      account.courant -= amount;
      account.epargne += amount;
      updateAccount(message.author.id, account);
      return message.reply({ embeds: [embedReply(`Vous avez déposé $${amount.toFixed(2)} de votre liquide sur votre compte en banque. Nouveau solde épargne: $${account.epargne.toFixed(2)}.`)] });
    }

      // -------------- Cas pour la commande !msgsupr --------------
case "msgsupr": {
  await handleMsgsuprCommand(message, args);
  break;
  }

    // !paye [@joueur] [montant] [type]
    case "paye": {
      if (args.length < 3)
        return message.reply({ embeds: [embedReply("Usage: !paye [@joueur] [montant] [type]")] });
      const target = message.mentions.members.first();
      if (!target)
        return message.reply({ embeds: [embedReply("Joueur non trouvé.")] });
      const amount = parseFloat(args[1].replace('$', '').replace(',', '.'));
      if (isNaN(amount) || amount <= 0)
        return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const type = args[2].toLowerCase();
      let senderAccount;
      if (type === "courant") {
        senderAccount = getOrCreateAccount(message.author.id);
      } else {
        senderAccount = getAccount(message.author.id);
        if (!senderAccount || senderAccount[type] === undefined) {
          return message.reply({ embeds: [embedReply(`Le compte ${type} n'est pas créé pour vous. Veuillez contacter un banquiers.`)], ephemeral: true });
        }
      }
      let receiverAccount;
      if (type === "courant") {
        receiverAccount = getOrCreateAccount(target.id);
      } else {
        receiverAccount = getAccount(target.id);
        if (!receiverAccount || receiverAccount[type] === undefined) {
          return message.reply({ embeds: [embedReply(`Le compte ${type} n'est pas créé pour ${target.user.username}.`)], ephemeral: true });
        }
      }
      if (senderAccount[type] < amount) {
        return message.reply({ embeds: [embedReply("Fonds insuffisants sur votre compte pour effectuer ce paiement.")], ephemeral: true });
      }
      senderAccount[type] -= amount;
      receiverAccount[type] += amount;
      updateAccount(message.author.id, senderAccount);
      updateAccount(target.id, receiverAccount);
      return message.reply({ embeds: [embedReply(`Vous avez payé $${amount.toFixed(2)} à ${target.user.tag} depuis votre compte ${type}.`)] });
    }

    // !investir [montant] [entreprise]
    case "investir": {
      if (args.length < 2)
        return message.reply({ embeds: [embedReply("Usage: !investir [montant] [entreprise]")] });
      const amount = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(amount))
        return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const entreprise = args.slice(1).join(" ");
      return message.reply({ embeds: [embedReply(`Vous avez investi $${amount.toFixed(2)} dans ${entreprise}.`)] });
    }

    // !acheterpart [montant] [entreprise]
    case "acheterpart": {
      if (args.length < 2)
        return message.reply({ embeds: [embedReply("Usage: !acheterpart [montant] [entreprise]")] });
      const amount = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(amount))
        return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const entreprise = args.slice(1).join(" ");
      return message.reply({ embeds: [embedReply(`Vous avez acheté des parts pour $${amount.toFixed(2)} dans ${entreprise}.`)] });
    }

    // !achetermaison [prix] [adresse]
    case "achetermaison": {
      if (args.length < 2)
        return message.reply({ embeds: [embedReply("Usage: !achetermaison [prix] [adresse]")] });
      const prix = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(prix))
        return message.reply({ embeds: [embedReply("Prix invalide.")] });
      const adresse = args.slice(1).join(" ");
      return message.reply({ embeds: [embedReply(`Maison achetée à ${adresse} pour $${prix.toFixed(2)}.`)] });
    }

    // !acheterproduit [produit] [quantité] [prix]
    case "acheterproduit": {
      if (args.length < 3)
        return message.reply({ embeds: [embedReply("Usage: !acheterproduit [produit] [quantité] [prix]")] });
      const produit = args[0];
      const quantite = parseFloat(args[1]);
      const prix = parseFloat(args[2].replace('$', '').replace(',', '.'));
      if (isNaN(quantite) || isNaN(prix))
        return message.reply({ embeds: [embedReply("Quantité ou prix invalide.")] });
      return message.reply({ embeds: [embedReply(`Vous avez acheté ${quantite} ${produit} pour $${prix.toFixed(2)}.`)] });
    }

    // !vendrestock [type] [quantité] [prixtotal]
    case "vendrestock": {
      if (args.length < 3)
        return message.reply({ embeds: [embedReply("Usage: !vendrestock [type] [quantité] [prixtotal]")] });
      const itemType = args[0].toLowerCase();
      const quantite = parseFloat(args[1]);
      const prixtotal = parseFloat(args[2].replace('$', '').replace(',', '.'));
      if (isNaN(quantite) || isNaN(prixtotal))
        return message.reply({ embeds: [embedReply("Quantité ou prix total invalide.")] });
      if (!global.stockData || !global.stockData[itemType] || global.stockData[itemType].quantite < quantite)
        return message.reply({ embeds: [embedReply(`Stock insuffisant pour ${itemType}.`)] });
      global.stockData[itemType].quantite -= quantite;
      global.stockData[itemType].prixtotal -= prixtotal;
      return message.reply({ embeds: [embedReply(`Vous avez vendu ${quantite} de ${itemType} pour un total de $${prixtotal.toFixed(2)}.`)] });
    }

    // !remboursement [montant] [emprunt]
    case "remboursement": {
      if (args.length < 2)
        return message.reply({ embeds: [embedReply("Usage: !remboursement [montant] [emprunt]")] });
      const montant = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(montant))
        return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const emprunt = args[1];
      return message.reply({ embeds: [embedReply(`Remboursement de $${montant.toFixed(2)} effectué pour l'emprunt ${emprunt}.`)] });
    }

    // !ajouterstock [type] [quantité] [prixtotal]
    case "ajouterstock": {
      if (args.length < 2) {
        let list = "Items disponibles à commander:\n";
        for (const [key, price] of Object.entries(availableItems)) {
          list += `**${key}**: $${price.toFixed(2)}\n`;
        }
        return message.reply({ embeds: [embedReply(list)] });
      }
      const itemType = args[0].toLowerCase();
      const quantite = parseFloat(args[1]);
      if (isNaN(quantite) || quantite <= 0)
        return message.reply({ embeds: [embedReply("Quantité invalide.")] });
      if (!availableItems[itemType]) {
        let list = "Item non valide. Items disponibles:\n";
        for (const [key, price] of Object.entries(availableItems)) {
          list += `**${key}**: $${price.toFixed(2)}\n`;
        }
        return message.reply({ embeds: [embedReply(list)] });
      }
      const pricePerUnit = availableItems[itemType];
      const totalPrice = pricePerUnit * quantite;
      const account = getOrCreateAccount(message.author.id);
      if (account.courant < totalPrice) {
        return message.reply({ embeds: [embedReply(`Fonds insuffisants. Vous avez $${account.courant.toFixed(2)}, besoin de $${totalPrice.toFixed(2)}.`)] });
      }
      account.courant -= totalPrice;
      const factoryAccount = getOrCreateAccount(process.env.USINE_PRODUCTION_ID);
      factoryAccount.courant += totalPrice;
      if (!global.stockData) global.stockData = {};
      if (!global.stockData[itemType]) global.stockData[itemType] = { quantite: 0, prixtotal: 0 };
      global.stockData[itemType].quantite += quantite;
      global.stockData[itemType].prixtotal += totalPrice;
      return message.reply({ embeds: [embedReply(`Ajouté ${quantite} de ${itemType} pour un total de $${totalPrice.toFixed(2)}.\nL'argent a été retiré de votre compte et crédité à l'usine de production.`)] });
    }

    // !msgsupr [nombre de messages]
    case "msgsupr": {
      await handleMsgsuprCommand(message, args);
      break;
    }

    // !aide
    case "aide": {
      const helpMessage = `
**Commandes Banquier:**
!ajouterargent [@joueur] [montant]
!ouvrircompte [type] (epargne/entreprise)
!transférer [montant] [destinataire] [type]
!emprunter [montant] [durée]
!contrat [nombanque] [adressebanque] [@client] [adresseclient] [typecompte] [depotinitial] [frais]
!retirerargent [@joueur] [montant]

**Commandes Citoyen:**
!compte [@joueur] [type]
!solde [type]
!paye [@joueur] [montant] [type]
!retirermoney [montant]
!depargent [montant]
!investir [montant] [entreprise]
!acheterpart [montant] [entreprise]
!achetermaison [prix] [adresse]
!acheterproduit [produit] [quantité] [prix]
!vendrestock [type] [quantité] [prixtotal]
!remboursement [montant] [emprunt]
!ajouterstock [type] [quantité] [prixtotal]
!affichestock
!msgsupr [nombre de messages]
!déclarertaxe [montant]
!calculertaxe [montant] [taux]
!rapportsfinanciers
!statistiqueséconomiques
!tauxdinteret
!ajoutertauxdinteret
!supprimertauxdinteret
!aide
      `;
      return message.reply({ embeds: [embedReply(helpMessage)] });
    }

    default:
      return; // Commande inconnue
  }
}

module.exports = { handleEconomyCommand };
