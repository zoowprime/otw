// anonymous.js
async function handleAnonymous(message) {
    if (message.content.startsWith("!anonymous")) {
        const anonymousMessage = message.content.slice("!anonymous".length).trim();
        if (!anonymousMessage) {
            return message.reply("❌ Vous devez écrire un message après la commande !");
        }
        // Supprimer le message de commande public s'il est supprimable
        if (message.guild && message.deletable) {
            try {
                await message.delete();
            } catch (err) {
                console.error("Erreur lors de la suppression du message de commande:", err);
            }
        }

        try {
            const channel = await message.client.channels.fetch(process.env.ANONYMOUS_CHANNEL_ID);
            if (!channel) {
                return message.author.send("❌ Le salon anonyme est introuvable.");
            }
            // Envoyer le message anonyme une seule fois
            await channel.send(`💬 **Message anonyme :** ${anonymousMessage}`);
            await message.author.send("✅ Votre message a été envoyé anonymement !");
        } catch (error) {
            console.error("Erreur lors de l'envoi du message anonyme :", error);
            message.author.send("❌ Une erreur s'est produite. Essayez plus tard.").catch(err =>
                console.error("Erreur lors de l'envoi du DM de confirmation:", err)
            );
        }
    }
}

module.exports = { handleAnonymous };
