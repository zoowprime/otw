require('dotenv').config({ path: './id.env' });
const { Client, GatewayIntentBits } = require('discord.js');
const qcm = require('./qcm');
const anonymous = require('./anonymous');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        // Ajoutez GuildMembers si vous en avez besoin pour l'attribution de rôle
        GatewayIntentBits.GuildMembers,
    ]
});

client.once('ready', () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return; // Ignorer les messages des bots

    if (message.content.startsWith('!qcm')) {
         qcm.handleQCM(client, message);
    } else if (message.content.startsWith('!anonymous')) {
         anonymous.handleAnonymous(message);
    }
});

client.login(process.env.BOT_TOKEN);
