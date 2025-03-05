// anonymous.js
async function handleAnonymous(message) {
    const anonymousChannelId = process.env.ANONYMOUS_CHANNEL_ID; // ID du salon anonyme
    if (!anonymousChannelId) {
        console.error("L'ID du salon anonyme n'est pas défini dans le fichier d'environnement !");
        return;
    }

    // Vérifier que le message commence par "!anonymous"
    if (message.content.startsWith("!anonymous")) {
        // Extraction du contenu après la commande
        const anonymousMessage = message.content.slice("!anonymous".length).trim();

        if (!anonymousMessage) {
            return message.reply("❌ Vous devez écrire un message après la commande !");
        }

        // Supprimer le message de commande pour préserver l'anonymat
        message.delete().catch(err => console.error("Erreur lors de la suppression du message de commande :", err));

        try {
            const channel = await message.client.channels.fetch(anonymousChannelId);
            if (!channel) {
                return message.author.send("❌ Le salon anonyme est introuvable.");
            }

            // Envoyer le message anonyme dans le salon spécifié
            await channel.send(`💬 **Message anonyme :** ${anonymousMessage}`);

            // Envoyer la confirmation en DM à l'auteur
            await message.author.send("✅ Votre message a été envoyé anonymement !");
        } catch (error) {
            console.error("Erreur lors de l'envoi du message anonyme :", error);
            message.author.send("❌ Une erreur s'est produite. Essayez plus tard.").catch(err =>
                console.error("Erreur lors de l'envoi du DM de confirmation :", err)
            );
        }
    }
}

module.exports = { handleAnonymous };
