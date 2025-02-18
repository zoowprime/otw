require('dotenv').config(); // Charger les variables d'environnement depuis un fichier .env
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: ['CHANNEL'], // Nécessaire pour les messages privés
});

// Variables d'environnement
const token = process.env.BOT_TOKEN; // Token du bot
const roleId = process.env.ROLE_ID; // ID du rôle à attribuer
const guildId = process.env.GUILD_ID; // ID du serveur principal

// Les questions et les réponses du QCM
const questions = [
    {
        question: "Qui a découvert l'île Bellshore ?",
        choices: ["1. Edmond Bellerive", "2. Edmond Dantès", "3. Joshua Bellerive"],
        correct: 1,
    },
    {
        question: "Quand a été découverte l'île Bellshore ?",
        choices: ["1. 1497", "2. 1789", "3. 1527"],
        correct: 3,
    },
    {
        question: "Le fait de faire ressentir la peur de votre personnage s’appelle :",
        choices: ["1. Le pain RP", "2. Le mass RP", "3. Le fear RP"],
        correct: 3,
    },
    {
        question: "Le fait d’effectuer des actions irréalisables dans la vraie vie s’appelle :",
        choices: ["1. Le metagaming", "2. Le powergaming", "3. Le mixe RP"],
        correct: 2,
    },
    {
        question: "Qui est le chef ultime des représentants de la loi ?",
        choices: ["1. Le gouverneur", "2. Les staffs (zoow le plus beau)", "3. Le marshall"],
        correct: 1,
    },
    {
        question: "Un bandana ou un masque peut vous rendre :",
        choices: ["1. Invincible", "2. Invisible", "3. Anonyme"],
        correct: 3,
    },
    {
        question: "Combien de temps peut durer maximum une scène de torture ?",
        choices: ["1. 15 minutes", "2. 5 minutes", "3. 10 minutes"],
        correct: 2,
    },
    {
        question: "Le double Pistolet Mauther est-il autorisé en jeu?",
        choices: ["1. Non", "2. Je ne sais pas", "3. oui"],
        correct: 1,
    },
    {
        question: "Quelle interdiction avez-vous à cheval ?",
        choices: ["1. Piétiner et tuer un joueur", "2. Sortir une arme", "3. Utiliser votre cheval"],
        correct: 1,
    },
    {
        question: "Durant des événements légaux, les scènes illégales sont-elles autorisées ?",
        choices: ["1. Je sais pas", "2. Oui", "3. Non"],
        correct: 3,
    },
    {
        question: "Combien faut-il d’otages pour faire un braquage de banque ?",
        choices: ["1. 5", "2. 3", "3. 1"],
        correct: 2,
    },
    {
        question: "Ai-je le droit d’entamer un gunfight contre d'autres joueurs avant d’avoir effectué une scène dite 'parlée' ?",
        choices: ["1. Oui", "2. Je sais pas", "3. Non"],
        correct: 3,
    },
    {
        question: "Le MassRP est-il à prendre en compte dans les zones peuplées ?",
        choices: ["1. Oui", "2. Non", "3. Pas forcément"],
        correct: 1,
    },
    {
        question: "Quelle est l’année du serveur ?",
        choices: ["1. 1885", "2. 1890", "3. 1895"],
        correct: 2,
    },
    {
        question: "Quelle entité se trouve tout en haut de l’arbre hiérarchique du serveur ?",
        choices: ["1. Le gouvernement", "2. Les staffs (zoow le plus beau)", "3. Les mafia"],
        correct: 1,
    },
];

// Suivi des tentatives des joueurs
const playerAttempts = {};

// Événement de démarrage du bot
client.once('ready', () => {
    console.log(`Bot connecté en tant que ${client.user.tag}`);
});

