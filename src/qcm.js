// qcm.js
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
        choices: ["1. Non", "2. Je ne sais pas", "3. Oui"],
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

async function handleQCM(client, message) {
    // On s'assure que la commande est utilisée dans un serveur
    if (!message.guild) {
        return message.reply("Cette commande ne peut être utilisée que dans un serveur.");
    }

    let score = 0;
    const total = questions.length;
    const filter = m => m.author.id === message.author.id;

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const questionText = `**Question ${i + 1}/${total} :** ${q.question}\n${q.choices.join("\n")}\nRéponds avec le numéro de la réponse.`;
        await message.channel.send(questionText);

        try {
            const collected = await message.channel.awaitMessages({
                filter,
                max: 1,
                time: 30000,
                errors: ['time']
            });
            const response = collected.first().content.trim();
            if (parseInt(response) === q.correct) {
                score++;
                await message.channel.send("✅ Correct !");
            } else {
                await message.channel.send(`❌ Incorrect. La bonne réponse était: ${q.correct}`);
            }
        } catch (error) {
            await message.channel.send("⏰ Temps écoulé pour cette question !");
        }
    }

    await message.channel.send(`Bravo ! Tu as terminé le QCM avec un score de ${score}/${total}.`);
}

module.exports = { handleQCM, questions };
