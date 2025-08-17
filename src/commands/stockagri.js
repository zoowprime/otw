const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { loadStock, loadStockMsgMap, saveStockMsgMap } = require('../agri/agriStorage');
const { FIELDS, stockEmbed } = require('../agri/agriCommon');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stockagri')
    .setDescription('Afficher et “brancher” le stock live d’un champ.')
    .addStringOption(o =>
      o.setName('champ')
        .setDescription('Sélectionne le champ')
        .setRequired(true)
        .addChoices(...FIELDS.map(f => ({ name: f.label, value: f.key })))
    ),

  async execute(interaction) {
    const fieldKey = interaction.options.getString('champ', true);
    const stock = loadStock(fieldKey);
    const embed = stockEmbed(fieldKey, stock);

    const sent = await interaction.reply({ embeds: [embed], fetchReply: true });
    const map = loadStockMsgMap();
    if (!map[interaction.guildId]) map[interaction.guildId] = {};
    map[interaction.guildId][fieldKey] = { channelId: sent.channelId, messageId: sent.id };
    saveStockMsgMap(map);
  }
};
