const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getOrCreateAccount, updateAccount } = require('../economyData');

// Cooldown de 1 heure pour empêcher une réutilisation trop fréquente
const COOLDOWN = 60 * 60 * 1000;
// Délai pour confirmer la mission : 30 minutes
const CHASE_TIMEOUT = 30 * 60 * 1000;

// Liste des animaux avec leurs caractéristiques
const animals = [
  { 
    name: "Cerf de Virginie", 
    habitat: "Forêts et plaines de Lemoyne et New Hanover", 
    prices: { "état parfait": 7.00, "état bon": 4.20, "état médiocre": 2.80 } 
  },
  { 
    name: "Bouc à queue blanche", 
    habitat: "Régions montagneuses et collines de New Hanover", 
    prices: { "état parfait": 10.00, "état bon": 6.00, "état médiocre": 4.00 } 
  },
  { 
    name: "Sanglier", 
    habitat: "Marais et forêts de Lemoyne", 
    prices: { "état parfait": 5.75, "état bon": 3.45, "état médiocre": 1.75 } 
  },
  { 
    name: "Lapin Blacktail", 
    habitat: "Zones boisées et prairies de New Hanover", 
    prices: { "état parfait": 3.50, "état bon": 2.10, "état médiocre": 1.40 } 
  },
  { 
    name: "Loup gris", 
    habitat: "Régions boisées de New Hanover", 
    prices: { "état parfait": 5.25, "état bon": 3.15, "état médiocre": 2.10 } 
  },
  { 
    name: "Mouflon d'Amérique des montagnes Rocheuses", 
    habitat: "Régions montagneuses de New Hanover", 
    prices: { "état parfait": 7.50, "état bon": 4.50, "état médiocre": 3.00 } 
  },
  { 
    name: "Bison américain", 
    habitat: "Plaines de New Hanover", 
    prices: { "état parfait": 5.25, "état bon": 3.15, "état médiocre": 2.10 } 
  },
  { 
    name: "Ours noir américain", 
    habitat: "Forêts de New Hanover", 
    prices: { "état parfait": 3.50, "état bon": 2.10, "état médiocre": 1.40 } 
  },
  { 
    name: "Cougar", 
    habitat: "Régions rocheuses et forêts de New Hanover", 
    prices: { "état parfait": 13.50, "état bon": 8.10, "état médiocre": 5.40 } 
  },
  { 
    name: "Panthère", 
    habitat: "Marais de Lemoyne", 
    prices: { "état parfait": 14.00, "état bon": 8.40, "état médiocre": 5.60 } 
  },
  { 
    name: "Raton laveur nord-américain", 
    habitat: "Forêts et zones humides de Lemoyne et New Hanover", 
    prices: { "état parfait": 2.50, "état bon": 1.50, "état médiocre": 1.00 } 
  },
  { 
    name: "Opossum de Virginie", 
    habitat: "Zones boisées de Lemoyne", 
    prices: { "état parfait": 2.10, "état bon": 1.25, "état médiocre": 0.75 } 
  }
];

// Options aléatoires pour le type de récolte et l'état
const types = ["peau", "cadavre"];
const states = ["état parfait", "état bon", "état médiocre"];

