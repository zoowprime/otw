// src/commands/activatehabitation.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activatehabitation')
    .setDescription('Accorde à un joueur son droit à une habitation')
    .addUserOption(opt =>
      opt.setName('cible')
         .setDescription('Le joueur qui recevra son habitation')
         .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const BANQUIER_ROLE_ID    = process.env.BANQUIER_ROLE_ID;
    const HABITATION_ROLE_ID = process.env.HABITATION_ROLE;
    if (!interaction.member.roles.cache.has(BANQUIER_ROLE_ID)) {
      return interaction.reply({ content: '❌ Vous n’avez pas le rôle de banquier.', ephemeral: true });
    }
    const target = interaction.options.getMember('cible');
    if (!target) {
      return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
    }

    try {
      await target.roles.add(HABITATION_ROLE_ID);
      await interaction.reply({ content: `✅ ${target} peut désormais gérer son habitation.`, ephemeral: false });
    } catch (err) {
      console.error('activatehabitation error', err);
      await interaction.reply({ content: '❌ Impossible d’ajouter le rôle habitation.', ephemeral: true });
    }
  }
};
