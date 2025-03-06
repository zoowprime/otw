// src/bot.js
require('dotenv').config({ path: './id.env' });
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Import du module ticket pour envoyer automatiquement le panel
const ticketSystem = require('./ticket.js');
// Import du module pour les commandes économiques en mode texte
const { handleEconomyCommand } = require('./economy');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,            // Accès aux serveurs
    GatewayIntentBits.GuildMessages,     // Pour recevoir les messages dans les serveurs
    GatewayIntentBits.MessageContent,    // Pour lire le contenu des messages (nécessaire pour les commandes texte)
    GatewayIntentBits.GuildMembers,      // Pour gérer les rôles et membres
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

// Set pour éviter de traiter plusieurs fois le même message texte
const processedMessageIds = new Set();

client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);

  // Envoi automatique du panel de ticket dans le canal dédié
  const panelChannelId = process.env.ID_DU_CANAL_POUR_TICKET || "1308118937904480318"; // ID du salon dédié au panel
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

// Gestion des interactions (slash commands, select menus, modals, boutons)
client.on('interactionCreate', async (interaction) => {
  // Si c'est une commande slash (ChatInputCommand)
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error("Erreur lors de l'exécution de la commande slash :", error);
      await interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de la commande.', ephemeral: true });
    }
  }
  // Autres interactions (ex: select menus et modals pour stock ou ticket)
  else {
    // Gestion des interactions pour le stock
    const { handleStockInteractions } = require('./interaction/stockInteraction');
    if (handleStockInteractions) {
      await handleStockInteractions(interaction);
    }
    // Gestion du ticket (bouton "open_ticket", "close_ticket", "delete_ticket")
    else if (interaction.isButton() && interaction.customId === "open_ticket") {
      const ticketModule = require('./ticket.js')(client);
      await ticketModule.handleTicketInteraction(interaction);
    }
    // Pour les autres boutons liés au ticket (close_ticket, delete_ticket)
    else if (interaction.isButton() && (interaction.customId === "close_ticket" || interaction.customId === "delete_ticket")) {
      const ticketModule = require('./ticket.js')(client);
      await ticketModule.handleTicketInteraction(interaction);
    }
  }
});

// Gestion des commandes texte (préfixées par "!")
client.on('messageCreate', async (message) => {
  // Ignorer les messages provenant des bots et les messages hors serveur
  if (message.author.bot || !message.guild) return;
  if (processedMessageIds.has(message.id)) return;
  processedMessageIds.add(message.id);
  console.log(`Traitement du message texte: ${message.id} - contenu: "${message.content}"`);

  // Toutes les commandes texte commencent par "!"
  if (message.content.startsWith('!')) {
    await handleEconomyCommand(message);
  }
});

client.login(process.env.BOT_TOKEN);
