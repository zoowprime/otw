// src/commands/candidature.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('candidature')
    .setDescription('Annonce le résultat d’une candidature')
    .addStringOption(opt =>
      opt
        .setName('resultat')
        .setDescription('Choisissez Validé ou Refusé')
        .setRequired(true)
        .addChoices(
          { name: 'Validé', value: 'validé' },
          { name: 'Refusé', value: 'refusé' }
        )
    )
    .addUserOption(opt =>
      opt
        .setName('candidat')
        .setDescription('La personne dont on annonce le résultat')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('raison')
        .setDescription('Raison de la décision')
        .setRequired(true)
    ),

  async execute(interaction) {
    const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;
    // Vérification permission staff
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: "❌ Vous n'avez pas la permission d'utiliser cette commande.",
        ephemeral: true
      });
    }

    const resultat = interaction.options.getString('resultat');
    const user     = interaction.options.getUser('candidat');
    const reason   = interaction.options.getString('raison');

    // Construction de l'embed
    const embed = new EmbedBuilder()
      .setTitle('Résultat de la candidature')
      .setColor(0xff0000)
      .setDescription(`La candidature de ${user} a été **${resultat}**.`)
      .addFields({ name: 'Raison', value: reason });

    // Si Validé, ajouter le rôle ORAL_A_FAIRE
    if (resultat === 'validé') {
      const roleId = process.env.ORAL_A_FAIRE;
      if (roleId && interaction.guild) {
        try {
          const member = await interaction.guild.members.fetch(user.id);
          await member.roles.add(roleId);
        } catch (err) {
          console.error('Impossible d\'ajouter le rôle ORAL_A_FAIRE :', err);
          // on continue quand même
        }
      }
    }

    await interaction.reply({ embeds: [embed] });
  }
};
