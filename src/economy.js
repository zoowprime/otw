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

// Helper : Crée un embed rouge avec une description
const embedReply = (description) => new EmbedBuilder().setColor(0xff0000).setDescription(description);

async function handleEconomyCommand(message) {
  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  switch (command) {
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

    case "solde": {
      if (args.length < 1) return message.reply({ embeds: [embedReply("Usage: !solde [type]")] });
      const type = args[0].toLowerCase();
      const account = getOrCreateAccount(message.author.id);
      if (account[type] === undefined) return message.reply({ embeds: [embedReply(`Aucun compte de type ${type} trouvé.`)] });
      return message.reply({ embeds: [embedReply(`Votre solde pour le compte ${type} est $${account[type].toFixed(2)}.`)] });
    }

    case "déposer": {
      if (args.length < 2) return message.reply({ embeds: [embedReply("Usage: !déposer [montant] [type]")] });
      const amount = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(amount)) return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const type = args[1].toLowerCase();
      const account = getOrCreateAccount(message.author.id);
      if (account[type] === undefined) return message.reply({ embeds: [embedReply(`Aucun compte de type ${type} trouvé.`)] });
      account[type] += amount;
      return message.reply({ embeds: [embedReply(`Vous avez déposé $${amount.toFixed(2)} sur votre compte ${type}. Nouveau solde: $${account[type].toFixed(2)}.`)] });
    }

    case "retirer": {
      if (args.length < 2) return message.reply({ embeds: [embedReply("Usage: !retirer [montant] [type]")] });
      const amount = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(amount)) return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const type = args[1].toLowerCase();
      const account = getOrCreateAccount(message.author.id);
      if (account[type] === undefined) return message.reply({ embeds: [embedReply(`Aucun compte de type ${type} trouvé.`)] });
      if (account[type] < amount) return message.reply({ embeds: [embedReply("Fonds insuffisants.")] });
      account[type] -= amount;
      return message.reply({ embeds: [embedReply(`Vous avez retiré $${amount.toFixed(2)} de votre compte ${type}. Nouveau solde: $${account[type].toFixed(2)}.`)] });
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

    case "investir": {
      if (args.length < 2) return message.reply({ embeds: [embedReply("Usage: !investir [montant] [entreprise]")] });
      const amount = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(amount)) return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const entreprise = args.slice(1).join(" ");
      return message.reply({ embeds: [embedReply(`Vous avez investi $${amount.toFixed(2)} dans ${entreprise}.`)] });
    }

    case "acheterpart": {
      if (args.length < 2) return message.reply({ embeds: [embedReply("Usage: !acheterpart [montant] [entreprise]")] });
      const amount = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(amount)) return message.reply({ embeds: [embedReply("Montant invalide.")] });
      const entreprise = args.slice(1).join(" ");
      return message.reply({ embeds: [embedReply(`Vous avez acheté des parts pour $${amount.toFixed(2)} dans ${entreprise}.`)] });
    }

    case "achetermaison": {
      if (args.length < 2) return message.reply({ embeds: [embedReply("Usage: !achetermaison [prix] [adresse]")] });
      const prix = parseFloat(args[0].replace('$', '').replace(',', '.'));
      if (isNaN(prix)) return message.reply({ embeds: [embedReply("Prix invalide.")] });
      const adresse = args.slice(1).join(" ");
      return message.reply({ embeds: [embedReply(`Maison achetée à ${adresse} pour $${prix.toFixed(2)}.`)] });
    }

    case "acheterproduit": {
      if (args.length < 3) return message.reply({ embeds: [embedReply("Usage: !acheterproduit [produit] [quantité] [prix]")] });
      const produit = args[0];
      const quantite = parseFloat(args[1]);
      const prix = parseFloat(args[2].replace('$', '').replace(',', '.'));
      if (isNaN(quantite) || isNaN(prix)) return message.reply({ embeds: [embedReply("Quantité ou prix invalide.")] });
      return message.reply({ embeds: [embedReply(`Vous avez acheté ${quantite} ${produit} pour $${prix.toFixed(2)}.`)] });
    }

    // Commande "vendreproduit" renommée en "vendrestock" pour les joueurs
    case "vendrestock": {
      if (args.length < 3) return message.reply({ embeds: [embedReply("Usage: !vendrestock [type] [quantité] [prixtotal]")] });
      const type = args[0];
      const quantite = parseFloat(args[1]);
      const prixtotal = parseFloat(args[2].replace('$', '').replace(',', '.'));
      if (isNaN(quantite) || isNaN(prixtotal)) return message.reply({ embeds: [embedReply("Quantité ou prix total invalide.")] });
      if (!global.stockData || !global.stockData[type] || global.stockData[type].quantite < quantite) {
        return message.reply({ embeds: [embedReply(`Stock insuffisant pour ${type}.`)] });
      }
      global.stockData[type].quantite -= quantite;
      global.stockData[type].prixtotal -= prixtotal; // Simplement soustraire (à adapter selon votre logique)
      return message.reply({ embeds: [embedReply(`Vous avez vendu ${quantite} de ${type} pour un total de $${prixtotal.toFixed(2)}.`)] });
    }

    case "ajouterstock": {
      // Maintenant accessible à tous les joueurs
      if (args.length < 3) return message.reply({ embeds: [embedReply("Usage: !ajouterstock [type] [quantité] [prixtotal]")] });
      const type = args[0];
      const quantite = parseFloat(args[1]);
      const prixtotal = parseFloat(args[2].replace('$', '').replace(',', '.'));
      if (isNaN(quantite) || isNaN(prixtotal)) return message.reply({ embeds: [embedReply("Quantité ou prix total invalide.")] });
      if (!global.stockData) global.stockData = {};
      if (!global.stockData[type]) global.stockData[type] = { quantite: 0, prixtotal: 0 };
      global.stockData[type].quantite += quantite;
      global.stockData[type].prixtotal += prixtotal;
      return message.reply({ embeds: [embedReply(`Ajouté ${quantite} de ${type} pour un total de $${prixtotal.toFixed(2)}.`)] });
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
!solde [type]
!déposer [montant] [type]
!retirer [montant] [type]
!investir [montant] [entreprise]
!acheterpart [montant] [entreprise]
!achetermaison [prix] [adresse]
!acheterproduit [produit] [quantité] [prix]
!vendreproduit [produit] [quantité] [prix]
!remboursement [montant] [emprunt]
!ajouterstock [type] [quantité] [prixtotal]
!vendrestock [type] [quantité] [prixtotal]
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
