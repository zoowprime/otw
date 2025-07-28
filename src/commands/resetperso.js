// src/commands/resetperso.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getOrCreateAccount, updateAccount } = require('../economyData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetperso')
    .setDescription('🔄 Réinitialise les comptes courant et entreprise d’un joueur.')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('Le joueur dont vous voulez réinitialiser les comptes')
        .setRequired(true)
    ),
  async execute(interaction) {
    const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;
    // Vérification du rôle STAFF
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: '❌ Vous n’avez pas la permission d’exécuter cette commande.',
        ephemeral: true
      });
    }

    const target = interaction.options.getUser('target');
    // Récupère ou crée les données de compte
    const account = getOrCreateAccount(target.id);

    // Réinitialisation des comptes
    account.courant.liquide   = 0;
    account.courant.banque    = 0;
    account.entreprise.liquide = 0;
    account.entreprise.banque  = 0;

    // Sauvegarde
    updateAccount(target.id, account);

    // Confirmation
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('Comptes réinitialisés')
      .setDescription(`Tous les soldes courant et entreprise de ${target} ont été remis à zéro.`)
      .addFields(
        { name: 'Compte courant',    value: '💧 Liquide : 0$\n🏦 Banque : 0$', inline: true },
        { name: 'Compte entreprise', value: '💧 Liquide : 0$\n🏦 Banque : 0$', inline: true }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
