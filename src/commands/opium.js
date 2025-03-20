// src/commands/opium.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreateAccount, updateAccount } = require('../economyData');

// Durée de fabrication : 5 minutes (en millisecondes)
const FABRICATION_DURATION = 5 * 60 * 1000;
// Cooldown pour la vente : 1 heure (en millisecondes)
const SALE_COOLDOWN = 60 * 60 * 1000;

// Listes pour les choix
const fabricationLocations = [
  { name: "Cabane Cachée", value: "cabane cachée" },
  { name: "Sous-sol", value: "sous-sol" },
  { name: "Campement Isolé", value: "campement isolé" }
];

const salePositions = [
  { name: "Port", value: "port" },
  { name: "Saloon", value: "saloon" },
  { name: "Planque Clandestine", value: "planque clandestine" }
];

// Global : enregistrement des opium fabriqués
global.activeOpiumFabrications = global.activeOpiumFabrications || new Map();
// Global : cooldown des ventes opium
global.opiumSaleCooldown = global.opiumSaleCooldown || new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('opium')
    .setDescription('Commandes relatives à l’opium')
    // Sous-commande: fabrication
    .addSubcommand(subcommand =>
      subcommand
        .setName('fabrication')
        .setDescription("Lance la fabrication d'opium (coût : 5$)")
        .addStringOption(option =>
          option.setName('lieu')
            .setDescription('Sélectionnez votre lieu de fabrication')
            .setRequired(true)
            .addChoices(...fabricationLocations)
        )
    )
    // Sous-commande: vendre_pnj
    .addSubcommand(subcommand =>
      subcommand
        .setName('vendre_pnj')
        .setDescription("Vends ton opium à un PNJ (gain aléatoire entre 15$ et 30$)")
        .addStringOption(option =>
          option.setName('position')
            .setDescription('Sélectionnez votre position')
            .setRequired(true)
            .addChoices(...salePositions)
        )
    )
    // Sous-commande: vendre_joueur
    .addSubcommand(subcommand =>
      subcommand
        .setName('vendre_joueur')
        .setDescription("Vends ton opium à un autre joueur (gain fixe : 20$)")
        .addStringOption(option =>
          option.setName('position')
            .setDescription('Sélectionnez votre position')
            .setRequired(true)
            .addChoices(...salePositions)
        )
        .addUserOption(option =>
          option.setName('target')
            .setDescription("Mentionnez le joueur à qui vendre")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const account = getOrCreateAccount(userId);

    if (subcommand === 'fabrication') {
      // Vérifier si une fabrication est déjà en cours pour cet utilisateur
      if (global.activeOpiumFabrications.has(userId)) {
        return interaction.reply({ content: "Vous avez déjà une fabrication en cours ou prête à être vendue.", ephemeral: true });
      }
      // Vérifier que l'utilisateur a au moins 5$ sur son compte courant
      if (account.courant < 5) {
        return interaction.reply({ content: "Fonds insuffisants pour fabriquer de l'opium.", ephemeral: true });
      }
      // Déduire le coût de fabrication
      account.courant -= 5;
      updateAccount(userId, account);

      // Envoyer l'embed de confirmation de lancement
      const fabricationEmbed = new EmbedBuilder()
        .setColor(0x8a2be2) // Violet
        .setTitle("Fabrication d'Opium")
        .setDescription(`Vous lancez la fabrication d'opium dans une **${interaction.options.getString('lieu')}**.\nVeuillez patienter **5 minutes**...`)
        .setFooter({ text: "Opium en cours de fabrication..." });
      await interaction.reply({ embeds: [fabricationEmbed], ephemeral: true });

      // Après 5 minutes, marquer la fabrication comme terminée
      setTimeout(async () => {
        global.activeOpiumFabrications.set(userId, { ready: true, finishedAt: Date.now() });
        const readyEmbed = new EmbedBuilder()
          .setColor(0x8a2be2)
          .setTitle("Lot d'opium prêt à la vente 🌱")
          .setDescription("Votre opium est maintenant prêt à être vendu !");
        try {
          await interaction.followUp({ embeds: [readyEmbed], ephemeral: true });
        } catch (err) {
          console.error("Erreur lors de l'envoi du message d'opium prêt :", err);
        }
      }, FABRICATION_DURATION);

    } else if (subcommand === 'vendre_pnj') {
      // Vérifier si une fabrication a été réalisée et est prête
      if (!global.activeOpiumFabrications.has(userId)) {
        return interaction.reply({ content: "Vous n'avez pas d'opium prêt à être vendu. Lancez d'abord la fabrication avec /opium fabrication.", ephemeral: true });
      }
      // Vérifier le cooldown de vente
      const lastSale = global.opiumSaleCooldown.get(userId) || 0;
      if (Date.now() - lastSale < SALE_COOLDOWN) {
        return interaction.reply({ content: "Vous devez attendre avant de revendre votre opium.", ephemeral: true });
      }
      // Calculer le gain aléatoire entre 15$ et 30$
      const reward = Math.floor(Math.random() * (30 - 15 + 1)) + 15;
      account.courant += reward;
      updateAccount(userId, account);
      global.activeOpiumFabrications.delete(userId);
      global.opiumSaleCooldown.set(userId, Date.now());
      const embed = new EmbedBuilder()
        .setColor(0x8a2be2)
        .setTitle("Vente d'Opium effectuée")
        .setDescription(`Opium vendu à un PNJ !\nVous recevez **$${reward.toFixed(2)}**.`);
      return interaction.reply({ embeds: [embed] });

    } else if (subcommand === 'vendre_joueur') {
      // Vérifier si une fabrication a été réalisée et est prête
      if (!global.activeOpiumFabrications.has(userId)) {
        return interaction.reply({ content: "Vous n'avez pas d'opium prêt à être vendu. Lancez d'abord la fabrication avec /opium fabrication.", ephemeral: true });
      }
      // Vérifier le cooldown de vente
      const lastSale = global.opiumSaleCooldown.get(userId) || 0;
      if (Date.now() - lastSale < SALE_COOLDOWN) {
        return interaction.reply({ content: "Vous devez attendre avant de revendre votre opium.", ephemeral: true });
      }
      const target = interaction.options.getUser('target');
      // Pour vente à joueur, le gain est fixé à 20$
      const reward = 20;
      const targetAccount = getOrCreateAccount(target.id);
      if (targetAccount.courant < reward) {
        return interaction.reply({ content: "Le joueur cible n'a pas assez d'argent liquide.", ephemeral: true });
      }
      // Transférer 20$ : soustraire du compte cible, ajouter au compte vendeur
      targetAccount.courant -= reward;
      updateAccount(target.id, targetAccount);
      account.courant += reward;
      updateAccount(userId, account);
      global.activeOpiumFabrications.delete(userId);
      global.opiumSaleCooldown.set(userId, Date.now());
      const embed = new EmbedBuilder()
        .setColor(0x8a2be2)
        .setTitle("Vente d'Opium effectuée")
        .setDescription(`Opium vendu à <@${target.id}> !\nVous recevez **$${reward.toFixed(2)}**.`);
      return interaction.reply({ embeds: [embed] });
    }
  }
};
