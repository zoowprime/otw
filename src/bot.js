// src/bot.js
require('dotenv').config({ path: './id.env' });
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Import du module ticket pour envoyer automatiquement le panel
const ticketSystem = require('./ticket.js');
// Import du module pour les commandes économiques (texte)
const { handleEconomyCommand } = require('./economy');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

// Collection pour les commandes slash
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

// Set pour éviter les doublons dans les commandes texte
const processedMessageIds = new Set();

client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);

  // Envoi automatique du panel de ticket dans le canal dédié
  const panelChannelId = process.env.ID_DU_CANAL_POUR_TICKET; // 1308118937904480318
  try {
    const panelChannel = await client.channels.fetch(panelChannelId);
    if (panelChannel && ticketSystem && typeof ticketSystem(client).sendTicketPanel === 'function') {
      ticketSystem(client).sendTicketPanel(panelChannel);
      console.log("Panel de ticket envoyé dans le canal dédié.");
    } else {
      console.error("Le canal pour le panel de ticket est introuvable ou le module ticket est mal configuré.");
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du canal du panel de ticket :", error);
  }
});

client.on('interactionCreate', async (interaction) => {
  // Gestion des commandes slash
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
  // Gestion des autres interactions (Select Menus, Modals)
  else {
    const { handleStockInteractions } = require('./interaction/stockInteraction');
    if (handleStockInteractions) {
      await handleStockInteractions(interaction);
    }
  }
});

// Gestion des commandes texte (économie)
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (processedMessageIds.has(message.id)) return;
  processedMessageIds.add(message.id);
  console.log(`Traitement du message texte: ${message.id} - contenu: "${message.content}"`);
  if (message.content.startsWith('!')) {
    await handleEconomyCommand(message);
  }
});

client.login(process.env.BOT_TOKEN);
