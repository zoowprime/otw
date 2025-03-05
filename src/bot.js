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

client.once('ready', () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

// On traite les commandes uniquement si le message provient d'un serveur
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  if (message.content.startsWith('!qcm')) {
    await qcm.handleQCM(client, message);
    return;
  }
  if (message.content.startsWith('!anonymous')) {
    await anonymous.handleAnonymous(message);
    return;
  }
});

client.login(process.env.BOT_TOKEN);
