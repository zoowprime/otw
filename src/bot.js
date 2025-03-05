// bot.js
require('dotenv').config({ path: './id.env' });
const { Client, GatewayIntentBits } = require('discord.js');
const ticketSystem = require('./ticket.js'); // Module de ticket
const anonymous = require('./anonymous'); // Module de commande anonyme

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

client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);

  // Initialisation du système de ticket et envoi du panel dans un canal spécifique
  const panelChannelId = 1308118937904480318; // Remplacez par l'ID réel du canal destiné au panel de ticket
  let panelChannel;
  try {
    panelChannel = await client.channels.fetch(panelChannelId);
  } catch (error) {
    console.error("Impossible de récupérer le canal du panel de ticket :", error);
  }
  if (panelChannel) {
    // Le module ticket attache ses listeners d'interaction et retourne une fonction pour envoyer le panel
    const { sendTicketPanel } = ticketSystem(client);
    sendTicketPanel(panelChannel);
  } else {
    console.error("Le canal pour afficher le panel de ticket est introuvable.");
  }
});

client.on('messageCreate', async (message) => {
  // On ignore les messages provenant des bots ou les messages hors serveur (DM)
  if (message.author.bot || !message.guild) return;

  // Si le message a déjà été traité, on l'ignore
  if (processedMessageIds.has(message.id)) return;
  processedMessageIds.add(message.id);
  console.log(`Traitement du message: ${message.id} - contenu: "${message.content}"`);

  // Commande anonyme uniquement
  if (message.content.startsWith('!anonymous')) {
    console.log(`Commande Anonymous déclenchée par ${message.author.tag}`);
    await anonymous.handleAnonymous(message);
  }
});

client.login(process.env.BOT_TOKEN);
