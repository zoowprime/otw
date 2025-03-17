// src/commands/chasse.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getOrCreateAccount, updateAccount } = require('../economyData');

// Définition du cooldown et du délai pour la confirmation de la mission
const COOLDOWN = 60 * 60 * 1000; // 1 heure
const CHASE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Liste des animaux avec leurs caractéristiques
const animals = [
  { 
    name: "Cerf de Virginie", 
    habitat: "plaines et forêts denses de Big Valley et Tall Trees", 
    prices: { "état parfait": 7.00, "état bon": 4.20, "état médiocre": 2.80 } 
  },
  { 
    name: "Élan d'Amérique", 
    habitat: "Forêts profondes de Tall Trees et rivières du nord", 
    prices: { "état parfait": 10.00, "état bon": 6.00, "état médiocre": 3.00 } 
  },
  { 
    name: "Sanglier", 
    habitat: "Marais et forêts de Lemoyne", 
    prices: { "état parfait": 5.75, "état bon": 3.45, "état médiocre": 1.75 } 
  },
  { 
    name: "Ours Noir", 
    habitat: "Tall Trees, Big Valley et rivières reculées", 
    prices: { "état parfait": 15.00, "état bon": 8.00, "état médiocre": 4.00 } 
  },
  { 
    name: "Ours Grizzly", 
    habitat: "Montagnes de West Elizabeth, Big Valley et Tall Trees", 
    prices: { "état parfait": 18.00, "état bon": 10.00, "état médiocre": 5.00 } 
  },
  { 
    name: "Loup Gris", 
    habitat: "Tall Trees et montagnes boisées", 
    prices: { "état parfait": 9.00, "état bon": 5.00, "état médiocre": 2.50 } 
  },
  { 
    name: "Bison américain", 
    habitat: "Plaines de West-Elisabeth", 
    prices: { "état parfait": 5.25, "état bon": 3.15, "état médiocre": 2.10 } 
  },
  { 
    name: "Ours noir américain", 
    habitat: "Forêts de Tall Tress", 
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

// Exportation de l'objet commande
module.exports = {
  data: new SlashCommandBuilder()
    .setName('chasse')
    .setDescription('Lance une mission de chasse excitante !.'),
  
  async execute(interaction) {
    const userId = interaction.user.id;

    // Vérification du cooldown
    global.activeChaseMissions = global.activeChaseMissions || new Map();
    const currentMission = global.activeChaseMissions.get(userId);
    if (currentMission && (Date.now() - currentMission.startTime < COOLDOWN)) {
      return interaction.reply({ content: "Tu dois attendre une heure avant de refaire une session de chasse.", ephemeral: true });
    }

    // Génération aléatoire des valeurs
    const count = Math.floor(Math.random() * 3) + 1; // Nombre entre 1 et 3
    const chosenType = types[Math.floor(Math.random() * types.length)]; // "peau" ou "cadavre"
    const animal = animals[Math.floor(Math.random() * animals.length)]; // Animal aléatoire
    const chosenState = states[Math.floor(Math.random() * states.length)]; // État aléatoire

    const missionDescription = `Alors mon ami ? J’aimerai que tu me rapportes **${count} ${chosenType}${count > 1 ? 's' : ''}** de **${animal.name}** en **${chosenState}** venant de **${animal.habitat}**.\nTu as **30 minutes** !`;

    // Calcul du prix unitaire en fonction de l'état
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
        // Envoyer le message de confirmation dans le salon de chasse
        await chasseChannel.send({ content: `<@${userId}>`, embeds: [confirmEmbed], components: [row] });
      } catch (err) {
        console.error("Erreur lors de l'envoi du prompt de confirmation pour la chasse :", err);
      }
    }, CHASE_TIMEOUT);
  }
};
