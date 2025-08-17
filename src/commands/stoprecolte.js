const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const agri = require('../agri/agriRuntime');
const { FIELDS } = require('../agri/agriCommon');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stoprecolte')
    .setDescription('Arrêter ta récolte en cours sur un champ (calc & stock).')
    .addStringOption(o =>
      o.setName('champ')
        .setDescription('Sélectionne le champ')
        .setRequired(true)
        .addChoices(...FIELDS.map(f => ({ name: f.label, value: f.key })))
    ),

  async execute(interaction) {
    const fieldKey = interaction.options.getString('champ', true);
    try {
      await agri.stopHarvest(interaction.guildId, interaction.user, fieldKey);
      await interaction.reply({ content: '✅ Récolte stoppée et enregistrée dans le stock.', flags: MessageFlags.Ephemeral });
    } catch (e) {
      await interaction.reply({ content: `❌ ${e.message}`, flags: MessageFlags.Ephemeral });
    }
  }
};
