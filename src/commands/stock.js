const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { _stockInternal } = require('../interaction/stockInteraction');       // armes
const { _horseStockInternal } = require('../interaction/horseStockInteraction'); // chevaux

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stock')
    .setDescription('Afficher le stock d’un atelier/écurie.')
    .addStringOption(o =>
      o.setName('source')
        .setDescription('Sélectionne la source')
        .setRequired(true)
        .addChoices(
          { name: 'tetsuironworks', value: 'tetsuironworks' },
          { name: 'KinumaStable',   value: 'kinuma' }
        )
    ),

  async execute(interaction) {
    const source = interaction.options.getString('source', true);

    if (source === 'tetsuironworks') {
      const stock = { ..._stockInternal.initAllItems(), ..._stockInternal.loadStock() };
      const embed = _stockInternal.stockToEmbed(stock);
      const sent = await interaction.reply({ embeds: [embed], fetchReply: true });
      const refs = _stockInternal.loadStockMsg();
      refs[interaction.guildId] = { channelId: sent.channelId, messageId: sent.id };
      _stockInternal.saveStockMsg(refs);
      return;
    }

    if (source === 'kinuma') {
      const stock = { ..._horseStockInternal.initAllHorses(), ..._horseStockInternal.loadStock() };
      const embed = _horseStockInternal.stockToEmbed(stock);
      const sent = await interaction.reply({ embeds: [embed], fetchReply: true });
      const refs = _horseStockInternal.loadStockMsg();
      refs[interaction.guildId] = { channelId: sent.channelId, messageId: sent.id };
      _horseStockInternal.saveStockMsg(refs);
      return;
    }

    return interaction.reply({ content: 'Source inconnue.', flags: MessageFlags.Ephemeral });
  },
};
