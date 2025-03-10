// src/events/levelSystem.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

/**
 * Configuration :
 * - Chemin vers le dossier de stockage des données. Sur Render, assurez-vous
 *   que DATA_DIR=/data (ou que vous utilisez '/data' en dur).
 */
const dataDir = process.env.DATA_DIR || '/data';
const levelsDataPath = path.join(dataDir, 'levelsData.json');

// URL de l'image de "niveau atteint". Mettez l'URL réelle de votre image ici :
const LEVEL_UP_IMAGE_URL = 'https://exemple.com/images/niveau_atteint.jpg';

// Variable en mémoire pour stocker les niveaux
// (chargée depuis levelsData.json au démarrage).
let levelsData = {};

/**
 * Charge le fichier levelsData.json, ou renvoie un objet vide s’il n’existe pas.
 */
function loadLevelsData() {
  if (fs.existsSync(levelsDataPath)) {
    try {
      const raw = fs.readFileSync(levelsDataPath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Erreur de lecture/parsing levelsData.json :', err);
      return {};
    }
  } else {
    console.log('Fichier levelsData.json non trouvé. Création à la volée.');
    return {};
  }
}

/**
 * Sauvegarde en JSON dans levelsData.json
 */
function saveLevelsData() {
  try {
    fs.writeFileSync(levelsDataPath, JSON.stringify(levelsData, null, 2), 'utf8');
  } catch (err) {
    console.error('Erreur de sauvegarde de levelsData.json :', err);
  }
}

/**
 * Retourne le nombre de messages actuels pour un userId donné,
 * en l’initialisant à 0 si nécessaire.
 */
function getUserMessageCount(userId) {
  if (!levelsData[userId]) {
    levelsData[userId] = { messageCount: 0 };
  }
  return levelsData[userId].messageCount;
}

/**
 * Incrémente le compteur de messages pour userId de 1,
 * puis sauvegarde le fichier.
 */
function incrementUserMessageCount(userId) {
  if (!levelsData[userId]) {
    levelsData[userId] = { messageCount: 0 };
  }
  levelsData[userId].messageCount += 1;
  saveLevelsData();
  return levelsData[userId].messageCount;
}

/**
 * Fonction principale exportée : attache un listener sur messageCreate
 */
module.exports = (client) => {
  // Charger en mémoire les données existantes
  levelsData = loadLevelsData();

  // Écoute de l'événement messageCreate
  client.on('messageCreate', async (message) => {
    // Ignorer les messages des bots ou en DM
    if (!message.guild || message.author.bot) return;

    // Récupérer le nouveau compteur de messages pour l'utilisateur
    const newCount = incrementUserMessageCount(message.author.id);

    // Vérifier si on franchit un palier de 100 messages
    // Ex : si newCount = 100, 200, 300, etc.
    if (newCount % 100 === 0) {
      const newLevel = newCount / 100; // 1, 2, 3, etc.

      // Créer l'embed pour annoncer le nouveau niveau
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('Nouveau niveau atteint !')
        .setDescription(
          `Félicitations <@${message.author.id}> !\n` +
          `Tu passes désormais **niveau ${newLevel}** 🥳`
        )
        .setImage(LEVEL_UP_IMAGE_URL);

      // Poster le message dans le même salon
      message.channel.send({ embeds: [embed] });
    }
  });
};
