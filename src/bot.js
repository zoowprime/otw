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

// Set pour éviter le traitement multiple d'un même message
const processedMessageIds = new Set();

client.once('ready', () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  // Ignorer les messages provenant des bots ou envoyés en DM
  if (message.author.bot || !message.guild) return;

  // Si ce message a déjà été traité, on l'ignore
  if (processedMessageIds.has(message.id)) return;
  processedMessageIds.add(message.id);

  if (message.content.startsWith('!qcm')) {
    await qcm.handleQCM(client, message);
  } else if (message.content.startsWith('!anonymous')) {
    await anonymous.handleAnonymous(message);
  }
});

client.login(process.env.BOT_TOKEN);
