const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const agri = require('../agri/agriRuntime');
const { FIELDS } = require('../agri/agriCommon');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('finirlivraison')
    .setDescription('Terminer ta livraison en cours (décrémente stock & paie).'),

  async execute(interaction) {
    try {
      const res = await agri.finishDelivery(interaction.guildId, interaction.user);
      const emb = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Livraison complétée')
        .setDescription(
          `**Champ :** ${FIELDS.find(f => f.key===res.fieldKey).label}\n` +
          `**Item :** ${res.item} (transformé)\n` +
          `**Quantité :** ${res.qty}\n` +
          `**Destination :** ${res.dest}\n` +
          `**Paiement :** ${res.amount}$\n` +
          `Stock mis à jour.`
        );

      // Preuve publique
      await interaction.channel.send({ embeds: [emb] }).catch(() => {});
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '👌 Livraison enregistrée.', flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    } catch (e) {
      await interaction.reply({ content: `❌ ${e.message}`, flags: MessageFlags.Ephemeral });
    }
  }
};
