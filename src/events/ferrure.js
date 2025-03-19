// src/events/ferrure.js
const { EmbedBuilder } = require('discord.js');

// Durée d'intervalle pour l'événement : 7 jours (en millisecondes)
const INTERVAL_7_DAYS = 7 * 24 * 60 * 60 * 1000;

// Vérifier que les variables d'environnement nécessaires sont définies
const citizenRoleId = process.env.CITIZEN_ROLE_ID;
if (!citizenRoleId) {
  console.error("La variable CITIZEN_ROLE_ID n'est pas définie.");
}
const eventChannelId = process.env.EVENT_CHANNEL_ID;
if (!eventChannelId) {
  console.error("La variable EVENT_CHANNEL_ID n'est pas définie.");
}

// Fonction pour sélectionner aléatoirement N citoyens dans le serveur
async function selectRandomCitizens(guild, count) {
  try {
    const members = await guild.members.fetch();
    const citizens = members.filter(member => member.roles.cache.has(citizenRoleId));
    const citizensArray = Array.from(citizens.values());
    const selected = [];
    while (selected.length < count && citizensArray.length > 0) {
      const index = Math.floor(Math.random() * citizensArray.length);
      selected.push(citizensArray[index]);
      citizensArray.splice(index, 1);
    }
    return selected;
  } catch (err) {
    console.error("Erreur lors de la récupération des membres du serveur :", err);
    return [];
  }
}

// Fonction qui déclenche l'événement "Ferrure"
async function triggerFerrureEvent(client) {
  let guild;
  // Si la variable GUILD_ID est définie, l'utiliser pour récupérer le serveur
  if (process.env.GUILD_ID && process.env.GUILD_ID.trim() !== "") {
    try {
      guild = await client.guilds.fetch(process.env.GUILD_ID);
    } catch (err) {
      console.error("Erreur lors de la récupération du serveur via GUILD_ID :", err);
    }
  }
  // Sinon, utiliser le premier serveur du cache
  if (!guild) {
    guild = client.guilds.cache.first();
  }
  if (!guild) {
    console.error("Aucun serveur trouvé.");
    return;
  }

  const eventChannel = guild.channels.cache.get(eventChannelId);
  if (!eventChannel) {
    console.error(`Le salon d'événement (ID: ${eventChannelId}) est introuvable.`);
    return;
  }

  const selectedCitizens = await selectRandomCitizens(guild, 3);
  if (selectedCitizens.length === 0) {
    console.log("Aucun citoyen trouvé pour l'événement Ferrure.");
    return;
  }
  const mentions = selectedCitizens.map(member => `<@${member.id}>`).join(", ");
  const embed = new EmbedBuilder()
    .setColor(0x8B4513) // Couleur marron foncé
    .setTitle("Alerte Ferrure Usée")
    .setDescription("Votre cheval a des fers trop usés ! Rendez-vous chez un maréchal-ferrant sous **48h** pour éviter des blessures graves à votre cheval !")
    .setTimestamp();
  eventChannel.send({ content: mentions, embeds: [embed] });
  console.log(`Événement Ferrure déclenché pour : ${mentions}`);
}

module.exports = (client) => {
  // Optionnel : pour tester immédiatement, décommentez la ligne ci-dessous
  // triggerFerrureEvent(client);

  // Déclencher l'événement toutes les 7 jours
  setInterval(() => {
    triggerFerrureEvent(client);
  }, INTERVAL_7_DAYS);
};
