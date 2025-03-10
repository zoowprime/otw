const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fishingSessions } = require('../fishingData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pechetemps')
    .setDescription('Vérifie le temps restant pour la mission de pêche'),
    
  async execute(interaction) {
    const session = fishingSessions.get(interaction.user.id);
    if (!session) {
      // Aucune mission en cours
      const embedNoSession = new EmbedBuilder()
        .setColor(0x00BFFF)
        .setTitle("Pas de mission de pêche")
        .setDescription("Vous n'avez pas de mission de pêche en cours. Utilisez `/debutpeche` pour en commencer une.");
      return interaction.reply({ embeds: [embedNoSession] });
    }
    
    // Calcul du temps écoulé
    const now = Date.now();
    const elapsedMs = now - session.startTime;
    const twentyMinMs = 20 * 60 * 1000; // 20 minutes en millisecondes
    
    if (elapsedMs >= twentyMinMs) {
      // Temps dépassé
      fishingSessions.delete(interaction.user.id); // On supprime la mission
      const embedTimeout = new EmbedBuilder()
        .setColor(0x00BFFF)
        .setTitle("Temps dépassé")
        .setDescription("Vous avez dépassé le temps imparti. Veuillez retourner voir Gus pour une nouvelle mission. 🦈");
      return interaction.reply({ embeds: [embedTimeout] });
    } else {
      // Il reste du temps
      const remainingMs = twentyMinMs - elapsedMs;
      const remainingMin = Math.floor(remainingMs / 60000);
      const remainingSec = Math.floor((remainingMs % 60000) / 1000);
      
      const embedTime = new EmbedBuilder()
        .setColor(0x00BFFF)
        .setTitle("Temps restant")
        .setDescription(
          `Il vous reste **${remainingMin} minutes et ${remainingSec} secondes** pour pêcher le(s) poisson(s) demandé(s).`
        );
      return interaction.reply({ embeds: [embedTime] });
    }
  },
};
