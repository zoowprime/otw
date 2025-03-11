// src/events/missionSystem.js
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { getOrCreateAccount, updateAccount } = require('../economyData');

// Durée entre les missions (2 heures en millisecondes)
const MISSION_INTERVAL = 2 * 60 * 60 * 1000;
// Timeout d'acceptation de la mission : 15 minutes
const ACCEPT_TIMEOUT = 15 * 60 * 1000;

// Retourne une durée aléatoire de mission entre 20 et 35 minutes (en millisecondes)
function getMissionDuration() {
  return (Math.floor(Math.random() * (35 - 20 + 1)) + 20) * 60 * 1000;
}

// Liste des missions avec leur récompense
const missions = [
  { text: "Voler une diligence à Saint-Denis et la rapporter à Van Horn", reward: 13 },
  { text: "Aller chez le receleur de Rhodes et apporter les couteaux de lancer au commerçant de Saint Denis", reward: 6 },
  { text: "Fouiller les conteneurs des quais de Saint-Denis pendant 5 minutes et rapporter les objets trouvés à l’usine pétrolière de New-Hanover", reward: 16 },
  { text: "Distribuer les télégrammes du bureau de poste de Rhodes au bureau de poste de Annesburg", reward: 11 },
  { text: "Brûler les champs du manoir Caliga Hall et s’enfuir discrètement", reward: 22 },
  { text: "Piller une tombe de Saint Denis", reward: 6 },
  { text: "Piller une tombe de Rhodes", reward: 3.50 },
  { text: "Aider une dame en détresse devant le poste de police de Saint-Denis en distribuant sa lettre au saloon de Van Horn", reward: 4.50 },
  { text: "Piller trois tombes du cimetière de Saint-Denis et apporter les objets trouvés au receleur de Rhodes", reward: 18 },
  { text: "Aller chez le commerçant de Saint-Denis et apporter les graines de plantation au manoir Caliga Hall", reward: 3 },
  { text: "Aller au manoir Caliga Hall et s’occuper des chevaux", reward: 7.50 }
];

// ID du salon où les missions seront publiées (défini via la variable d'environnement MISSION_CHANNEL_ID ou en dur)
const missionChannelId = process.env.MISSION_CHANNEL_ID || '123456789012345678';

// Variable globale pour stocker la mission active
let activeMission = null;

/**
 * Déclenche une nouvelle mission.
 */
async function triggerMission(client) {
  // Choisir une mission aléatoirement
  const mission = missions[Math.floor(Math.random() * missions.length)];
  activeMission = { mission, acceptedBy: null, message: null, timeoutAccept: null, timeoutMission: null };

  // Créer l'embed de mission
  const embed = new EmbedBuilder()
    .setColor(0xffcc00)
    .setTitle("📌 Voici une nouvelle mission pour le citoyen le plus rapide !")
    .setDescription(mission.text)
    .setFooter({ text: `Récompense : $${mission.reward.toFixed(2)}` });

  // Créer le bouton d'acceptation
  const acceptButton = new ButtonBuilder()
    .setCustomId('mission_accept')
    .setLabel('✅ Accepter la mission')
    .setStyle(ButtonStyle.Primary);
  const row = new ActionRowBuilder().addComponents(acceptButton);

  // Récupérer le salon de mission depuis le serveur
  const guild = client.guilds.cache.first();
  if (!guild) {
    console.error("Aucun serveur trouvé.");
    return;
  }
  const missionChannel = guild.channels.cache.get(missionChannelId);
  if (!missionChannel) {
    console.error(`Le salon de mission (ID: ${missionChannelId}) est introuvable.`);
    return;
  }

  try {
    const missionMsg = await missionChannel.send({ embeds: [embed], components: [row] });
    activeMission.message = missionMsg;
  } catch (err) {
    console.error("Erreur lors de l'envoi de la mission :", err);
    activeMission = null;
    return;
  }

  // Si aucune acceptation n'est faite dans 15 minutes, supprimer le message et annuler la mission
  activeMission.timeoutAccept = setTimeout(async () => {
    if (!activeMission.acceptedBy) {
      try {
        await activeMission.message.delete();
      } catch (err) {
        console.error("Erreur lors de la suppression du message de mission non acceptée :", err);
      }
      activeMission = null;
    }
  }, ACCEPT_TIMEOUT);
}

