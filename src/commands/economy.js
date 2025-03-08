// src/commands/economy.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreateAccount, updateAccount, getAccount } = require('../economyData');

// Utilitaire pour créer un embed rouge
const embedReply = (description) =>
  new EmbedBuilder().setColor(0xff0000).setDescription(description);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('economy')
    .setDescription('Commandes économiques')
    
    // Affiche le compte d’un joueur (ou le vôtre)
    .addSubcommand(subcommand =>
      subcommand
        .setName('compte')
        .setDescription('Affiche le compte d’un joueur ou le vôtre')
        .addUserOption(option =>
          option.setName('target')
            .setDescription('Le joueur dont afficher le compte')
            .setRequired(false)
        )
    )
    
    // Affiche le solde d’un compte (type)
    .addSubcommand(subcommand =>
      subcommand
        .setName('solde')
        .setDescription('Affiche le solde d’un compte (epargne, courant, investissement)')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Le type de compte')
            .setRequired(true)
        )
    )
    
    // Déclare une taxe
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
    
    // Calcule une taxe
    .addSubcommand(subcommand =>
      subcommand
        .setName('calculertaxe')
        .setDescription('Calcule la taxe sur un montant')
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant sur lequel calculer la taxe')
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName('taux')
            .setDescription('Le taux de la taxe (en %)')
            .setRequired(true)
        )
    )
    
    // Déposer de l’argent sur un compte
    .addSubcommand(subcommand =>
      subcommand
        .setName('deposer')
        .setDescription('Déposer de l’argent sur un compte')
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant à déposer')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Le type de compte (epargne, courant, investissement)')
            .setRequired(true)
        )
    )
    
    // Retirer de l’argent d’un compte
    .addSubcommand(subcommand =>
      subcommand
        .setName('retirer')
        .setDescription('Retirer de l’argent d’un compte')
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant à retirer')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Le type de compte')
            .setRequired(true)
        )
    )
    
    // Investir dans une entreprise
    .addSubcommand(subcommand =>
      subcommand
        .setName('investir')
        .setDescription('Investir un montant dans une entreprise')
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant à investir')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('entreprise')
            .setDescription('Le nom de l’entreprise')
            .setRequired(true)
        )
    )
    
    // Acheter des parts
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
            .setDescription('Le nom de l’entreprise')
            .setRequired(true)
        )
    )
    
    // Acheter une maison
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
            .setDescription('L’adresse de la maison')
            .setRequired(true)
        )
    )
    
    // Acheter un produit
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
    
    // Vendre des stocks
    .addSubcommand(subcommand =>
      subcommand
        .setName('vendrestock')
        .setDescription('Vendre des stocks')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Le type d’item')
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
    
    // Rembourser un emprunt
    .addSubcommand(subcommand =>
      subcommand
        .setName('remboursement')
        .setDescription('Rembourser un emprunt')
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
    )
    
    // Ajouter des stocks
    .addSubcommand(subcommand =>
      subcommand
        .setName('ajouterstock')
        .setDescription('Ajouter des stocks et créditer l’usine de production')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Le type d’item')
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName('quantite')
            .setDescription('La quantité à ajouter')
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName('prixtotal')
            .setDescription('Le prix total')
            .setRequired(true)
        )
    )
    
    // Retirer de l'argent du compte en banque (mettre en liquide)
    .addSubcommand(subcommand =>
      subcommand
        .setName('retirermoney')
        .setDescription('Retirer de l’argent du compte en banque et le mettre en liquide')
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant à retirer du compte en banque')
            .setRequired(true)
        )
    )
    
    // Déposer de l'argent liquide sur le compte en banque
    .addSubcommand(subcommand =>
      subcommand
        .setName('depargent')
        .setDescription('Déposer de l’argent liquide sur le compte en banque')
        .addNumberOption(option =>
          option.setName('montant')
            .setDescription('Le montant à déposer sur le compte en banque')
            .setRequired(true)
        )
    )
    
    // Paiement entre joueurs
    .addSubcommand(subcommand =>
      subcommand
        .setName('paye')
        .setDescription('Effectuer un paiement à un autre joueur')
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
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    // /economy compte [target]
    if (subcommand === 'compte') {
      const target = interaction.options.getUser('target');
      const account = target ? (getAccount(target.id) || getOrCreateAccount(target.id))
                             : getOrCreateAccount(interaction.user.id);
      const liquide = account.courant;
      const banque = account.epargne + account.investissement;
      const total = liquide + banque;
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(target ? `Compte de ${target.username}` : "Informations de votre compte")
        .setDescription(
          `**Argent en liquide :** $${liquide.toFixed(2)}\n` +
          `**Argent en banque :** $${banque.toFixed(2)}\n` +
          `**Total :** $${total.toFixed(2)}`
        );
      return interaction.reply({ embeds: [embed] });
    }
    
    // /economy solde [type]
    if (subcommand === 'solde') {
      const type = interaction.options.getString('type').toLowerCase();
      const account = getOrCreateAccount(interaction.user.id);
      if (account[type] === undefined) {
        return interaction.reply({ embeds: [embedReply(`Aucun compte de type ${type} trouvé.`)], ephemeral: true });
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
    
    // /economy deposer [montant] [type]
    if (subcommand === 'deposer') {
      const montant = interaction.options.getNumber('montant');
      const type = interaction.options.getString('type').toLowerCase();
      const account = getOrCreateAccount(interaction.user.id);
      if (account[type] === undefined) {
        return interaction.reply({ embeds: [embedReply(`Aucun compte de type ${type} trouvé.`)], ephemeral: true });
      }
      account[type] += montant;
      updateAccount(interaction.user.id, account);
      return interaction.reply({ embeds: [embedReply(`Vous avez déposé $${montant.toFixed(2)} sur votre compte ${type}. Nouveau solde: $${account[type].toFixed(2)}.`)] });
    }
    
    // /economy retirer [montant] [type]
    if (subcommand === 'retirer') {
      const montant = interaction.options.getNumber('montant');
      const type = interaction.options.getString('type').toLowerCase();
      const account = getOrCreateAccount(interaction.user.id);
      if (account[type] === undefined) {
        return interaction.reply({ embeds: [embedReply(`Aucun compte de type ${type} trouvé.`)], ephemeral: true });
      }
      if (account[type] < montant) {
        return interaction.reply({ embeds: [embedReply("Fonds insuffisants.")], ephemeral: true });
      }
      account[type] -= montant;
      updateAccount(interaction.user.id, account);
      return interaction.reply({ embeds: [embedReply(`Vous avez retiré $${montant.toFixed(2)} de votre compte ${type}. Nouveau solde: $${account[type].toFixed(2)}.`)] });
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
    
    // /economy ajouterstock [type] [quantite] [prixtotal]
    if (subcommand === 'ajouterstock') {
      const itemType = interaction.options.getString('type').toLowerCase();
      const quantite = interaction.options.getNumber('quantite');
      const prixtotal = interaction.options.getNumber('prixtotal');
      if (!availableItems[itemType]) {
        let list = "Item non valide. Items disponibles:\n";
        for (const [key, price] of Object.entries(availableItems)) {
          list += `**${key}**: $${price.toFixed(2)}\n`;
        }
        return interaction.reply({ embeds: [embedReply(list)], ephemeral: true });
      }
      const pricePerUnit = availableItems[itemType];
      const totalPrice = pricePerUnit * quantite;
      const account = getOrCreateAccount(interaction.user.id);
      if (account.courant < totalPrice) {
        return interaction.reply({ embeds: [embedReply(`Fonds insuffisants. Vous avez $${account.courant.toFixed(2)}, besoin de $${totalPrice.toFixed(2)}.`)], ephemeral: true });
      }
      account.courant -= totalPrice;
      const factoryAccount = getOrCreateAccount(process.env.USINE_PRODUCTION_ID);
      factoryAccount.courant += totalPrice;
      if (!global.stockData) global.stockData = {};
      if (!global.stockData[itemType]) global.stockData[itemType] = { quantite: 0, prixtotal: 0 };
      global.stockData[itemType].quantite += quantite;
      global.stockData[itemType].prixtotal += totalPrice;
      return interaction.reply({ embeds: [embedReply(`Ajouté ${quantite} de ${itemType} pour un total de $${totalPrice.toFixed(2)}.\nL'argent a été retiré de votre compte et crédité à l'usine de production.`)] });
    }
    
    // /economy retirermoney [montant]
    if (subcommand === 'retirermoney') {
      const montant = interaction.options.getNumber('montant');
      const account = getOrCreateAccount(interaction.user.id);
      // Supposons que le compte en banque correspond aux comptes 'epargne' et 'investissement'
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
  }
};
