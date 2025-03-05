// anonymous.js
// (Pas besoin d'appeler dotenv ici si c'est déjà fait dans bot.js)
async function handleAnonymous(message) {
    const anonymousChannelId = process.env.ANONYMOUS_CHANNEL_ID; // ID du salon anonyme
    if (!anonymousChannelId) {
        console.error("L'ID du salon anonyme n'est pas défini dans le fichier d'environnement !");
        return;
    }

    // Vérifier que le message commence par "!anonymous"
    if (message.content.startsWith("!anonymous")) {
        // Retire la commande pour récupérer le contenu
        const anonymousMessage = message.content.slice("!anonymous".length).trim();

        if (!anonymousMessage) {
            return message.reply("❌ Vous devez écrire un message après la commande !");
        }

        try {
            const channel = await message.client.channels.fetch(anonymousChannelId);
            if (!channel) {
                return message.reply("❌ Le salon anonyme est introuvable.");
            }

            await channel.send(`💬 **Message anonyme :** ${anonymousMessage}`);
            await message.reply("✅ Votre message a été envoyé anonymement !");
        } catch (error) {
            console.error("Erreur lors de l'envoi du message anonyme :", error);
            message.reply("❌ Une erreur s'est produite. Essayez plus tard.");
        }
    }
}

module.exports = { handleAnonymous };
