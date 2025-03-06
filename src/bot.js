// src/bot.js
require('dotenv').config({ path: './id.env' });
const { Client, GatewayIntentBits, Collection, MessageFlags, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Import des modules
const ticketModule = require('./ticket.js');
const { handleEconomyCommand } = require('./economy');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,            
    GatewayIntentBits.GuildMessages,     
    GatewayIntentBits.MessageContent,    
    GatewayIntentBits.GuildMembers,      
  ]
});

// Chargement des commandes slash depuis src/commands
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

// --- Événements de bienvenue et d'au revoir ---

client.on('guildMemberAdd', async (member) => {
  try {
    // Attribution du rôle de bienvenue
    const welcomeRoleId = process.env.WELCOME_ROLE_ID;
    if (welcomeRoleId) {
      const role = member.guild.roles.cache.get(welcomeRoleId);
      if (role) await member.roles.add(role);
      else console.error("Le rôle de bienvenue n'a pas été trouvé.");
    }
    // Création de l'embed de bienvenue
    const welcomeEmbed = new EmbedBuilder()
      .setTitle("Bienvenue sur OTW !")
      .setDescription(`Salut ${member.user.username}, bienvenue sur OTW !`)
      .setImage(process.env.WELCOME_IMAGE_URL)
      .setColor(0xff0000);
    // Envoi de l'embed dans le canal dédié
    const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
    if (welcomeChannelId) {
      const channel = member.guild.channels.cache.get(welcomeChannelId);
      if (channel) await channel.send({ embeds: [welcomeEmbed] });
      else console.error("Le canal de bienvenue n'a pas été trouvé.");
    }
  } catch (error) {
    console.error("Erreur dans guildMemberAdd :", error);
  }
});

client.on('guildMemberRemove', async (member) => {
  try {
    const farewellEmbed = new EmbedBuilder()
      .setTitle("Au revoir...")
      .setDescription(`${member.user.username} a quitté OTW.`)
      .setColor(0xff0000)
      .setImage(process.env.WELCOME_IMAGE_URL);
    const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
    if (welcomeChannelId) {
      const channel = member.guild.channels.cache.get(welcomeChannelId);
      if (channel) await channel.send({ embeds: [farewellEmbed] });
    }
  } catch (error) {
    console.error("Erreur dans guildMemberRemove :", error);
  }
});

// --- Gestion des interactions ---
client.on('interactionCreate', async (interaction) => {
  console.log("Interaction reçue:", interaction.customId);

  // 1) Commandes slash
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error("Erreur lors de l'exécution de la commande slash :", error);
      await interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de la commande.', flags: MessageFlags.Ephemeral });
    }
  }
  // 2) Interactions liées aux tickets (boutons et select menus)
  else if (
    (interaction.isButton() && ["open_ticket", "close_ticket", "delete_ticket"].includes(interaction.customId)) ||
    (interaction.isSelectMenu() && interaction.customId === "ticket_type_select")
  ) {
    try {
      // Déférer la réponse dès réception pour éviter l'expiration
      if (interaction.isButton() || interaction.isSelectMenu()) {
        await interaction.deferUpdate();
      }
      await ticketModule.handleTicketInteraction(interaction);
    } catch (error) {
      console.error("Erreur lors du traitement de l'interaction de ticket:", error);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Une erreur est survenue lors du traitement de l\'interaction.', flags: MessageFlags.Ephemeral });
      }
    }
  }
  // 3) Interactions pour le stock ou autres
  else {
    const { handleStockInteractions } = require('./interaction/stockInteraction');
    if (handleStockInteractions) {
      await handleStockInteractions(interaction);
    }
  }
});

// --- Gestion des commandes texte (préf. "!") ---
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
