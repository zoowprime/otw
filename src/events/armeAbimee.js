// src/events/armeAbimee.js
const { EmbedBuilder } = require('discord.js');

// Durée d'intervalle pour l'événement : 7 jours en millisecondes
const INTERVAL_7_DAYS = 7 * 24 * 60 * 60 * 1000; // 604800000 ms

// Récupération de l'ID du rôle citoyen depuis les variables d'environnement
const citizenRoleId = process.env.CITIZEN_ROLE_ID;
if (!citizenRoleId) {
  console.error("La variable d'environnement CITIZEN_ROLE_ID n'est pas définie.");
}

// Récupération de l'ID du salon d'événement Arme depuis les variables d'environnement
const eventArmeChannelId = process.env.EVENT_ARME_CHANNEL_ID;
if (!eventArmeChannelId) {
  console.error("La variable d'environnement EVENT_ARME_CHANNEL_ID n'est pas définie.");
}

/**
 * Sélectionne aléatoirement N membres du serveur ayant le rôle citoyen.
 * @param {Guild} guild Le serveur Discord.
 * @param {number} count Le nombre de membres à sélectionner.
 * @returns {Promise<GuildMember[]>} Les membres sélectionnés.
 */
async function selectRandomCitizens(guild, count) {
  try {
    const members = await guild.members.fetch();
    const citizens = members.filter(member => member.roles.cache.has(citizenRoleId));
    if (citizens.size === 0) {
      console.log("Aucun citoyen trouvé pour l'événement Arme.");
      return [];
    }
    const citizensArray = Array.from(citizens.values());
    const selected = [];
    while (selected.length < count && citizensArray.length > 0) {
      const index = Math.floor(Math.random() * citizensArray.length);
      selected.push(citizensArray[index]);
      citizensArray.splice(index, 1);
    }
    return selected;
  } catch (err) {
    console.error("Erreur lors de la récupération des membres :", err);
    return [];
  }
}

/**
 * Déclenche l'événement "Arme Abîmée".
 * Sélectionne 3 citoyens et envoie un message dans le salon d'événement Arme.
 * @param {Client} client Le client Discord.
 */
async function triggerArmeEvent(client) {
  let guild;
  // Si la variable GUILD_ID est définie, l'utiliser
  if (process.env.GUILD_ID && process.env.GUILD_ID.trim() !== "") {
    try {
      guild = await client.guilds.fetch(process.env.GUILD_ID);
    } catch (err) {
      console.error("Erreur lors de la récupération de la guild via GUILD_ID :", err);
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

  const eventChannel = guild.channels.cache.get(eventArmeChannelId);
  if (!eventChannel) {
    console.error(`Le salon d'événement Arme (ID: ${eventArmeChannelId}) est introuvable.`);
    return;
  }

  const selectedCitizens = await selectRandomCitizens(guild, 3);
  if (selectedCitizens.length === 0) {
    console.log("Aucun citoyen sélectionné pour l'événement Arme.");
    return;
  }
  const mentions = selectedCitizens.map(member => `<@${member.id}>`).join(", ");
  
  const embed = new EmbedBuilder()
    .setColor(0xff0000) // Rouge
    .setTitle("Alerte Réparation d'Arme")
    .setDescription("Votre arme a subi une usure excessive et nécessite une réparation sous **48h** pour éviter une casse irréversible.")
    .setTimestamp();

  try {
    await eventChannel.send({ content: mentions, embeds: [embed] });
    console.log(`Événement Arme déclenché pour : ${mentions}`);
  } catch (err) {
    console.error("Erreur lors de l'envoi de l'événement Arme :", err);
  }
}

module.exports = (client) => {
  // Optionnel : pour tester immédiatement, décommentez la ligne suivante
  // triggerArmeEvent(client);

  // Déclencher l'événement "Arme Abîmée" toutes les 7 jours
  setInterval(() => {
    triggerArmeEvent(client);
  }, INTERVAL_7_DAYS);
};
