// src/events/maladies.js
const { EmbedBuilder } = require('discord.js');

// Durée d'intervalle pour 7 jours (en millisecondes)
const INTERVAL_7_DAYS = 7 * 24 * 60 * 60 * 1000; // 604800000 ms

// Liste des virus
const viruses = ["rhume", "angine", "allergie", "grippe"];

// ID du rôle citoyen (à définir dans vos variables d'environnement)
const citoyenRoleId = process.env.CITIZEN_ROLE_ID;
if (!citoyenRoleId) {
  console.error("La variable d'environnement CITIZEN_ROLE_ID n'est pas définie.");
}

// ID du salon où envoyer le message de maladie (à définir dans vos variables d'environnement)
const virusChannelId = process.env.VIRUS_CHANNEL_ID;
if (!virusChannelId) {
  console.error("La variable d'environnement VIRUS_CHANNEL_ID n'est pas définie.");
}

/**
 * Sélectionne aléatoirement un membre du serveur ayant le rôle citoyen.
 * @param {Guild} guild Le serveur Discord.
 * @returns {Promise<GuildMember|null>} Le membre sélectionné ou null s'il n'y en a pas.
 */
async function selectRandomCitizen(guild) {
  let members;
  try {
    members = await guild.members.fetch();
  } catch (err) {
    console.error("Erreur lors de la récupération des membres :", err);
    return null;
  }
  const citizens = members.filter(member => member.roles.cache.has(citoyenRoleId));
  if (citizens.size === 0) {
    console.log("Aucun membre avec le rôle citoyen trouvé.");
    return null;
  }
  const randomIndex = Math.floor(Math.random() * citizens.size);
  return Array.from(citizens.values())[randomIndex];
}

/**
 * Déclenche l'événement maladie.
 */
async function triggerMaladie(client) {
  const guild = client.guilds.cache.first();
  if (!guild) {
    console.error("Aucun serveur trouvé.");
    return;
  }

  const selectedMember = await selectRandomCitizen(guild);
  if (!selectedMember) return;

  const randomVirus = viruses[Math.floor(Math.random() * viruses.length)];

  const embed = new EmbedBuilder()
    .setColor(0x006400) // Vert foncé
    .setTitle("Vous êtes malades !")
    .setDescription(`Vous avez attrapé un(e) **${randomVirus}** ! Consultez vite un médecin, cela pourrait empirer 🦠 ! <@${selectedMember.id}>`)
    .setTimestamp();

  const virusChannel = guild.channels.cache.get(virusChannelId);
  if (!virusChannel) {
    console.error(`Le salon de maladie (ID: ${virusChannelId}) est introuvable.`);
    return;
  }
  virusChannel.send({ embeds: [embed] });
}

module.exports = (client) => {
  // Déclenche l'événement maladie toutes les 7 jours
  setInterval(() => {
    triggerMaladie(client);
  }, INTERVAL_7_DAYS);

  // Optionnel : pour tester immédiatement lors du démarrage
  // triggerMaladie(client);
};
