const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const agri = require('../agri/agriRuntime');
const { FIELDS, REF_ITEMS } = require('../agri/agriCommon');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('livrer')
    .setDescription('Démarrer une livraison (réservation) d’items transformés.')
    .addStringOption(o =>
      o.setName('champ')
        .setDescription('Sélectionne le champ')
        .setRequired(true)
        .addChoices(...FIELDS.map(f => ({ name: f.label, value: f.key })))
    )
    .addStringOption(o =>
      o.setName('item')
        .setDescription('Item transformé à livrer')
        .setRequired(true)
        .addChoices(...REF_ITEMS.map(n => ({ name: n, value: n })))
    )
    .addIntegerOption(o =>
      o.setName('quantite')
        .setDescription('Quantité à livrer (<= stock transformé)')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const fieldKey = interaction.options.getString('champ', true);
    const item     = interaction.options.getString('item', true);
    const qty      = interaction.options.getInteger('quantite', true);

    try {
      const pending = await agri.startDelivery(interaction.guildId, interaction.user, fieldKey, item, qty);

      const emb = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🚚 Livraison assignée')
        .setDescription(
          `**Champ :** ${FIELDS.find(f => f.key===fieldKey).label}\n` +
          `**Item :** ${item} (transformé)\n` +
          `**Quantité :** ${qty}\n` +
          `**Destination :** ${pending.dest}\n\n` +
          `Utilise **/finirlivraison** quand c’est livré.`
        );

      await interaction.reply({ embeds: [emb], flags: MessageFlags.Ephemeral });
    } catch (e) {
      await interaction.reply({ content: `❌ ${e.message}`, flags: MessageFlags.Ephemeral });
    }
  }
};
