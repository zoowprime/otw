// src/commands/versionnouvelle.js
const { SlashCommandBuilder } = require('discord.js');
const { getOrCreateAccount, updateAccount } = require('../economyData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('versionnouvelle')
    .setDescription('Ajoute 50$ de liquide à tous les citoyens (staff uniquement)'),
    
  async execute(interaction) {
    const STAFF_ROLE_ID   = process.env.STAFF_ROLE_ID;
    const CITIZEN_ROLE_ID = process.env.CITIZEN_ROLE_ID;

    // 1️⃣ Vérifie la permission staff
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: '❌ Vous n’avez pas la permission d’exécuter cette commande.',
        ephemeral: true
      });
    }

    // Ack immédiat en éphemère pour éviter le timeout
    await interaction.deferReply({ ephemeral: true });

    // 2️⃣ Récupère tous les membres du serveur
    const members = await interaction.guild.members.fetch();

    let count = 0;
    // 3️⃣ Pour chaque membre citoyen, ajoute 50$
    for (const [, member] of members) {
      if (member.user.bot) continue;
      if (member.roles.cache.has(CITIZEN_ROLE_ID)) {
        const account = getOrCreateAccount(member.id);
        // on s’assure que le champ existe
        account.courant.liquide = (account.courant.liquide || 0) + 50;
        updateAccount(member.id, account);
        count++;
      }
    }

    // 4️⃣ Retourne le récapitulatif
    await interaction.editReply({
      content: `✅ 50 $ ont été ajoutés en liquide à **${count}** citoyens.`
    });
  }
};