// src/logger.js
const { MessageFlags } = require('discord.js');

let client; // Stockera le client Discord
const logChannelId = process.env.LOG_CHANNEL_ID; // Définissez cette variable dans votre .env

/**
 * Définit le client Discord pour le module de log.
 * Doit être appelé après la connexion du bot.
 * @param {Client} discordClient 
 */
function setClient(discordClient) {
  client = discordClient;
}

/**
 * Envoie un message de log au salon dédié, puis le loggue dans la console.
 * @param {string} message 
 */
async function sendLog(message) {
  console.log(message);
  if (!client || !logChannelId) return;
  try {
    const channel = client.channels.cache.get(logChannelId);
    if (channel) {
      // On formate le message en bloc de code pour une meilleure lisibilité
      await channel.send(`\`\`\`${message}\`\`\``);
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi du log au salon :", error);
  }
}

/**
 * Fonction utilitaire pour loguer une erreur.
 * @param {Error|string} error 
 */
async function sendError(error) {
  const message = typeof error === 'string' ? error : error.stack || error.message;
  await sendLog(`ERROR: ${message}`);
}

module.exports = { setClient, sendLog, sendError };
