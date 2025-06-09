module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isButton()) return;

    const [action, type, userId] = interaction.customId.split('_');
    if (action !== 'aliment') return;

    if (interaction.user.id !== userId) {
      return interaction.reply({
        content: "❌ Ce bouton ne t'est pas destiné.",
        ephemeral: true
      });
    }

    // Modifier les stats en mémoire
    const alimentation = require('./alimentationSystem');
    alimentation.restoreStat(userId, type);

    await interaction.reply({
      content: `✅ Tu as bien ${type === 'faim' ? 'mangé' : 'bu'} ${type === 'faim' ? '🌮' : '🫗'} !`,
      ephemeral: true
    });

    const row = interaction.message.components[0];
    row.components[0].setDisabled(true);
    await interaction.message.edit({ components: [row] });
  }
};
