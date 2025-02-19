require('dotenv').config(); // Charge les variables d'environnement
const { Client, GatewayIntentBits } = require('discord.js');
const qcm = require('./qcm'); // Importation du module QCM
const anonymous = require('./anonymous'); // Importation du module anonyme

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

// Commande QCM
client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!qcm')) {
        qcm.handleQCM(client, message);
    }
});

// Commande Anonyme
client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!anonymous')) {
        anonymous.handleAnonymous(client, message);
    }
});

client.login(process.env.TOKEN);
