const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const agri = require('../agri/agriRuntime');
const { FIELDS } = require('../agri/agriCommon');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stoptransform')
    .setDescription('Arrêter ta transformation en cours sur un champ (convertit au possible).')
    .addStringOption(o =>
      o.setName('champ')
        .setDescription('Sélectionne le champ')
        .setRequired(true)
        .addChoices(...FIELDS.map(f => ({ name: f.label, value: f.key })))
    ),

  async execute(interaction) {
    const fieldKey = interaction.options.getString('champ', true);
    try {
      await agri.stopTransform(interaction.guildId, interaction.user, fieldKey);
      await interaction.reply({ content: '✅ Transformation stoppée et stock mis à jour.', flags: MessageFlags.Ephemeral });
    } catch (e) {
      await interaction.reply({ content: `❌ ${e.message}`, flags: MessageFlags.Ephemeral });
    }
  }
};
