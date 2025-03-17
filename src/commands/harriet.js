// src/commands/harriet.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const MISSION_DURATION = 30 * 60 * 1000; // 30 minutes

// Listes pour la génération aléatoire
const locations = [
  "Le bayou",
  "Les forêts près de Rhodes",
  "Les plaines près de Rhodes",
  "Les plaines de West-Elizabeth",
  "Les forêts de Tall Trees"
];

const remedySets = [
  {
    remedy: "Tonique Revitalisant (Redonne de l’énergie et combat la fatigue extrême)",
    plants: [
      "Ginseng Américain (Booste l’immunité et la vitalité)",
      "Racine de Bardane (Détoxifie le foie et purifie le sang)",
      "Café Sauvage (Stimulant physique et mental)"
    ]
  },
  {
    remedy: "Baume Cicatrisant (Accélère la guérison des blessures et réduit le risque d’infection)",
    plants: [
      "Aunée (Antiseptique naturel et cicatrisant puissant)",
      "Sauge (Effet anti-inflammatoire et antiseptique)",
      "Lavande (Apaise les brûlures et réduit les irritations)"
    ]
  },
  {
    remedy: "Infusion Calmante (Réduit l’anxiété, améliore le sommeil et calme les douleurs)",
    plants: [
      "Camomille Sauvage (Apaisant naturel pour le système nerveux)",
      "Menthe Sauvage (Aide à la digestion et aux maux d’estomac)",
      "Lavande (Diminue le stress et améliore le sommeil)"
    ]
  },
  {
    remedy: "Antidote & Détoxifiant (Contre les poisons légers et nettoie le sang des toxines)",
    plants: [
      "Datura (Propriétés anesthésiantes et légères hallucinations)",
      "Camomille Sauvage (Relaxant naturel)",
      "Baies de Houx de l’Ouest (Anti-douleur naturel)"
    ]
  },
  {
    remedy: "Baume Articulaire (Réduit les douleurs musculaires et articulaires)",
    plants: [
      "Chardon Bénit (Aide contre les infections et élimine les toxines)",
      "Prêle des Champs (Utilisé pour purifier les reins et le foie)",
      "Menthe Sauvage (Aide à la digestion et aux maux de ventre)"
    ]
  },
  {
    remedy: "Écorce de Saule (Contient une substance proche de l’aspirine)",
    plants: [
      "Baies de Houx de l’Ouest (Anti-inflammatoire puissant)",
      "Sauge (Effet apaisant sur les douleurs)",
      "Menthe Sauvage (Aide à la digestion)"
    ]
  }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('harriet')
    .setDescription('Lance une mission de récolte de plantes médicinales.'),
  async execute(interaction) {
    const userId = interaction.user.id;
    // Initialiser la map globale des missions Harriet si elle n'existe pas
    global.activeHarrietMissions = global.activeHarrietMissions || new Map();
    
    // Si une mission est déjà active pour cet utilisateur, prévenir
    if (global.activeHarrietMissions.has(userId)) {
      return interaction.reply({ content: "Tu as déjà une mission en cours. Utilise /harriettemps pour voir le temps restant ou /finharriet pour la terminer.", ephemeral: true });
    }
    
    // Génération aléatoire de la mission
    const location = locations[Math.floor(Math.random() * locations.length)];
    const remedySet = remedySets[Math.floor(Math.random() * remedySets.length)];
    
    const missionDescription = `Bonjour monsieur le médecin 🙌 ! Vous venez me voir secrètement pour mon charme ? Orgh... vous venez uniquement pour la récolte de plantes médicinales... je vois.\n\nAllez en chercher dans **${location}** pour que je vous fabrique un **${remedySet.remedy}** ; pour cela il me faut ces trois plantes :\n• ${remedySet.plants[0]}\n• ${remedySet.plants[1]}\n• ${remedySet.plants[2]}\n\nRevenez me voir dans 20 minutes alors avec vos plantes 🌱`;
    
    const embed = new EmbedBuilder()
      .setColor(0xff69b4) // Rose
      .setTitle("Mission de Récolte de Plantes Médicinales Sakura")
      .setDescription(missionDescription);
    
    // Sauvegarder la mission pour cet utilisateur
    const missionData = {
      userId,
      location,
      remedySet,
      startTime: Date.now(),
      completed: false,
      timeout: null
    };
    global.activeHarrietMissions.set(userId, missionData);
    
    // Répondre à l'interaction en envoyant l'embed
    await interaction.reply({ embeds: [embed] });
    
    // Démarrer un chronomètre de 30 minutes pour terminer la mission
    missionData.timeout = setTimeout(async () => {
      if (!missionData.completed) {
        global.activeHarrietMissions.delete(userId);
        const timeoutEmbed = new EmbedBuilder()
          .setColor(0xff69b4)
          .setTitle("Mission annulée")
          .setDescription("Il en met du temps, je suis lassée. Il n’aura qu’à repasser me voir plus tard 😒");
        try {
          await interaction.followUp({ embeds: [timeoutEmbed] });
        } catch (err) {
          console.error("Erreur lors de l'envoi du message de timeout :", err);
        }
      }
    }, MISSION_DURATION);
  }
};
