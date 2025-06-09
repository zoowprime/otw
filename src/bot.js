require('dotenv').config({ path: './id.env' });
const { Client, GatewayIntentBits, Collection, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

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

logger.setClient(client);

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

// 📦 Chargement des événements
require('./events/welcome.js')(client);
require('./events/levelSystem')(client);
require('./events/missionSystem')(client);
require('./events/maladies')(client);
require('./events/ferrure')(client);
require('./events/armeAbimee')(client);
require('./events/alimentationSystem.js')(client); // 🍔 Ajout système de faim/soif

const processedMessageIds = new Set();

client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  logger.sendLog(`✅ Connecté en tant que ${client.user.tag}`);

  try {
    const files = fs.readdirSync('./data');
    console.log('Contenu de /data :', files);
    logger.sendLog(`Contenu de /data : ${files.join(', ')}`);
  } catch (err) {
    console.error('Erreur en listant /data :', err);
    logger.sendError(err);
  }

  const panelChannelId = process.env.ID_DU_CANAL_POUR_TICKET || "1308118937904480318";
  try {
    const panelChannel = await client.channels.fetch(panelChannelId);
    if (panelChannel && typeof ticketModule.sendTicketPanel === 'function') {
      await ticketModule.sendTicketPanel(panelChannel);
      console.log("🎟️ Panel de ticket envoyé dans le salon dédié.");
      logger.sendLog("🎟️ Panel de ticket envoyé dans le salon dédié.");
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du canal du panel de ticket :", error);
    logger.sendError(error);
  }
});

client.on('interactionCreate', async (interaction) => {
  console.log("Interaction reçue:", interaction.customId || interaction.commandName);
  logger.sendLog(`Interaction reçue: ${interaction.customId || interaction.commandName}`);

  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error("Erreur commande slash :", error);
      logger.sendError(error);
      await interaction.reply({
        content: '❗ Erreur lors de l\'exécution de la commande.',
        flags: MessageFlags.Ephemeral
      });
    }
  }

  else if (
    (interaction.isButton() && ["open_ticket", "close_ticket", "delete_ticket"].includes(interaction.customId)) ||
    (interaction.isSelectMenu() && interaction.customId === "ticket_type_select")
  ) {
    try {
      await ticketModule.handleTicketInteraction(interaction);
    } catch (error) {
      console.error("Erreur ticket :", error);
      logger.sendError(error);
      if (!interaction.replied) {
        await interaction.reply({
          content: '❗ Erreur lors de l\'interaction ticket.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }

  else if (interaction.isButton() && ["en_ville", "deconnecte"].includes(interaction.customId)) {
    const role = interaction.guild.roles.cache.get('1378037596566978561');
    const member = interaction.member;

    if (!role || !member) return;

    try {
      if (interaction.customId === 'en_ville') {
        await member.roles.add(role);
        await interaction.reply({
          content: `✅ ${member} est maintenant en ville.`,
          ephemeral: true
        });
      } else if (interaction.customId === 'deconnecte') {
        await member.roles.remove(role);
        await interaction.reply({
          content: `❌ ${member} est maintenant hors ligne.`,
          ephemeral: true
        });
      }
    } catch (err) {
      console.error('Erreur attribution rôle :', err);
      logger.sendError(err);
      if (!interaction.replied) {
        await interaction.reply({
          content: '❗ Une erreur est survenue.',
          ephemeral: true
        });
      }
    }
  }

  else {
    const { handleStockInteractions } = require('./interaction/stockInteraction');
    if (handleStockInteractions) {
      try {
        await handleStockInteractions(interaction);
      } catch (error) {
        console.error('Erreur interaction stock :', error);
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

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (processedMessageIds.has(message.id)) return;

  processedMessageIds.add(message.id);

  console.log(`📩 Message reçu: ${message.id} - "${message.content}"`);
  logger.sendLog(`📩 Message reçu: ${message.id} - "${message.content}"`);

  if (message.content.startsWith('!')) {
    await handleEconomyCommand(message);
  }
});

client.login(process.env.BOT_TOKEN);
