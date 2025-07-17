// src/commands/perquisition.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { getHabitation, updateHabitation } = require('../data/habitationData');
const { getOrCreateAccount, updateAccount } = require('../economyData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('perquisition')
    .setDescription('Perquisitionne l’habitation d’un joueur et récupère tout l’argent et objets.')
    .addUserOption(opt =>
      opt
        .setName('cible')
        .setDescription('Le joueur dont on perquisitionne l’habitation')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction) {
    const PERQ_ROLE = process.env.PERQUISITION_ROLE;
    // Vérifie si l’auteur a le rôle perquisition
    if (!interaction.member.roles.cache.has(PERQ_ROLE)) {
      return interaction.reply({
        content: '❌ Vous n’avez pas la permission de perquisitionner une habitation.',
        ephemeral: true
      });
    }

    const target = interaction.options.getUser('cible');
    if (!target) {
      return interaction.reply({ content: '❌ Utilisateur introuvable.', ephemeral: true });
    }

    // Récupère habitation et compte
    const hab    = getHabitation(target.id);
    const amount = hab.argent;
    const items  = { ...hab.items };

    // Vide l’habitation
    hab.argent = 0;
    hab.items  = {};
    updateHabitation(target.id, hab);

    // Créditer l’argent au perquisiteur
    const officerId = interaction.user.id;
    const officerAcc = getOrCreateAccount(officerId);
    officerAcc.courant.liquide += amount;
    updateAccount(officerId, officerAcc);

    // Prépare l’embed de retour
    const embed = new EmbedBuilder()
      .setTitle('Perquisition effectuée 🔍')
      .setColor(0xff0000)
      .setDescription(`Vous avez perquisitionné l’habitation de ${target}.`)
      .addFields(
        { name: '💰 Argent récupéré', value: `${amount}$`, inline: true },
        { 
          name: '📦 Objets confisqués', 
          value: Object.keys(items).length
            ? Object.entries(items)
                .map(([it, q]) => `${q} × ${it}`)
                .join('\n')
            : 'Aucun objet',
          inline: false
        }
      );

    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};
