// bot.js
require('dotenv').config({ path: './id.env' });
const { Client, GatewayIntentBits } = require('discord.js');
const qcm = require('./qcm');
const anonymous = require('./anonymous');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

// Set pour mémoriser les IDs des messages déjà traités
const processedMessageIds = new Set();

client.once('ready', () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  // Ignorer les messages provenant des bots ou envoyés en DM (hors serveur)
  if (message.author.bot || !message.guild) return;

  // Vérifier si le message a déjà été traité
  if (processedMessageIds.has(message.id)) {
    console.log(`Message déjà traité: ${message.id}`);
    return;
  }
  // Marquer ce message comme traité
  processedMessageIds.add(message.id);
  console.log(`Traitement du message: ${message.id} - contenu: "${message.content}"`);

  if (message.content.startsWith('!qcm')) {
    console.log(`Commande QCM déclenchée par ${message.author.tag}`);
    await qcm.handleQCM(client, message);
  } else if (message.content.startsWith('!anonymous')) {
    console.log(`Commande Anonymous déclenchée par ${message.author.tag}`);
    await anonymous.handleAnonymous(message);
  }
});

client.login(process.env.BOT_TOKEN);
