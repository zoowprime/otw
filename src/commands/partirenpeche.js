// src/commands/partirenpeche.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreateAccount, updateAccount } = require('../economyData');

// Utilisation d'une Map pour gérer le cooldown en mémoire (non persistant)
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('partirenpeche')
    .setDescription('Lance une session de pêche sur le bateau. La session dure 2 heures et tu recevras ta récompense ensuite.'),
  
  async execute(interaction) {
    const userId = interaction.user.id;
    const now = Date.now();

    // Vérifier le cooldown : 3 heures = 10800000 ms
    if (cooldowns.has(userId)) {
      const expirationTime = cooldowns.get(userId);
      if (now < expirationTime) {
        const remainingMs = expirationTime - now;
        const remainingH = Math.ceil(remainingMs / 3600000);
        return interaction.reply({ content: `Tu dois attendre encore ${remainingH} heure(s) avant de lancer une nouvelle session de pêche.`, ephemeral: true });
      }
    }

    // Répondre immédiatement pour confirmer le démarrage de la session
    await interaction.reply({ content: 'La session de pêche a commencé ! Attends 2 heures pour ta récompense.', ephemeral: true });

    // Démarrer le chronomètre de 2 heures (7200000 ms)
    setTimeout(async () => {
      // Générer un nombre aléatoire de poissons entre 10 et 50
      const fishCount = Math.floor(Math.random() * (50 - 10 + 1)) + 10;
      const fishPrice = 0.75;
      const reward = parseFloat((fishCount * fishPrice).toFixed(2));

      // Mise à jour du compte courant (champ liquide) du joueur
      const account = getOrCreateAccount(userId);
      // On suppose que la structure du compte courant est : account.courant.liquide, account.courant.banque
      account.courant.liquide += reward;
      updateAccount(userId, account);

      // Créer l'embed de récompense (couleur bleu clair)
      const embed = new EmbedBuilder()
        .setColor(0x99ccff)
        .setTitle('Session de pêche terminée')
        .setDescription(`Hé le pêcheur <@${userId}> ! On rentre sur les quais, les filets sont presque pleins à craquer.\nOn a attrapé environ **${fishCount} poissons**.\nEn attendant, voici ton argent : **$${reward.toFixed(2)}** 💸🐳.`)
        .setTimestamp();

      // Envoyer l'embed dans le même salon que la commande (ou modifiez pour un salon dédié)
      try {
        await interaction.channel.send({ embeds: [embed] });
      } catch (err) {
        console.error('Erreur lors de l’envoi du message de récompense :', err);
      }
    }, 7200000); // 2 heures en millisecondes

    // Placer l'utilisateur en cooldown pour 3 heures (10800000 ms)
    cooldowns.set(userId, now + 10800000);
  }
};
