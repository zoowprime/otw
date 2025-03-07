// src/commands/msgembed.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('msgembed')
    .setDescription('Créer un embed personnalisé (réservé au staff).')
    .addStringOption(option =>
      option
        .setName('titre')
        .setDescription('Le titre de l\'embed')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('description')
        .setDescription('La description de l\'embed')
        .setRequired(true)
    ),
  
  async execute(interaction) {
    // Récupérer l'ID du rôle staff depuis les variables d'environnement
    const staffRoleId = process.env.STAFF_ROLE_ID;
    // Vérifier si l'utilisateur possède ce rôle
    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member.roles.cache.has(staffRoleId)) {
      return interaction.reply({
        content: 'Vous n\'avez pas la permission d\'utiliser cette commande (réservée au staff).',
        ephemeral: true
      });
    }

    // Récupérer les options saisies
    const titre = interaction.options.getString('titre');
    const desc = interaction.options.getString('description');

    // Créer l'embed
    const embed = new EmbedBuilder()
      .setTitle(titre)
      .setDescription(desc)
      .setColor(0xff0000); // Couleur rouge

    // Répondre dans le salon
    await interaction.reply({ embeds: [embed] });
  },
};
