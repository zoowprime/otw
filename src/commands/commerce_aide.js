const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('commerce')
    .setDescription('Commandes commerciales OTW')
    .addSubcommand(sc =>
      sc.setName('aide').setDescription('Afficher la liste complète des commandes')),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('📘 Guide du Commerce OTW')
      .setDescription(
        "Voici les commandes commerciales disponibles :\n\n" +
        "🔫 `/arme import` — Importer une arme (armureries)\n" +
        "🐎 `/cheval import` — Importer un cheval (écuries)\n" +
        "🏷️ `/prix definir` — Définir un prix de vente\n" +
        "🔁 `/prix modifier` — Modifier un prix existant\n" +
        "💸 `/vente [target]` — Vendre un article à un joueur\n" +
        "📦 `/stock voir` — Voir le stock de ton commerce\n" +
        "🗂️ `/catalogue voir` — Voir les stocks publics\n" +
        "⚙️ `/prix reset` — Reset complet des prix (staff)\n\n" +
        "🧾 Chaque transaction est automatiquement loggée et les paiements sont débité/crédités sur les comptes RP correspondants."
      )
      .setFooter({ text: 'OTW Économie — Version immersive' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