// Exportation de la commande /chasse
module.exports = (client) => {
  // Création de la commande slash
  const data = new SlashCommandBuilder()
    .setName('chasse')
    .setDescription('Lance une session de chasse sur bateau.');

  // Enregistrement dans la collection des commandes
  client.commands = client.commands || new Map();
  client.commands.set(data.name, { data, execute });

  // Fonction d'exécution de la commande /chasse
  async function execute(interaction) {
    const userId = interaction.user.id;

    // Vérification du cooldown
    if (global.activeChaseMissions && global.activeChaseMissions.has(userId)) {
      const mission = global.activeChaseMissions.get(userId);
      if (Date.now() - mission.startTime < COOLDOWN) {
        return interaction.reply({ content: "Tu dois attendre une heure avant de refaire une session de chasse.", ephemeral: true });
      }
    } else {
      global.activeChaseMissions = new Map();
    }

    // Génération aléatoire des valeurs
    const count = Math.floor(Math.random() * 3) + 1; // Entre 1 et 3
    const chosenType = types[Math.floor(Math.random() * types.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const chosenState = states[Math.floor(Math.random() * states.length)];

    const missionDescription = `Alors mon ami ? J’aimerai que tu me rapportes **${count} ${chosenType}${count > 1 ? 's' : ''}** de **${animal.name}** en **${chosenState}** venant de **${animal.habitat}**.\nTu as **30 minutes** !`;

    // Calcul du prix unitaire en fonction de l'état de l'animal
    const rewardUnit = animal.prices[chosenState];

    // Sauvegarder la mission pour cet utilisateur
    const missionData = {
      userId,
      count,
      chosenType,
      animal,
      chosenState,
      rewardUnit,
      startTime: Date.now(),
      completed: false,
    };
    global.activeChaseMissions.set(userId, missionData);

    // Création de l'embed de mission
    const embed = new EmbedBuilder()
      .setColor(0x66ccff) // Bleu clair
      .setTitle("Mission de chasse sur bateau")
      .setDescription(missionDescription)
      .setFooter({ text: "Réponds dans 30 minutes en utilisant le prompt qui suivra." });

    // Récupérer le salon de chasse via la variable d'environnement CHASSE_CHANNEL_ID
    const chasseChannelId = process.env.CHASSE_CHANNEL_ID;
    if (!chasseChannelId) {
      return interaction.reply({ content: "La variable CHASSE_CHANNEL_ID n'est pas définie.", ephemeral: true });
    }
    const chasseChannel = interaction.guild.channels.cache.get(chasseChannelId);
    if (!chasseChannel) {
      return interaction.reply({ content: "Salon de chasse introuvable.", ephemeral: true });
    }

    try {
      await chasseChannel.send({ embeds: [embed] });
      await interaction.reply({ content: "Mission de chasse lancée dans le salon Partir en Chasse.", ephemeral: true });
    } catch (err) {
      console.error("Erreur lors de l'envoi de la mission de chasse :", err);
      return interaction.reply({ content: "Erreur lors de l'envoi de la mission de chasse.", ephemeral: true });
    }

    // Démarrer un chronomètre de 30 minutes pour demander la confirmation de la mission
    setTimeout(async () => {
      const mission = global.activeChaseMissions.get(userId);
      if (!mission || mission.completed) return;

      const confirmEmbed = new EmbedBuilder()
        .setColor(0x66ccff)
        .setTitle("Mission terminée ?")
        .setDescription("As-tu accompli ta mission ?");
      const yesButton = new ButtonBuilder()
        .setCustomId(`chasse_yes_${userId}`)
        .setLabel('✅ Oui')
        .setStyle(ButtonStyle.Success);
      const noButton = new ButtonBuilder()
        .setCustomId(`chasse_no_${userId}`)
        .setLabel('❌ Non')
        .setStyle(ButtonStyle.Danger);
      const row = new ActionRowBuilder().addComponents(yesButton, noButton);

      try {
        await chasseChannel.send({ content: `<@${userId}>`, embeds: [confirmEmbed], components: [row], ephemeral: true });
      } catch (err) {
        console.error("Erreur lors de l'envoi du prompt de confirmation pour la chasse :", err);
      }
    }, CHASE_TIMEOUT);
  }

  // Gestion des interactions pour les boutons de la mission de chasse
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId.startsWith('chasse_yes_') || interaction.customId.startsWith('chasse_no_')) {
      const parts = interaction.customId.split('_');
      const targetId = parts[2];
      if (interaction.user.id !== targetId) {
        return interaction.reply({ content: "Tu n'es pas autorisé à répondre à cette mission.", ephemeral: true });
      }
      const mission = global.activeChaseMissions.get(targetId);
      if (!mission) {
        return interaction.reply({ content: "Aucune mission active trouvée.", ephemeral: true });
      }
      if (interaction.customId.startsWith('chasse_yes_')) {
        const totalReward = mission.rewardUnit * mission.count;
        const account = getOrCreateAccount(targetId);
        account.courant += totalReward;
        updateAccount(targetId, account);
        mission.completed = true;
        global.activeChaseMissions.delete(targetId);
        return interaction.reply({ content: `Parfait, voici ton argent 💰 $${totalReward.toFixed(2)} ajouté à ton compte courant.`, ephemeral: true });
      } else if (interaction.customId.startsWith('chasse_no_')) {
        global.activeChaseMissions.delete(targetId);
        return interaction.reply({ content: "Dommage pour toi, réessaie plus tard.", ephemeral: true });
      }
    }
  });
};
