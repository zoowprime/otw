// src/commands/msgsupr.js
const { EmbedBuilder } = require('discord.js');

async function handleMsgsuprCommand(message, args) {
  // Vérifier que l'utilisateur a le rôle staff
  const staffRoleId = process.env.STAFF_ROLE_ID;
  if (!message.member.roles.cache.has(staffRoleId)) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff0000)
          .setDescription("Cette commande est réservée aux membres du staff.")
      ]
    });
  }

  if (!args[0]) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff0000)
          .setDescription("Usage : !msgsupr [nombre de messages]")
      ]
    });
  }

  const deleteCount = parseInt(args[0], 10);
  if (isNaN(deleteCount) || deleteCount < 1 || deleteCount > 100) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff0000)
          .setDescription("Veuillez fournir un nombre valide (entre 1 et 100).")
      ]
    });
  }

  try {
    await message.channel.bulkDelete(deleteCount, true);
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff0000)
          .setDescription(`${deleteCount} messages supprimés.`)
      ]
    });
  } catch (error) {
    console.error("Erreur lors de la suppression des messages :", error);
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff0000)
          .setDescription("Une erreur s'est produite lors de la suppression des messages.")
      ]
    });
  }
}

module.exports = { handleMsgsuprCommand };
