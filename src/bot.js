// bot.js
require('dotenv').config({ path: './id.env' });
const { Client, GatewayIntentBits } = require('discord.js');
const ticketSystem = require('./ticket.js'); // Module de ticket (si vous l'utilisez)
const anonymous = require('./anonymous');
const { handleEconomyCommand } = require('./economy');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

// Set pour mémoriser les IDs des messages déjà traités et éviter les doublons
const processedMessageIds = new Set();

client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);

  // Initialisation du système de ticket (si vous l'utilisez)
  const panelChannelId = "ID_DU_CANAL_POUR_TICKET"; // Remplacez par l'ID réel du canal pour le panel de ticket
  let panelChannel;
  try {
    panelChannel = await client.channels.fetch(panelChannelId);
  } catch (error) {
    console.error("Impossible de récupérer le canal du panel de ticket :", error);
  }
  if (panelChannel) {
    const { sendTicketPanel } = ticketSystem(client);
    sendTicketPanel(panelChannel);
  } else {
    console.error("Le canal pour afficher le panel de ticket est introuvable.");
  }
});

client.on('messageCreate', async (message) => {
  // Ignorer les messages des bots ou les messages hors serveur (DM)
  if (message.author.bot || !message.guild) return;

  // Vérifier si le message a déjà été traité
  if (processedMessageIds.has(message.id)) return;
  processedMessageIds.add(message.id);
  console.log(`Traitement du message: ${message.id} - contenu: "${message.content}"`);

  if (message.content.startsWith('!anonymous')) {
    console.log(`Commande Anonymous déclenchée par ${message.author.tag}`);
    await anonymous.handleAnonymous(message);
  } else if (message.content.startsWith('!')) {
    // Toutes les autres commandes (économiques, etc.)
    await handleEconomyCommand(message);
  }
});

client.login(process.env.BOT_TOKEN);
