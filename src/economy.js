// src/economy.js
require('dotenv').config({ path: './id.env' });
const { EmbedBuilder } = require('discord.js');
const { getOrCreateAccount, updateAccount } = require('./economyData');
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
    case "compte": {
      // Si un utilisateur est mentionné, afficher son compte
      const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
      const account = target ? getOrCreateAccount(target.id) : getOrCreateAccount(message.author.id);
      const liquide = account.courant;
      const banque = account.epargne + account.investissement;
      const total = liquide + banque;
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(target ? `Compte de ${target.user.username}` : "Informations de votre compte")
        .setDescription(
          `**Argent en liquide :** $${liquide.toFixed(2)}\n` +
          `**Argent en banque :** $${banque.toFixed(2)}\n` +
          `**Total :** $${total.toFixed(2)}`
        );
      return message.reply({ embeds: [embed] });
    }
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
    case "ouvrircompte": {
      if (!hasRole(message.member, process.env.BANQUIER_ROLE_ID))
        return message.reply({ embeds: [embedReply("Cette commande est réservée aux banquiers.")] });
      if (args.length < 1)
        return message.reply({ embeds: [embedReply("Usage: !ouvrircompte [type]")] });
      const type = args[0].toLowerCase();
      const account = getOrCreateAccount(message.author.id);
      if (account[type] !== undefined)
        return message.reply({ embeds: [embedReply(`Vous possédez déjà un compte de type ${type}.`)] });
      account[type] = 0;
      updateAccount(message.author.id, account);
      return message.reply({ embeds: [embedReply(`Compte de type ${type} créé.`)] });
    }
    case "solde": {
      if (args.length < 1)
        return message.reply({ embeds: [embedReply("Usage: !solde [type] ou !compte [@joueur]")] });
      // Si un utilisateur est mentionné, afficher son compte
      const target = message.mentions.members.first();
      const account = target ? getOrCreateAccount(target.id) : getOrCreateAccount(message.author.id);
      const liquide = account.courant;
      const banque = account.epargne + account.investissement;
      const total = liquide + banque;
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(target ? `Compte de ${target.user.username}` : "Informations de votre compte")
        .setDescription(
          `**Argent en liquide :** $${liquide.toFixed(2)}\n` +
          `**Argent en banque :** $${banque.toFixed(2)}\n` +
          `**Total :** $${total.toFixed(2)}`
        );
      return message.reply({ embeds: [embed] });
    }
    case "déposer": {
      if (args.length < 2)
        return message.reply({ embeds: [embedReply("Usage: !déposer [montant] [type]")] });
      const amount = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(amount))
        return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const type = args[1].toLowerCase();
      const account = getOrCreateAccount(message.author.id);
      if (account[type] === undefined)
        return message.reply({ embeds: [embedReply(`Aucun compte de type ${type} trouvé.`)] });
      account[type] += amount;
      updateAccount(message.author.id, account);
      return message.reply({ embeds: [embedReply(`Vous avez déposé $${amount.toFixed(2)} sur votre compte ${type}. Nouveau solde: $${account[type].toFixed(2)}.`)] });
    }
    case "retirer": {
      if (args.length < 2)
        return message.reply({ embeds: [embedReply("Usage: !retirer [montant] [type]")] });
      const amount = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(amount))
        return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const type = args[1].toLowerCase();
      const account = getOrCreateAccount(message.author.id);
      if (account[type] === undefined)
        return message.reply({ embeds: [embedReply(`Aucun compte de type ${type} trouvé.`)] });
      if (account[type] < amount)
        return message.reply({ embeds: [embedReply("Fonds insuffisants.")] });
      account[type] -= amount;
      updateAccount(message.author.id, account);
      return message.reply({ embeds: [embedReply(`Vous avez retiré $${amount.toFixed(2)} de votre compte ${type}. Nouveau solde: $${account[type].toFixed(2)}.`)] });
    }
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
      if (senderAccount[type] === undefined || receiverAccount[type] === undefined)
        return message.reply({ embeds: [embedReply("Type de compte inexistant pour l'un des utilisateurs.")] });
      if (senderAccount[type] < amount)
        return message.reply({ embeds: [embedReply("Fonds insuffisants sur votre compte.")] });
      senderAccount[type] -= amount;
      receiverAccount[type] += amount;
      updateAccount(message.author.id, senderAccount);
      updateAccount(target.id, receiverAccount);
      return message.reply({ embeds: [embedReply(`Transfert de $${amount.toFixed(2)} de votre compte ${type} vers ${target.user.tag} effectué.`)] });
    }
    case "investir": {
      if (args.length < 2)
        return message.reply({ embeds: [embedReply("Usage: !investir [montant] [entreprise]")] });
      const amount = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(amount))
        return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const entreprise = args.slice(1).join(" ");
      return message.reply({ embeds: [embedReply(`Vous avez investi $${amount.toFixed(2)} dans ${entreprise}.`)] });
    }
    case "acheterpart": {
      if (args.length < 2)
        return message.reply({ embeds: [embedReply("Usage: !acheterpart [montant] [entreprise]")] });
      const amount = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(amount))
        return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const entreprise = args.slice(1).join(" ");
      return message.reply({ embeds: [embedReply(`Vous avez acheté des parts pour $${amount.toFixed(2)} dans ${entreprise}.`)] });
    }
    case "achetermaison": {
      if (args.length < 2)
        return message.reply({ embeds: [embedReply("Usage: !achetermaison [prix] [adresse]")] });
      const prix = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(prix))
        return message.reply({ embeds: [embedReply("Prix invalide.")] });
      const adresse = args.slice(1).join(" ");
      return message.reply({ embeds: [embedReply(`Maison achetée à ${adresse} pour $${prix.toFixed(2)}.`)] });
    }
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
    // -------------- Cas pour la commande !msgsupr --------------
    case "msgsupr": {
      await handleMsgsuprCommand(message, args);
      break;
    }
    // -------------- Cas pour la commande !paye --------------
    case "paye": {
      // La commande !paye [@joueur] [montant]
      if (args.length < 2)
        return message.reply({ embeds: [embedReply("Usage: !paye [@joueur] [montant]")] });
      const target = message.mentions.members.first();
      if (!target)
        return message.reply({ embeds: [embedReply("Joueur non trouvé.")] });
      const amount = parseFloat(args[1].replace('$', '').replace(',', '.'));
      if (isNaN(amount) || amount <= 0)
        return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const senderAccount = getOrCreateAccount(message.author.id);
      const receiverAccount = getOrCreateAccount(target.id);
      if (senderAccount.courant < amount)
        return message.reply({ embeds: [embedReply("Fonds insuffisants sur votre compte pour effectuer ce paiement.")] });
      senderAccount.courant -= amount;
      receiverAccount.courant += amount;
      updateAccount(message.author.id, senderAccount);
      updateAccount(target.id, receiverAccount);
      return message.reply({ embeds: [embedReply(`Vous avez payé $${amount.toFixed(2)} à ${target.user.tag}.`)] });
    }
    // -------------- Cas pour la commande !retirerargent (banquiers uniquement) --------------
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
    // ------------------------------
    // Commandes concernant les taxes
    // ------------------------------
    case "déclarertaxe": {
      if (args.length < 1)
        return message.reply({ embeds: [embedReply("Usage: !déclarertaxe [montant]")] });
      const montant = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(montant))
        return message.reply({ embeds: [embedReply("Montant invalide.")] });
      return message.reply({ embeds: [embedReply(`Taxe déclarée: $${montant.toFixed(2)}.`)] });
    }
    case "calculertaxe": {
      if (args.length < 2)
        return message.reply({ embeds: [embedReply("Usage: !calculertaxe [montant] [taux]")] });
      const montant = parseFloat(args[0].replace('$', '').replace(',', '.'));
      const taux = parseFloat(args[1].replace('%', '').replace(',', '.'));
      if (isNaN(montant) || isNaN(taux))
        return message.reply({ embeds: [embedReply("Montant ou taux invalide.")] });
      const taxe = montant * (taux / 100);
      return message.reply({ embeds: [embedReply(`La taxe pour $${montant.toFixed(2)} à ${taux}% est $${taxe.toFixed(2)}.`)] });
    }
    // ------------------------------
    // Autres commandes économiques
    // ------------------------------
    case "rapportsfinanciers": {
      return message.reply({ embeds: [embedReply("Rapport financier généré (simulation).")] });
    }
    case "statistiqueséconomiques": {
      return message.reply({ embeds: [embedReply("Statistiques économiques globales (simulation).")] });
    }
    case "tauxdinteret": {
      return message.reply({ embeds: [embedReply("Le taux d'intérêt actuel est de 5% (simulation).")] });
    }
    case "ajoutertauxdinteret": {
      return message.reply({ embeds: [embedReply("Taux d'intérêt ajouté (simulation).")] });
    }
    case "supprimertauxdinteret": {
      return message.reply({ embeds: [embedReply("Taux d'intérêt supprimé (simulation).")] });
    }
    case "aide": {
      const helpMessage = `
**Commandes Banquier:**
!ajouterargent [@joueur] [montant]
!ouvrircompte [type]
!transférer [montant] [destinataire] [type]
!emprunter [montant] [durée]
!contrat [type] [détails]
!retirerargent [@joueur] [montant]

**Commandes Citoyen:**
!compte [@joueur]
!solde [type]
!paye [@joueur] [montant]
!déposer [montant] [type]
!retirer [montant] [type]
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
