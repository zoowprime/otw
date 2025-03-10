const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fishingSessions } = require('../fishingData');
const { getOrCreateAccount, updateAccount } = require('../economyData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('finpeche')
    .setDescription('Termine la mission de pêche et reçoit la rémunération'),
    
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
    
    // Vérification du temps
    const now = Date.now();
    const elapsedMs = now - session.startTime;
    const twentyMinMs = 20 * 60 * 1000; // 20 minutes
    
    if (elapsedMs >= twentyMinMs) {
      // Temps dépassé
      fishingSessions.delete(interaction.user.id);
      const embedTimeout = new EmbedBuilder()
        .setColor(0x00BFFF)
        .setTitle("Temps dépassé")
        .setDescription("Vous avez dépassé le temps imparti. Veuillez retourner voir Gus pour une nouvelle mission. 🦈");
      return interaction.reply({ embeds: [embedTimeout] });
    }
    
    // Temps valide : on calcule la paye
    const totalPrice = session.fishPrice * session.quantity;
    
    // Crédite le compte courant de l'utilisateur
    const account = getOrCreateAccount(interaction.user.id);
    account.courant += totalPrice;
    updateAccount(interaction.user.id, account);
    
    // Supprime la mission
    fishingSessions.delete(interaction.user.id);
    
    // Réponse
    const embed = new EmbedBuilder()
      .setColor(0x00BFFF)
      .setTitle("Mission de pêche terminée")
      .setDescription(
        `Merci d’avoir rempli cette mission !\n` +
        `C’est un plaisir de faire affaire avec toi.\n\n` +
        `Voici tes sous : **$${totalPrice.toFixed(2)}**`
      );
    return interaction.reply({ embeds: [embed] });
  },
};
