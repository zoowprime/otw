const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('registre')
    .setDescription('Crée un registre pour différentes institutions')
    // Registre Armurerie
    .addSubcommand(subcommand =>
      subcommand
        .setName('armurerie')
        .setDescription('Crée le registre de l\'armurerie')
        .addStringOption(option =>
          option.setName('nom')
            .setDescription('Nom/Prénom')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('stock')
            .setDescription('Stock après vente')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('arme')
            .setDescription('Arme achetée')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('amelioration')
            .setDescription('Amélioration')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('prix')
            .setDescription('Prix de la facture')
            .setRequired(true))
        .addUserOption(option =>
          option.setName('signature')
            .setDescription('Signature (mentionnez l\'utilisateur)')
            .setRequired(true))
    )
    // Registre Écurie
    .addSubcommand(subcommand =>
      subcommand
        .setName('ecurie')
        .setDescription('Crée le registre de l\'écurie')
        .addStringOption(option =>
          option.setName('nom')
            .setDescription('Nom/Prénom')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('stock')
            .setDescription('Stock après vente')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('arme')
            .setDescription('Arme achetée')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('amelioration')
            .setDescription('Amélioration')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('prix')
            .setDescription('Prix de la facture')
            .setRequired(true))
        .addUserOption(option =>
          option.setName('signature')
            .setDescription('Signature (mentionnez l\'utilisateur)')
            .setRequired(true))
    )
    // Registre Banque
    .addSubcommand(subcommand =>
      subcommand
        .setName('banque')
        .setDescription('Crée le registre de la banque')
        .addUserOption(option =>
          option.setName('client')
            .setDescription('Client (mention)')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('adresse')
            .setDescription('Adresse du client')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('typecompte')
            .setDescription('Type de compte')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('depot')
            .setDescription('Montant de dépôt initial')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('frais')
            .setDescription('Frais bancaires')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('nombanque')
            .setDescription('Nom de la banque')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('adressebanque')
            .setDescription('Adresse de la banque')
            .setRequired(true))
    )
    // Registre Saloon
    .addSubcommand(subcommand =>
      subcommand
        .setName('saloon')
        .setDescription('Crée le registre du saloon')
        .addUserOption(option =>
          option.setName('client')
            .setDescription('Client (mention)')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('stock')
            .setDescription('Stock après vente')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('boisson')
            .setDescription('Boisson achetée')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('prix')
            .setDescription('Prix de la facture')
            .setRequired(true))
    )
    // Registre Green Dock
    .addSubcommand(subcommand =>
      subcommand
        .setName('greendock')
        .setDescription('Crée le registre de Green Dock')
        .addStringOption(option =>
          option.setName('nom')
            .setDescription('Nom/Prénom')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('stock')
            .setDescription('Stock après location ou vente')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('bateau')
            .setDescription('Bateau acheté ou loué')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('prix')
            .setDescription('Prix de la facture')
            .setRequired(true))
        .addUserOption(option =>
          option.setName('signature')
            .setDescription('Signature (mentionnez l\'utilisateur)')
            .setRequired(true))
    )
    // Registre Green House
    .addSubcommand(subcommand =>
      subcommand
        .setName('greenhouse')
        .setDescription('Crée le registre de Green House')
        .addStringOption(option =>
          option.setName('nom')
            .setDescription('Nom/Prénom')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('stock')
            .setDescription('Stock après location')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('maison')
            .setDescription('Maison louée')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('prix')
            .setDescription('Prix de la facture')
            .setRequired(true))
        .addUserOption(option =>
          option.setName('signature')
            .setDescription('Signature (mentionnez l\'utilisateur)')
            .setRequired(true))
    )
    // Registre Médecin
    .addSubcommand(subcommand =>
      subcommand
        .setName('medecin')
        .setDescription('Crée le registre du médecin')
        .addStringOption(option =>
          option.setName('nom')
            .setDescription('Nom/Prénom')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('stock')
            .setDescription('Stock après vente')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('medicament')
            .setDescription('Médicament acheté')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('operation')
            .setDescription('Opération effectuée')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('prix')
            .setDescription('Prix de la facture')
            .setRequired(true))
        .addUserOption(option =>
          option.setName('signature')
            .setDescription('Signature (mentionnez l\'utilisateur)')
            .setRequired(true))
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    let embed;
    if (subcommand === 'armurerie') {
      const nom = interaction.options.getString('nom');
      const stock = interaction.options.getString('stock');
      const arme = interaction.options.getString('arme');
      const amelioration = interaction.options.getString('amelioration');
      const prix = interaction.options.getNumber('prix');
      const signature = interaction.options.getUser('signature');
      embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Registre Armurerie")
        .setDescription(
          `**Nom/Prénom :** ${nom}\n` +
          `**Stock après vente :** ${stock}\n` +
          `**Arme achetée :** ${arme}\n` +
          `**Amélioration :** ${amelioration}\n` +
          `**Prix de la facture :** $${prix.toFixed(2)}\n` +
          `**Signature :** <@${signature.id}>`
        );
    } else if (subcommand === 'ecurie') {
      const nom = interaction.options.getString('nom');
      const stock = interaction.options.getString('stock');
      const arme = interaction.options.getString('arme');
      const amelioration = interaction.options.getString('amelioration');
      const prix = interaction.options.getNumber('prix');
      const signature = interaction.options.getUser('signature');
      embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Registre Écurie")
        .setDescription(
          `**Nom/Prénom :** ${nom}\n` +
          `**Stock après vente :** ${stock}\n` +
          `**Cheval acheté :** ${arme}\n` +
          `**Accessoires :** ${amelioration}\n` +
          `**Prix de la facture :** $${prix.toFixed(2)}\n` +
          `**Signature :** <@${signature.id}>`
        );
    } else if (subcommand === 'banque') {
      const clientUser = interaction.options.getUser('client');
      const adresse = interaction.options.getString('adresse');
      const typecompte = interaction.options.getString('typecompte');
      const depot = interaction.options.getNumber('depot');
      const frais = interaction.options.getNumber('frais');
      const nomBanque = interaction.options.getString('nombanque');
      const adresseBanque = interaction.options.getString('adressebanque');
      embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Registre Banque")
        .setDescription(
          `**Nom du Client :** <@${clientUser.id}>\n` +
          `**Adresse :** ${adresse}\n` +
          `**Type de Compte :** ${typecompte}\n` +
          `**Montant de Dépôt Initial :** $${depot.toFixed(2)}\n` +
          `**Frais Bancaires :** $${frais.toFixed(2)}\n` +
          `**Nom de la Banque :** ${nomBanque}\n` +
          `**Adresse de la Banque :** ${adresseBanque}`
        );
    } else if (subcommand === 'saloon') {
      const clientUser = interaction.options.getUser('client');
      const stock = interaction.options.getString('stock');
      const boisson = interaction.options.getString('boisson');
      const prix = interaction.options.getNumber('prix');
      embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Registre Saloon")
        .setDescription(
          `**Nom du Client :** <@${clientUser.id}>\n` +
          `**Stock après vente :** ${stock}\n` +
          `**Boisson achetée :** ${boisson}\n` +
          `**Prix de la facture :** $${prix.toFixed(2)}`
        );
    } else if (subcommand === 'greendock') {
      const nom = interaction.options.getString('nom');
      const stock = interaction.options.getString('stock');
      const bateau = interaction.options.getString('bateau');
      const prix = interaction.options.getNumber('prix');
      const signature = interaction.options.getUser('signature');
      embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Registre Green Dock")
        .setDescription(
          `**Nom/Prénom :** ${nom}\n` +
          `**Stock après location ou vente :** ${stock}\n` +
          `**Bateau acheté/loué :** ${bateau}\n` +
          `**Prix de la facture :** $${prix.toFixed(2)}\n` +
          `**Signature :** <@${signature.id}>`
        );
    } else if (subcommand === 'greenhouse') {
      const nom = interaction.options.getString('nom');
      const stock = interaction.options.getString('stock');
      const maison = interaction.options.getString('maison');
      const prix = interaction.options.getNumber('prix');
      const signature = interaction.options.getUser('signature');
      embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Registre Green House")
        .setDescription(
          `**Nom/Prénom :** ${nom}\n` +
          `**Stock après location :** ${stock}\n` +
          `**Maison louée :** ${maison}\n` +
          `**Prix de la facture :** $${prix.toFixed(2)}\n` +
          `**Signature :** <@${signature.id}>`
        );
    } else if (subcommand === 'medecin') {
      const nom = interaction.options.getString('nom');
      const stock = interaction.options.getString('stock');
      const medicament = interaction.options.getString('medicament');
      const operation = interaction.options.getString('operation');
      const prix = interaction.options.getNumber('prix');
      const signature = interaction.options.getUser('signature');
      embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Registre Médecin")
        .setDescription(
          `**Nom/Prénom :** ${nom}\n` +
          `**Stock après vente :** ${stock}\n` +
          `**Médicament acheté :** ${medicament}\n` +
          `**Opération effectuée :** ${operation}\n` +
          `**Prix de la facture :** $${prix.toFixed(2)}\n` +
          `**Signature :** <@${signature.id}>`
        );
    } else {
      embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Registre inconnu")
        .setDescription("Aucune option valide n'a été sélectionnée.");
    }
    return interaction.reply({ embeds: [embed] });
  },
};
