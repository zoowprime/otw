// src/commands/partirenpeche.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreateAccount, updateAccount } = require('../economyData');

// Map pour gérer le cooldown (en mémoire)
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('partirenpeche')
    // Description raccourcie pour respecter la limite de 100 caractères
    .setDescription('Lance une session de pêche de 2h pour ta récompense.'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const now = Date.now();
    const cooldownDuration = 3 * 60 * 60 * 1000; // 3 heures en ms
    const sessionDuration = 2 * 60 * 60 * 1000; // 2 heures en ms

    // Vérifier le cooldown
    if (cooldowns.has(userId)) {
      const expirationTime = cooldowns.get(userId);
      if (now < expirationTime) {
        const remainingMs = expirationTime - now;
        const remainingH = Math.ceil(remainingMs / 3600000);
        return interaction.reply({ content: `Tu dois attendre encore ${remainingH} heure(s) avant de pêcher de nouveau.`, ephemeral: true });
      }
    }

    // Répondre pour confirmer le démarrage de la session
    await interaction.reply({ content: 'Session de pêche lancée ! Attends 2h pour ta récompense.', ephemeral: true });

    // Démarrer le chronomètre de 2 heures
    setTimeout(async () => {
      // Générer un nombre aléatoire de poissons entre 10 et 50
      const fishCount = Math.floor(Math.random() * (50 - 10 + 1)) + 10;
      const reward = parseFloat((fishCount * 0.75).toFixed(2));

      // Mettre à jour le compte courant du joueur (champ liquide)
      const account = getOrCreateAccount(userId);
      account.courant.liquide += reward;
      updateAccount(userId, account);

      // Créer l'embed de récompense (couleur bleu clair)
      const embed = new EmbedBuilder()
        .setColor(0x99ccff)
        .setTitle('Session de pêche terminée')
        .setDescription(
          `Hé le pêcheur <@${userId}> ! On rentre sur les quais, on a attrapé environ **${fishCount} poissons**.\n` +
          `Voici ta récompense : **$${reward.toFixed(2)}** 💸🐳.`
        )
        .setTimestamp();

      try {
        await interaction.channel.send({ embeds: [embed] });
      } catch (err) {
        console.error('Erreur lors de l’envoi du message de récompense :', err);
      }
    }, sessionDuration);

    // Placer l'utilisateur en cooldown pendant 3 heures
    cooldowns.set(userId, now + cooldownDuration);
  }
};
