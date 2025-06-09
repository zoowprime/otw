require('dotenv').config({ path: './id.env' });
const { Client, GatewayIntentBits, Collection, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Modules internes
const ticketModule = require('./ticket.js');
const { handleEconomyCommand } = require('./economy');
const { transformSessions } = require('./transformSessions');
const logger = require('./logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

// Initialise le logger avec le client
logger.setClient(client);

// Chargement des événements globaux
require('./events/welcome.js')(client);
require('./events/levelSystem')(client);
require('./events/missionSystem')(client);
require('./events/maladies')(client);
require('./events/ferrure')(client);
require('./events/armeAbimee')(client);

// Chargement des commandes slash
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

// Set pour éviter les doublons de messages texte
const processedMessageIds = new Set();

// Événement : démarrage du bot
client.once('ready', async () => {
  console.log(✅ Connecté en tant que ${client.user.tag});
  logger.sendLog(✅ Connecté en tant que ${client.user.tag});

  // Vérifie le contenu du dossier /data (pour debug si besoin)
  try {
    const files = fs.readdirSync('/data');
    console.log('Contenu de /data :', files);
    logger.sendLog(Contenu de /data : ${files.join(', ')});
  } catch (err) {
    console.error('Erreur en listant /data :', err);
    logger.sendError(err);
  }

  // Envoie automatique du panel de ticket
  const panelChannelId = process.env.ID_DU_CANAL_POUR_TICKET || "1308118937904480318";
  try {
    const panelChannel = await client.channels.fetch(panelChannelId);
    if (panelChannel && typeof ticketModule.sendTicketPanel === 'function') {
      await ticketModule.sendTicketPanel(panelChannel);
      console.log("🎟️ Panel de ticket envoyé dans le salon dédié.");
      logger.sendLog("🎟️ Panel de ticket envoyé dans le salon dédié.");
    } else {
      console.error("❌ Salon du panel de ticket introuvable ou module incorrect.");
      logger.sendLog("❌ Salon du panel de ticket introuvable ou module incorrect.");
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du canal du panel de ticket :", error);
    logger.sendError(error);
  }
});

// Interaction handler (slash, boutons, menus)
client.on('interactionCreate', async (interaction) => {
  console.log("Interaction reçue:", interaction.customId || interaction.commandName);
  logger.sendLog(Interaction reçue: ${interaction.customId || interaction.commandName});

  // Slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error("Erreur lors de l'exécution de la commande slash :", error);
      logger.sendError(error);
      await interaction.reply({
        content: '❗ Une erreur est survenue lors de l\'exécution de la commande.',
        flags: MessageFlags.Ephemeral
      });
    }
  }

  // Interactions Ticket (boutons et menu déroulant)
  else if (
    (interaction.isButton() && ["open_ticket", "close_ticket", "delete_ticket"].includes(interaction.customId)) ||
    (interaction.isSelectMenu() && interaction.customId === "ticket_type_select")
  ) {
    try {
      await ticketModule.handleTicketInteraction(interaction);
    } catch (error) {
      console.error("Erreur lors du traitement de l'interaction de ticket:", error);
      logger.sendError(error);
      if (!interaction.replied) {
        await interaction.reply({
          content: '❗ Une erreur est survenue lors du traitement de l\'interaction.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }

  // Boutons "en ville" / "déconnecté"
  else if (interaction.isButton() && ["en_ville", "deconnecte"].includes(interaction.customId)) {
    const role = interaction.guild.roles.cache.get('1378037596566978561');
    const member = interaction.member;

    if (!role || !member) return;

    try {
      if (interaction.customId === 'en_ville') {
        await member.roles.add(role);
        await interaction.reply({
          content: ✅ ${member} est maintenant marqué comme en ville.,
          ephemeral: true
        });
      } else if (interaction.customId === 'deconnecte') {
        await member.roles.remove(role);
        await interaction.reply({
          content: ❌ ${member} a été marqué comme déconnecté.,
          ephemeral: true
        });
      }
    } catch (err) {
      console.error('Erreur lors de l’attribution du rôle :', err);
      logger.sendError(err);
      if (!interaction.replied) {
        await interaction.reply({
          content: '❗ Une erreur est survenue.',
          ephemeral: true
        });
      }
    }
  }

  // Autres interactions (ex : stock)
  else {
    const { handleStockInteractions } = require('./interaction/stockInteraction');
    if (handleStockInteractions) {
      try {
        await handleStockInteractions(interaction);
      } catch (error) {
        console.error('Erreur lors du traitement de l\'interaction (stock ou autre) :', error);
        logger.sendError(error);
        if (!interaction.replied) {
          await interaction.reply({
            content: '❗ Une erreur est survenue.',
            ephemeral: true
          });
        }
      }
    }
  }
});

// Commandes texte (préf. "!" pour économie)
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (processedMessageIds.has(message.id)) return;

  processedMessageIds.add(message.id);

  console.log(📩 Message texte reçu: ${message.id} - contenu: "${message.content}");
  logger.sendLog(📩 Message texte reçu: ${message.id} - contenu: "${message.content}");

  if (message.content.startsWith('!')) {
    await handleEconomyCommand(message);
  }
});

client.login(process.env.BOT_TOKEN);
