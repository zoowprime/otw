// src/commands/raidprotect.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const raidProtect = require('../events/raidProtect');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidprotect')
    .setDescription('Active ou désactive la protection anti-raid')
    .addSubcommand(sc =>
      sc.setName('enable')
        .setDescription('Active la protection anti-raid')
    )
    .addSubcommand(sc =>
      sc.setName('disable')
        .setDescription('Désactive la protection anti-raid')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const choice  = interaction.options.getSubcommand();
    if (choice === 'enable') {
      raidProtect.enable(guildId);
      await interaction.reply({ content: '✅ Protection anti-raid activée.', ephemeral: true });
    } else {
      raidProtect.disable(guildId);
      await interaction.reply({ content: '🔒 Protection anti-raid désactivée.', ephemeral: true });
    }
  }
};
