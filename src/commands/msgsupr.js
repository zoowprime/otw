// src/commands/msgsupr.js
const { EmbedBuilder } = require('discord.js');

async function handleMsgsuprCommand(message, args) {
  try {
    // Vérifier que l'utilisateur possède le rôle staff
    const staffRoleId = process.env.STAFF_ROLE_ID;
    if (!message.member.roles.cache.has(staffRoleId)) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff0000)
            .setDescription("Cette commande est réservée aux membres du staff.")
        ]
      });
    }

    // Vérifier que le nombre de messages à supprimer est fourni
    if (!args[0]) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff0000)
            .setDescription("Usage : !msgsupr [nombre de messages]")
        ]
      });
    }

    const deleteCount = parseInt(args[0], 10);
    if (isNaN(deleteCount) || deleteCount < 1 || deleteCount > 100) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff0000)
            .setDescription("Veuillez fournir un nombre valide de messages à supprimer (entre 1 et 100).")
        ]
      });
    }

    // Supprimer les messages (bulkDelete supprime uniquement les messages datant de moins de 14 jours)
    const deletedMessages = await message.channel.bulkDelete(deleteCount, true);

    // Confirmer la suppression via un message dans le canal
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff0000)
          .setDescription(`${deletedMessages.size} messages supprimés.`)
      ]
    });
  } catch (error) {
    console.error("Erreur dans !msgsupr:", error);
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff0000)
          .setDescription("Une erreur s'est produite lors de la suppression des messages.")
      ]
    });
  }
}

module.exports = { handleMsgsuprCommand };
