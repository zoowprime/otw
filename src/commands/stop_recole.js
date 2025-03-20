const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop_recolte')
    .setDescription('Interrompt votre session de récolte de bois en cours.'),
  async execute(interaction) {
    global.activeWoodHarvestSessions = global.activeWoodHarvestSessions || new Map();
    const userId = interaction.user.id;
    const session = global.activeWoodHarvestSessions.get(userId);
    if (!session) {
      return interaction.reply({ content: "Vous n'avez pas de session de récolte en cours.", ephemeral: true });
    }
    // Arrêter les minuteries
    clearInterval(session.interval);
    clearTimeout(session.timeout);
    // Envoyer un message public indiquant l'interruption et le total récolté
    await session.channel.send(`❌ <@${userId}> vous avez interrompu votre récolte. Total obtenu : ${session.total} unités.`);
    global.activeWoodHarvestSessions.delete(userId);
    await interaction.reply({ content: "Votre session de récolte a été interrompue.", ephemeral: true });
  },
};
