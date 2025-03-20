const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recolte_bois')
    .setDescription('Lance une session de récolte de bois sur 20 minutes (5 unités par minute, max 100 unités).'),
  async execute(interaction) {
    // Assurer l'existence de la map globale pour les sessions de récolte
    global.activeWoodHarvestSessions = global.activeWoodHarvestSessions || new Map();
    const userId = interaction.user.id;

    // Si une session est déjà active pour cet utilisateur, ne pas lancer une nouvelle session
    if (global.activeWoodHarvestSessions.has(userId)) {
      return interaction.reply({ content: "Vous êtes déjà en train de récolter du bois !", ephemeral: true });
    }

    // Créer une nouvelle session de récolte
    const session = {
      total: 0,
      interval: null,
      timeout: null,
      channel: interaction.channel, // le canal où la commande a été lancée
    };
    global.activeWoodHarvestSessions.set(userId, session);

    // Envoyer le message initial dans le canal (visible de tous)
    await interaction.reply({ content: "🪵 Vous commencez à récolter du bois… Cela prendra 20 minutes au total. (Utilisez /stop_recolte pour arrêter à tout moment.)", ephemeral: false });

    // Mettre en place un intervalle qui s'exécute toutes les minutes
    session.interval = setInterval(async () => {
      session.total += 5;
      if (session.total > 100) session.total = 100;
      // Envoyer un message public dans le canal pour afficher la progression
      await session.channel.send(`🪓 <@${userId}> vous avez coupé 5 unités de bois… Total récolté : ${session.total} unités.`);
    }, 60 * 1000); // 1 minute

    // Mettre en place un timeout pour terminer la récolte après 20 minutes
    session.timeout = setTimeout(async () => {
      clearInterval(session.interval);
      await session.channel.send(`✅ <@${userId}> Récolte terminée ! Vous avez obtenu ${session.total} unités de bois.`);
      global.activeWoodHarvestSessions.delete(userId);
    }, 20 * 60 * 1000); // 20 minutes
  },
};
