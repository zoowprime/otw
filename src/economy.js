// economy.js
const { EmbedBuilder } = require('discord.js');

// Stocke les comptes bancaires en mémoire (pour cet exemple)
const bankData = new Map();

// Récupère ou crée un compte pour un utilisateur
function getOrCreateAccount(userId) {
  if (!bankData.has(userId)) {
    bankData.set(userId, {
      epargne: 0,
      courant: 0,
      investissement: 0,
    });
  }
  return bankData.get(userId);
}

// Vérifie si le membre possède le rôle demandé (pour les commandes réservées aux banquiers)
function hasRole(member, roleId) {
  return member.roles.cache.has(roleId);
}

// Liste des items disponibles avec leur prix unitaire (en dollars)
const availableItems = {
  "cattleman_revolver": 18.50,
  "navy_revolver": 18.00,
  "double_action_revolver": 19.00,
  "schofield_revolver": 20.50,
  "lemat_revolver": 25.25,
  "volcanic_pistol": 18.50,
  "litchfield_rifle": 26.25,
  "evans_rifle": 32.25,
  "lancaster_rifle": 32.25,
  // Vous pouvez ajouter d'autres items ici...
};

// Helper : Crée un embed rouge avec une description
const embedReply = (description) => new EmbedBuilder().setColor(0xff0000).setDescription(description);

