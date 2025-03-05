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

// Un seul listener pour éviter les doublons
client.on('messageCreate', async (message) => {
    // Ignorer les messages provenant des bots
    if (message.author.bot) return;

    // Commande QCM
    if (message.content.startsWith('!qcm')) {
         await qcm.handleQCM(client, message);
         return;
    }
    
    // Commande anonyme
    if (message.content.startsWith('!anonymous')) {
         await anonymous.handleAnonymous(message);
         return;
    }
});

client.login(process.env.BOT_TOKEN);
