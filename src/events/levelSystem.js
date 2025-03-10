// src/events/levelSystem.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

// Récupère le dossier de données depuis la variable d'environnement DATA_DIR, sinon utilise '/data'
const dataDir = process.env.DATA_DIR || '/data';

// Vérifier que le dossier existe, sinon le créer
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Dossier ${dataDir} créé avec succès.`);
  } catch (err) {
    console.error(`Erreur lors de la création du dossier ${dataDir} :`, err);
  }
} else {
  console.log(`Le dossier ${dataDir} existe déjà.`);
}

// Chemin complet vers le fichier de données
const levelsDataPath = path.join(dataDir, 'levelsData.json');

// URL publique de l'image de niveau (modifiez cette URL avec le lien de votre image)
const LEVEL_UP_IMAGE_URL = 'https://i.imgur.com/jJB8z7Y.jpg';

// ID du salon où seront envoyés les annonces de niveaux
const levelUpChannelId = process.env.LEVEL_UP_CHANNEL_ID || '1348682023350435932';

/**
 * Charge le fichier levelsData.json, ou renvoie un objet vide s’il n’existe pas.
 */
function loadLevelsData() {
  if (fs.existsSync(levelsDataPath)) {
    try {
      const rawData = fs.readFileSync(levelsDataPath, 'utf8');
      console.log(`Fichier ${levelsDataPath} lu avec succès.`);
      return JSON.parse(rawData);
    } catch (err) {
      console.error('Erreur de lecture/parsing de levelsData.json :', err);
      return {};
    }
  } else {
    console.log(`Fichier ${levelsDataPath} n'existe pas. Un nouvel objet sera créé.`);
    return {};
  }
}

/**
 * Sauvegarde les données dans levelsData.json.
 */
function saveLevelsData(data) {
  try {
    fs.writeFileSync(levelsDataPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Données sauvegardées dans ${levelsDataPath}`);
  } catch (err) {
    console.error('Erreur lors de la sauvegarde de levelsData.json :', err);
  }
}

let levelsData = loadLevelsData();

/**
 * Incrémente le compteur de messages pour l'utilisateur userId, sauvegarde et retourne la nouvelle valeur.
 */
function incrementUserMessageCount(userId) {
  if (!levelsData[userId]) {
    levelsData[userId] = { messageCount: 0 };
  }
  levelsData[userId].messageCount += 1;
  saveLevelsData(levelsData);
  return levelsData[userId].messageCount;
}

/**
 * Attache un listener sur l'événement messageCreate pour gérer les niveaux.
 */
module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    // Ignorer les messages des bots et les messages privés
    if (!message.guild || message.author.bot) return;

    // Incrémente le compteur pour cet utilisateur
    const newCount = incrementUserMessageCount(message.author.id);

    // Si le nouveau compteur est un multiple de 100 (ex: 100, 200, 300, ...)
    if (newCount % 100 === 0) {
      const newLevel = newCount / 100;
      // Récupérer le salon de niveau
      const levelUpChannel = message.guild.channels.cache.get(levelUpChannelId);
      if (!levelUpChannel) {
        console.error(`Le salon de niveau (ID: ${levelUpChannelId}) est introuvable.`);
        return;
      }

      // Créer l'embed de félicitations
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('Nouveau niveau atteint !')
        .setDescription(`Félicitations <@${message.author.id}> !\nTu passes désormais **niveau ${newLevel}** 🥳`)
        .setImage(LEVEL_UP_IMAGE_URL);

      // Envoyer l'embed dans le salon dédié
      levelUpChannel.send({ embeds: [embed] });
    }
  });
};
