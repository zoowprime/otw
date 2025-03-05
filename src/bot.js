// src/bot.js
require('dotenv').config({ path: './id.env' });
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Import du module ticket pour envoyer automatiquement le panel
const ticketSystem = require('./ticket.js');

// Import du module pour les commandes économiques (mode texte)
const { handleEconomyCommand } = require('./economy');

// Création du client Discord avec les intents requis
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,            
    GatewayIntentBits.GuildMessages,     
    GatewayIntentBits.MessageContent,    
    GatewayIntentBits.GuildMembers,      
  ]
});

// Collection pour stocker les commandes slash
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

// Set pour éviter le traitement en double des commandes texte
const processedMessageIds = new Set();

client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);

  // Envoi automatique du panel de ticket dans le salon dédié
  // Ici, on utilise l'ID de salon donné : 1308118937904480318
  const panelChannelId = "1308118937904480318";
  try {
    const panelChannel = await client.channels.fetch(panelChannelId);
    if (panelChannel && ticketSystem && typeof ticketSystem(client).sendTicketPanel === 'function') {
      ticketSystem(client).sendTicketPanel(panelChannel);
      console.log("Panel de ticket envoyé dans le salon dédié.");
    } else {
      console.error("Le canal pour le panel de ticket est introuvable ou le module ticket est mal configuré.");
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du canal du panel de ticket :", error);
  }
});

client.on('interactionCreate', async (interaction) => {
  // Gestion des commandes slash (ex: /anonymous)
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de la commande.', ephemeral: true });
    }
  }
  // Gérer ici d'autres interactions (ex: select menus, modals pour les stocks, etc.)
  else {
    // Vous pouvez ajouter votre gestionnaire d'interactions personnalisé ici
    const { handleStockInteractions } = require('./interaction/stockInteraction');
    if (handleStockInteractions) {
      await handleStockInteractions(interaction);
    }
  }
});

// Gestion des commandes texte (économiques)
client.on('messageCreate', async (message) => {
  // Ignorer les messages des bots ou hors serveur (DM)
  if (message.author.bot || !message.guild) return;
  if (processedMessageIds.has(message.id)) return;
  processedMessageIds.add(message.id);
  console.log(`Traitement du message texte: ${message.id} - contenu: "${message.content}"`);

  // Ici, on considère que toutes les commandes texte commencent par "!"
  // La commande slash "anonymous" n'est plus gérée ici
  if (message.content.startsWith('!')) {
    await handleEconomyCommand(message);
  }
});

client.login(process.env.BOT_TOKEN);
