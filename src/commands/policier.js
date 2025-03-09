// src/commands/policier.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Map pour stocker temporairement l'heure de début de service par utilisateur
const serviceTimes = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('police')
    .setDescription('Commandes de prise de service pour les policiers')
    .addSubcommand(subcommand =>
      subcommand
        .setName('pds')
        .setDescription('Début de prise de service')
        .addStringOption(option =>
          option.setName('heure')
            .setDescription('Heure de début (à saisir manuellement)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('date')
            .setDescription('Date de début (à saisir manuellement)')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('fpds')
        .setDescription('Fin de prise de service et calcul du temps passé')
        .addStringOption(option =>
          option.setName('heure')
            .setDescription('Heure de fin (à saisir manuellement)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('date')
            .setDescription('Date de fin (à saisir manuellement)')
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    // Vérifier que l'utilisateur possède le rôle de policier
    if (!interaction.member.roles.cache.has(process.env.POLICE_ROLE_ID)) {
      return interaction.reply({ content: "Vous n'avez pas la permission d'utiliser cette commande.", ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'pds') {
      // Enregistrement du début de service
      const heure = interaction.options.getString('heure');
      const date = interaction.options.getString('date');
      serviceTimes.set(interaction.user.id, Date.now());
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Prise de service")
        .setDescription(`**Agent :** ${interaction.user}\n**Heure de début :** ${heure}\n**Date de début :** ${date}\n\nPrise de service enregistrée.`);
      return interaction.reply({ embeds: [embed] });
    } 
    else if (subcommand === 'fpds') {
      // Fin de service, calcul du temps écoulé
      const heure = interaction.options.getString('heure');
      const date = interaction.options.getString('date');
      const startTime = serviceTimes.get(interaction.user.id);
      if (!startTime) {
        return interaction.reply({ content: "Aucune prise de service trouvée. Veuillez d'abord utiliser /police pds.", ephemeral: true });
      }
      const endTime = Date.now();
      const diffMs = endTime - startTime;
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);
      // Supprimer la prise de service après usage
      serviceTimes.delete(interaction.user.id);

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Fin de service")
        .setDescription(
          `**Agent :** ${interaction.user}\n` +
          `**Heure de fin :** ${heure}\n` +
          `**Date de fin :** ${date}\n\n` +
          `**Temps passé en service :** ${diffHrs}h ${diffMins}m ${diffSecs}s`
        );
      return interaction.reply({ embeds: [embed] });
    }
  }
};