async function handleEconomyCommand(message) {
  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  switch (command) {

    // ====================================
    // Nouvelle commande : !compte
    // ====================================
    case "compte": {
      const account = getOrCreateAccount(message.author.id);
      const liquide = account.courant;
      const banque = account.epargne + account.investissement;
      const total = liquide + banque;
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Informations de votre compte")
        .setDescription(
          `**Argent en liquide :** $${liquide.toFixed(2)}\n` +
          `**Argent en banque :** $${banque.toFixed(2)}\n` +
          `**Total :** $${total.toFixed(2)}`
        );
      return message.reply({ embeds: [embed] });
    }

    // ====================================
    // Commandes réservées aux banquiers
    // ====================================
    case "ajouterargent": {
      if (!hasRole(message.member, process.env.BANQUIER_ROLE_ID)) {
        return message.reply({ embeds: [embedReply("Cette commande est réservée aux banquiers.")] });
      }
      if (args.length < 2) return message.reply({ embeds: [embedReply("Usage: !ajouterargent [joueur] [montant]")] });
      const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
      if (!target) return message.reply({ embeds: [embedReply("Joueur non trouvé.")] });
      const amount = parseFloat(args[1].replace('$', '').replace(',', '.'));
      if (isNaN(amount)) return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const account = getOrCreateAccount(target.id);
      account.courant += amount;
      return message.reply({ embeds: [embedReply(`$${amount.toFixed(2)} ont été ajoutés au compte de ${target.user.tag}.`)] });
    }

    case "ouvrircompte": {
      if (!hasRole(message.member, process.env.BANQUIER_ROLE_ID)) {
        return message.reply({ embeds: [embedReply("Cette commande est réservée aux banquiers.")] });
      }
      if (args.length < 1) return message.reply({ embeds: [embedReply("Usage: !ouvrircompte [type]")] });
      const type = args[0].toLowerCase();
      const account = getOrCreateAccount(message.author.id);
      if (account[type] !== undefined) {
        return message.reply({ embeds: [embedReply(`Vous possédez déjà un compte de type ${type}.`)] });
      } else {
        account[type] = 0;
        return message.reply({ embeds: [embedReply(`Compte de type ${type} créé.`)] });
      }
    }

    case "transférer": {
      if (!hasRole(message.member, process.env.BANQUIER_ROLE_ID)) {
        return message.reply({ embeds: [embedReply("Cette commande est réservée aux banquiers.")] });
      }
      if (args.length < 3) return message.reply({ embeds: [embedReply("Usage: !transférer [montant] [destinataire] [type]")] });
      const amount = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(amount)) return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const target = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
      if (!target) return message.reply({ embeds: [embedReply("Destinataire non trouvé.")] });
      const type = args[2].toLowerCase();
      const senderAccount = getOrCreateAccount(message.author.id);
      const receiverAccount = getOrCreateAccount(target.id);
      if (senderAccount[type] === undefined || receiverAccount[type] === undefined) {
        return message.reply({ embeds: [embedReply("Type de compte inexistant pour l'un des utilisateurs.")] });
      }
      if (senderAccount[type] < amount) return message.reply({ embeds: [embedReply("Fonds insuffisants sur votre compte.")] });
      senderAccount[type] -= amount;
      receiverAccount[type] += amount;
      return message.reply({ embeds: [embedReply(`Transfert de $${amount.toFixed(2)} de votre compte ${type} vers ${target.user.tag} effectué.`)] });
    }

    case "emprunter": {
      if (!hasRole(message.member, process.env.BANQUIER_ROLE_ID)) {
        return message.reply({ embeds: [embedReply("Cette commande est réservée aux banquiers.")] });
      }
      if (args.length < 2) return message.reply({ embeds: [embedReply("Usage: !emprunter [montant] [durée]")] });
      const montant = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(montant)) return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const duree = args[1];
      return message.reply({ embeds: [embedReply(`Emprunt de $${montant.toFixed(2)} pour une durée de ${duree} accepté.`)] });
    }

    case "contrat": {
      if (!hasRole(message.member, process.env.BANQUIER_ROLE_ID)) {
        return message.reply({ embeds: [embedReply("Cette commande est réservée aux banquiers.")] });
      }
      if (args.length < 2) return message.reply({ embeds: [embedReply("Usage: !contrat [type] [détails]")] });
      const type = args[0];
      const details = args.slice(1).join(" ");
      return message.reply({ embeds: [embedReply(`Contrat de type ${type} créé avec les détails: ${details}.`)] });
    }

    case "remboursement": {
      if (args.length < 2) return message.reply({ embeds: [embedReply("Usage: !remboursement [montant] [emprunt]")] });
      const montant = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(montant)) return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const emprunt = args[1];
      return message.reply({ embeds: [embedReply(`Vous avez remboursé $${montant.toFixed(2)} pour l'emprunt ${emprunt}.`)] });
    }

    // ====================================
    // Commandes de gestion des stocks
    // ====================================
    case "ajouterstock": {
      // Si aucun argument ou insuffisants, affiche la liste des items disponibles
      if (args.length < 2) {
        let list = "Items disponibles à commander:\n";
        for (const [key, price] of Object.entries(availableItems)) {
          list += `**${key}**: $${price.toFixed(2)}\n`;
        }
        return message.reply({ embeds: [embedReply(list)] });
      }
      const itemType = args[0].toLowerCase();
      const quantity = parseFloat(args[1]);
      if (isNaN(quantity) || quantity <= 0) return message.reply({ embeds: [embedReply("Quantité invalide.")] });
      if (!availableItems[itemType]) {
        // Item non valide, afficher la liste
        let list = "Item non valide. Items disponibles:\n";
        for (const [key, price] of Object.entries(availableItems)) {
          list += `**${key}**: $${price.toFixed(2)}\n`;
        }
        return message.reply({ embeds: [embedReply(list)] });
      }
      const pricePerUnit = availableItems[itemType];
      const totalPrice = pricePerUnit * quantity;
      // Vérifier les fonds du joueur (argent liquide dans "courant")
      const account = getOrCreateAccount(message.author.id);
      if (account.courant < totalPrice) {
        return message.reply({ embeds: [embedReply(`Fonds insuffisants. Vous avez $${account.courant.toFixed(2)}, besoin de $${totalPrice.toFixed(2)}.`)] });
      }
      // Déduire l'argent du joueur
      account.courant -= totalPrice;
      // Ajouter l'argent à l'usine de production
      const factoryAccount = getOrCreateAccount(process.env.USINE_PRODUCTION_ID);
      factoryAccount.courant += totalPrice;
      // Mettre à jour le stock global
      if (!global.stockData) global.stockData = {};
      if (!global.stockData[itemType]) global.stockData[itemType] = { quantite: 0, prixtotal: 0 };
      global.stockData[itemType].quantite += quantity;
      global.stockData[itemType].prixtotal += totalPrice;
      return message.reply({ embeds: [embedReply(`Ajouté ${quantity} de ${itemType} pour un total de $${totalPrice.toFixed(2)}. L'argent a été retiré de votre compte et crédité à l'usine de production.`)] });
    }

    case "vendrestock": {
      if (args.length < 3) return message.reply({ embeds: [embedReply("Usage: !vendrestock [type] [quantité] [prixtotal]")] });
      const itemType = args[0].toLowerCase();
      const quantity = parseFloat(args[1]);
      const prixtotal = parseFloat(args[2].replace('$', '').replace(',', '.'));
      if (isNaN(quantity) || isNaN(prixtotal)) return message.reply({ embeds: [embedReply("Quantité ou prix total invalide.")] });
      if (!global.stockData || !global.stockData[itemType] || global.stockData[itemType].quantite < quantity) {
        return message.reply({ embeds: [embedReply(`Stock insuffisant pour ${itemType}.`)] });
      }
      global.stockData[itemType].quantite -= quantity;
      global.stockData[itemType].prixtotal -= prixtotal;
      return message.reply({ embeds: [embedReply(`Vous avez vendu ${quantity} de ${itemType} pour un total de $${prixtotal.toFixed(2)}.`)] });
    }

    case "affichestock": {
      if (!global.stockData) return message.reply({ embeds: [embedReply("Aucun stock enregistré.")] });
      let stockMessage = "Contenu du stock:\n";
      for (const type in global.stockData) {
        const data = global.stockData[type];
        stockMessage += `${type}: ${data.quantite} unités, Total: $${data.prixtotal.toFixed(2)}\n`;
      }
      return message.reply({ embeds: [embedReply(stockMessage)] });
    }

    // ====================================
    // Commandes concernant les taxes
    // ====================================
    case "déclarertaxe": {
      if (args.length < 1) return message.reply({ embeds: [embedReply("Usage: !déclarertaxe [montant]")] });
      const montant = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(montant)) return message.reply({ embeds: [embedReply("Montant invalide.")] });
      return message.reply({ embeds: [embedReply(`Taxe déclarée: $${montant.toFixed(2)}.`)] });
    }

    case "calculertaxe": {
      if (args.length < 2) return message.reply({ embeds: [embedReply("Usage: !calculertaxe [montant] [taux]")] });
      const montant = parseFloat(args[0].replace('$', '').replace(',', '.'));
      const taux = parseFloat(args[1].replace('%', '').replace(',', '.'));
      if (isNaN(montant) || isNaN(taux)) return message.reply({ embeds: [embedReply("Montant ou taux invalide.")] });
      const taxe = montant * (taux / 100);
      return message.reply({ embeds: [embedReply(`La taxe pour $${montant.toFixed(2)} à ${taux}% est $${taxe.toFixed(2)}.`)] });
    }

    case "rapportsfinanciers": {
      return message.reply({ embeds: [embedReply("Rapport financier généré (simulation).")] });
    }

    // ====================================
    // Autres commandes économiques
    // ====================================
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
!ajouterargent [joueur] [montant]
!ouvrircompte [type]
!transférer [montant] [destinataire] [type]
!emprunter [montant] [durée]
!contrat [type] [détails]

**Commandes Citoyen:**
!compte
!solde [type]
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
