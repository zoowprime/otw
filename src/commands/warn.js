const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Ajoute un rôle warn (1, 2 ou 3) au joueur.')
    .addIntegerOption(option =>
      option.setName('niveau')
        .setDescription('Niveau de warn (1, 2 ou 3)')
        .setRequired(true)
        .addChoices(
          { name: 'Warn 1', value: 1 },
          { name: 'Warn 2', value: 2 },
          { name: 'Warn 3', value: 3 }
        )
    )
    .addUserOption(option =>
      option.setName('target')
        .setDescription('Le joueur à avertir')
        .setRequired(true)
    ),

  async execute(interaction) {
    const niveau = interaction.options.getInteger('niveau');
    const target = interaction.options.getUser('target');

    // Récupérer le membre dans la guilde
    const member = interaction.guild.members.cache.get(target.id) || await interaction.guild.members.fetch(target.id);
    if (!member) {
      return interaction.reply({ content: "Membre introuvable.", ephemeral: true });
    }

    // Mapping des niveaux de warn vers les identifiants de rôle.
    // Veuillez définir les variables d'environnement WARN_1_ROLE_ID, WARN_2_ROLE_ID, WARN_3_ROLE_ID.
    const roleMapping = {
      1: process.env.WARN_1_ROLE_ID,
      2: process.env.WARN_2_ROLE_ID,
      3: process.env.WARN_3_ROLE_ID,
    };

    const roleId = roleMapping[niveau];
    if (!roleId) {
      return interaction.reply({ content: "Rôle non défini pour ce niveau de warn.", ephemeral: true });
    }

    try {
      await member.roles.add(roleId);
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('Avertissement')
        .setDescription(`${target.username} a reçu le warn niveau ${niveau}.`);
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Erreur lors de l'ajout du rôle :", error);
      return interaction.reply({ content: "Une erreur s'est produite lors de l'ajout du rôle.", ephemeral: true });
    }
  }
};
