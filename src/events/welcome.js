// src/events/welcome.js
const { EmbedBuilder } = require('discord.js');
require('dotenv').config({ path: './id.env' });

module.exports = (client) => {
  // Événement : Un membre rejoint le serveur
  client.on('guildMemberAdd', async (member) => {
    try {
      // Attribuer le rôle de bienvenue (par exemple, le rôle citoyen)
      const welcomeRoleId = process.env.WELCOME_ROLE_ID;
      if (welcomeRoleId) {
        const role = member.guild.roles.cache.get(welcomeRoleId);
        if (role) {
          await member.roles.add(role);
        } else {
          console.error("Le rôle de bienvenue n'a pas été trouvé.");
        }
      }

      // Créer l'embed de bienvenue
      const welcomeEmbed = new EmbedBuilder()
        .setTitle("Bienvenue sur OTW !")
        .setDescription(`Salut ${member.user.username}, bienvenue sur OTW !`)
        .setImage(process.env.WELCOME_IMAGE_URL) // URL de votre image
        .setColor(0xff0000);

      // Envoyer l'embed dans le canal dédié (par exemple, un canal de bienvenue)
      const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
      if (welcomeChannelId) {
        const channel = member.guild.channels.cache.get(welcomeChannelId);
        if (channel) {
          await channel.send({ embeds: [welcomeEmbed] });
        } else {
          console.error("Le canal de bienvenue n'a pas été trouvé.");
        }
      }
    } catch (error) {
      console.error("Erreur dans l'événement guildMemberAdd:", error);
    }
  });

  // Événement : Un membre quitte le serveur
  client.on('guildMemberRemove', async (member) => {
    try {
      // Créer un embed de départ
      const farewellEmbed = new EmbedBuilder()
        .setTitle("Au revoir...")
        .setDescription(`${member.user.username} a quitté OTW.`)
        .setColor(0xff0000)
        .setImage(process.env.WELCOME_IMAGE_URL); // Réutilisez l'image ou choisissez-en une autre

      // Envoyer l'embed dans le canal dédié
      const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
      if (welcomeChannelId) {
        const channel = member.guild.channels.cache.get(welcomeChannelId);
        if (channel) {
          await channel.send({ embeds: [farewellEmbed] });
        }
      }
    } catch (error) {
      console.error("Erreur dans l'événement guildMemberRemove:", error);
    }
  });
};
