// src/commands/habitation.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { getHabitation, updateHabitation } = require('../data/habitationData');
const { getOrCreateAccount, updateAccount } = require('../economyData');
const { getInventory, removeItem, addItem } = require('../inventoryData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('habitation')
    .setDescription('Gère les dépôts et retraits dans votre habitation')
    .addSubcommand(sc => sc
      .setName('argent-deposer')
      .setDescription('Dépose de l’argent dans votre habitation')
      .addIntegerOption(o => o
        .setName('montant')
        .setDescription('Montant à déposer')
        .setRequired(true)))
    .addSubcommand(sc => sc
      .setName('argent-retirer')
      .setDescription('Retire de l’argent de votre habitation')
      .addIntegerOption(o => o
        .setName('montant')
        .setDescription('Montant à retirer')
        .setRequired(true)))
    .addSubcommand(sc => sc
      .setName('item-deposer')
      .setDescription('Dépose un objet dans votre habitation')
      .addStringOption(o => o
        .setName('item')
        .setDescription('Nom de l’objet')
        .setRequired(true)))
    .addSubcommand(sc => sc
      .setName('item-retirer')
      .setDescription('Récupère un objet de votre habitation')
      .addStringOption(o => o
        .setName('item')
        .setDescription('Nom de l’objet')
        .setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction) {
    const HAB_ROLE = process.env.HABITATION_ROLE;
    if (!interaction.member.roles.cache.has(HAB_ROLE)) {
      return interaction.reply({ content: '❌ Vous n’avez pas de maison assignée.', ephemeral: true });
    }

    const userId = interaction.user.id;
    const habitation = getHabitation(userId);
    const account    = getOrCreateAccount(userId);

    const sub = interaction.options.getSubcommand();
    if (sub === 'argent-deposer') {
      const amount = interaction.options.getInteger('montant');
      if (amount <= 0 || account.courant.banque < amount) {
        return interaction.reply({ content: '❌ Fonds insuffisants.', ephemeral: true });
      }
      account.courant.banque -= amount;
      habitation.argent += amount;
      updateAccount(userId, account);
      updateHabitation(userId, habitation);
      return interaction.reply(`✅ Vous avez déposé **${amount}$** dans votre habitation.`);
    }

    if (sub === 'argent-retirer') {
      const amount = interaction.options.getInteger('montant');
      if (amount <= 0 || habitation.argent < amount) {
        return interaction.reply({ content: '❌ Votre habitation n’a pas assez de fonds.', ephemeral: true });
      }
      habitation.argent -= amount;
      account.courant.liquide += amount;
      updateAccount(userId, account);
      updateHabitation(userId, habitation);
      return interaction.reply(`✅ Vous avez retiré **${amount}$** de votre habitation.`);
    }

    if (sub === 'item-deposer' || sub === 'item-retirer') {
      const item = interaction.options.getString('item');
      // inventaire personnel
      const inv = getInventory(userId);
      if (sub === 'item-deposer') {
        if (!inv[item] || inv[item] < 1) {
          return interaction.reply({ content: `❌ Vous n’avez pas d’${item}.`, ephemeral: true });
        }
        // retrait de l'inventaire perso, ajout maison
        removeItem(userId, item, 1);
        habitation.items[item] = (habitation.items[item]||0) + 1;
      } else {
        if (!habitation.items[item] || habitation.items[item] < 1) {
          return interaction.reply({ content: `❌ Votre habitation ne contient pas d’${item}.`, ephemeral: true });
        }
        habitation.items[item]--;
        addItem(userId, item, 1);
      }
      updateHabitation(userId, habitation);
      return interaction.reply(`✅ ${sub==='item-deposer' ? 'Déposé' : 'Retiré'} : **1 × ${item}**.`);
    }
  }
};
