// src/commands/transformer.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const agri = require('../agri/agriRuntime');
const { FIELDS, RAW_ITEMS } = require('../agri/agriCommon');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transformer')
    .setDescription('Démarrer une transformation (tick 20s, sans limite) — s’arrête avec /stoptransform.')
    .addStringOption(o =>
      o.setName('champ')
        .setDescription('Sélectionne le champ')
        .setRequired(true)
        .addChoices(...FIELDS.map(f => ({ name: f.label, value: f.key })))
    )
    .addStringOption(o =>
      o.setName('item')
        .setDescription('Item brut à transformer')
        .setRequired(true)
        .addChoices(...RAW_ITEMS.map(n => ({ name: n, value: n })))
    ),

  async execute(interaction) {
    const fieldKey = interaction.options.getString('champ', true);
    const item     = interaction.options.getString('item', true);
    try {
      await agri.startTransform(interaction.guildId, interaction.user, fieldKey, item);
      await interaction.reply({
        content: `⚙️ Transformation lancée sur **${item}** (${FIELDS.find(f => f.key===fieldKey).label}).`,
        flags: MessageFlags.Ephemeral
      });
    } catch (e) {
      await interaction.reply({ content: `❌ ${e.message}`, flags: MessageFlags.Ephemeral });
    }
  }
};
