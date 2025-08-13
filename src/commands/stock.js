const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { _stockInternal } = require('../interaction/stockInteraction');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stock')
    .setDescription('Afficher le stock d’un atelier.')
    .addStringOption(o =>
      o.setName('atelier')
        .setDescription('Nom de l’atelier (ex: tetsuironworks)')
        .setRequired(true)
        .addChoices({ name: 'tetsuironworks', value: 'tetsuironworks' })
    ),

  async execute(interaction) {
    const atelier = interaction.options.getString('atelier', true);
    if (atelier !== 'tetsuironworks') {
      return interaction.reply({ content: 'Atelier inconnu.', flags: MessageFlags.Ephemeral });
    }
    const stock = { ..._stockInternal.initAllItems(), ..._stockInternal.loadStock() };
    const embed = _stockInternal.stockToEmbed(stock);

    // Envoie et mémorise pour MAJ live
    const sent = await interaction.reply({ embeds: [embed], fetchReply: true });
    const refs = _stockInternal.loadStockMsg();
    refs[interaction.guildId] = { channelId: sent.channelId, messageId: sent.id };
    _stockInternal.saveStockMsg(refs);
  },
};