/**
 * Configure l'écoute des interactions liées aux missions.
 */
function setupMissionInteractions(client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // Bouton "Accepter la mission"
    if (interaction.customId === 'mission_accept') {
      if (!activeMission || activeMission.acceptedBy) {
        return interaction.reply({ content: "Cette mission n'est plus disponible.", ephemeral: true });
      }
      activeMission.acceptedBy = interaction.user.id;
      if (activeMission.timeoutAccept) clearTimeout(activeMission.timeoutAccept);
      try {
        await interaction.message.delete();
      } catch (err) {
        console.error("Erreur lors de la suppression du message de mission acceptée :", err);
      }
      await interaction.reply({ content: "Mission acceptée ! Ton temps démarre maintenant.", ephemeral: true });

      // Démarrer le chronomètre de mission (durée aléatoire entre 20 et 35 minutes)
      const missionDuration = getMissionDuration();
      activeMission.timeoutMission = setTimeout(async () => {
        // Créer l'embed de confirmation de mission
        const confirmEmbed = new EmbedBuilder()
          .setColor(0x66ccff)
          .setTitle("Mission terminée ?")
          .setDescription("Avez-vous accompli votre mission ?");
        const yesButton = new ButtonBuilder()
          .setCustomId('mission_yes')
          .setLabel('✅ Oui')
          .setStyle(ButtonStyle.Success);
        const noButton = new ButtonBuilder()
          .setCustomId('mission_no')
          .setLabel('❌ Non')
          .setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(yesButton, noButton);
        try {
          await interaction.channel.send({ content: `<@${activeMission.acceptedBy}>`, embeds: [confirmEmbed], components: [row] });
        } catch (err) {
          console.error("Erreur lors de l'envoi du message de confirmation de mission :", err);
        }
      }, missionDuration);
    }
    // Bouton "✅ Oui" pour confirmer la réussite de la mission
    else if (interaction.customId === 'mission_yes') {
      if (!activeMission || interaction.user.id !== activeMission.acceptedBy) {
        return interaction.reply({ content: "Vous n'êtes pas autorisé à répondre à cette mission.", ephemeral: true });
      }
      const reward = activeMission.mission.reward;
      const account = getOrCreateAccount(interaction.user.id);
      // Ajouter la récompense au champ liquide du compte courant
      account.courant.liquide += reward;
      updateAccount(interaction.user.id, account);
      await interaction.reply({ content: `Parfait, voici ton argent 💰 $${reward.toFixed(2)} ajouté à ton compte courant.`, ephemeral: true });
      activeMission = null;
    }
    // Bouton "❌ Non" pour refuser la réussite
    else if (interaction.customId === 'mission_no') {
      if (!activeMission || interaction.user.id !== activeMission.acceptedBy) {
        return interaction.reply({ content: "Vous n'êtes pas autorisé à répondre à cette mission.", ephemeral: true });
      }
      await interaction.reply({ content: "Dommage pour toi l’ami(e), tu ne recevras pas ton argent ❌", ephemeral: true });
      activeMission = null;
    }
  });
}

module.exports = (client) => {
  // Déclencher immédiatement une mission, puis toutes les 2 heures si aucune mission active n'est en cours
  triggerMission(client);
  setInterval(() => {
    if (!activeMission) {
      triggerMission(client);
    }
  }, MISSION_INTERVAL);

  // Configurer l'écoute des interactions liées aux missions
  setupMissionInteractions(client);
};