// Gérer les messages entrants
client.on('messageCreate', async (message) => {
    if (message.author.bot) return; // Ignorer les messages des autres bots

    if (message.content === '!qcm') {
        const playerId = message.author.id;

        // Initialiser les données du joueur si c'est la première fois
        if (!playerAttempts[playerId]) {
            playerAttempts[playerId] = { attempts: 3, nextAttempt: null };
        }

        const playerData = playerAttempts[playerId];
        const now = new Date();

        // Vérifier si le joueur doit attendre avant de rejouer
        if (playerData.nextAttempt && now < playerData.nextAttempt) {
            const waitTime = Math.ceil((playerData.nextAttempt - now) / 1000 / 60); // en minutes
            return message.reply(`Tu dois attendre encore ${waitTime} minutes avant de rejouer.`);
        }

        // Vérifier si le joueur a encore des tentatives
        if (playerData.attempts === 0) {
            return message.reply("Tu as épuisé toutes tes tentatives et tu seras expulsé du serveur.");
        }

        // Envoyer le QCM en message privé
        try {
            await message.author.send("Bienvenue dans le QCM ! Prépare-toi à répondre à 15 questions.");
            playerData.attempts -= 1; // Réduire le nombre de tentatives
            playerData.nextAttempt = null; // Réinitialiser le délai pour cette tentative
            startQCM(message.author); // Appeler la fonction pour démarrer le QCM
        } catch (error) {
            console.error("Erreur lors de l'envoi du MP : ", error);
            return message.reply("Je n’ai pas pu t’envoyer de message privé. Vérifie que tu les as activés.");
        }
    }
});

// Fonction pour démarrer le QCM
async function startQCM(user) {
    let score = 0;

    for (const [index, q] of questions.entries()) {
        try {
            const questionText = `**Question ${index + 1}**\n${q.question}\n${q.choices.join("\n")}\nRéponds par le numéro de ta réponse.`;
            await user.send(questionText);

            const filter = (response) => response.author.id === user.id && !isNaN(response.content);
            const collected = await user.dmChannel.awaitMessages({
                filter,
                max: 1,
                time: 30000, // 30 secondes pour répondre
                errors: ['time'],
            });

            const answer = parseInt(collected.first().content, 10);

            if (answer === q.correct) {
                score++;
                await user.send("Bonne réponse !");
            } else {
                await user.send("Mauvaise réponse !");
            }
        } catch (err) {
            await user.send("Temps écoulé pour cette question !");
        }
    }

    // Résultat final
    if (score >= 12) {
        await user.send(`Bravo ! Tu as réussi le QCM avec un score de ${score}/15.`);
        
        // Ajouter le rôle si le joueur réussit
        const guild = client.guilds.cache.get(guildId); // Utiliser l'ID du serveur principal
        if (!guild) {
            return user.send("Impossible de trouver le serveur. Vérifie l'ID.");
        }
        const member = guild.members.cache.get(user.id);
        if (member) {
            try {
                await member.roles.add(roleId); // Attribuer le rôle
                await user.send("Tu as reçu un nouveau rôle pour avoir réussi le QCM !");
            } catch (error) {
                console.error("Erreur lors de l'attribution du rôle : ", error);
                await user.send("Une erreur est survenue lors de l'attribution du rôle.");
            }
        }
    } else {
        await user.send(`Dommage, tu as échoué avec un score de ${score}/15.`);
        setRetryDelay(user.id); // Définir le délai pour retenter
    }
}

// Fonction pour gérer le délai entre les tentatives
function setRetryDelay(playerId) {
    const playerData = playerAttempts[playerId];

    if (playerData.attempts === 2) {
        playerData.nextAttempt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 heures
    } else if (playerData.attempts === 1) {
        playerData.nextAttempt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures
    } else {
        // Expulser le joueur après 3 échecs
        const guild = client.guilds.cache.get(guildId); // Utiliser l'ID du serveur principal
        if (!guild) {
            console.error("Impossible de trouver le serveur pour expulser le joueur.");
            return;
        }
        const member = guild.members.cache.get(playerId);
        if (member) {
            member.kick("Échec du QCM trois fois")
                .then(() => console.log(`Le membre ${member.user.tag} a été expulsé.`))
                .catch((error) => console.error(`Erreur lors de l'expulsion : ${error}`));
        }
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'anonyme') {
        const message = interaction.options.getString('message');
        const channel = client.channels.cache.get(process.env.ANONYMOUS_CHANNEL_ID);

        if (!channel) {
            return interaction.reply({ content: "Salon anonyme introuvable.", ephemeral: true });
        }

        await channel.send(`Message anonyme : ${message}`);
        await interaction.reply({ content: "Votre message a été envoyé anonymement.", ephemeral: true });
    }
});

// Connexion du bot
client.login(token);

const http = require("http");

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is running, but no web service is required.");
}).listen(process.env.PORT || 3000);

