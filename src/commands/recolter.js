const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const agri = require('../agri/agriRuntime');
const { FIELDS, RAW_ITEMS } = require('../agri/agriCommon');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recolter')
    .setDescription('Démarrer une récolte de 5 minutes (messages toutes les 20s, cap 50).')
    .addStringOption(o =>
      o.setName('champ')
        .setDescription('Sélectionne le champ')
        .setRequired(true)
        .addChoices(...FIELDS.map(f => ({ name: f.label, value: f.key })))
    )
    .addStringOption(o =>
      o.setName('item')
        .setDescription('Item brut à récolter')
        .setRequired(true)
        .addChoices(...RAW_ITEMS.map(n => ({ name: n, value: n })))
    ),

  async execute(interaction) {
    const fieldKey = interaction.options.getString('champ', true);
    const item     = interaction.options.getString('item', true);
    try {
      await agri.startHarvest(interaction.guildId, interaction.user, fieldKey, item);
      await interaction.reply({ content: `🌾 Récolte lancée sur **${item}** (${FIELDS.find(f => f.key===fieldKey).label}).`, flags: MessageFlags.Ephemeral });
    } catch (e) {
      await interaction.reply({ content: `❌ ${e.message}`, flags: MessageFlags.Ephemeral });
    }
  }
};
