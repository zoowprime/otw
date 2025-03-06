// src/ticket.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function sendTicketPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle("Ouvrir un Ticket")
    .setDescription("Cliquez sur le bouton ci-dessous pour ouvrir un ticket.")
    .setColor(0xff0000);
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("open_ticket")
      .setLabel("Ouvrir un ticket")
      .setStyle(ButtonStyle.Danger)
  );
  
  channel.send({ embeds: [embed], components: [row] });
}

// Gestion des interactions pour le ticket
async function handleTicketInteraction(interaction) {
  if (interaction.isButton() && interaction.customId === "open_ticket") {
    // Vérifiez que l'interaction provient d'un serveur
    if (!interaction.guild) return interaction.reply({ content: "Cette commande ne peut être utilisée que dans un serveur.", ephemeral: true });
    
    const openCategoryId = process.env.OPEN_TICKET_CATEGORY_ID;
    if (!openCategoryId) {
      return interaction.reply({ content: "La catégorie pour les tickets ouverts n'est pas configurée.", ephemeral: true });
    }
    
    // Créez un canal de ticket dans la catégorie dédiée
    const ticketChannelName = `ticket-${interaction.user.username}-${Date.now()}`;
    try {
      const ticketChannel = await interaction.guild.channels.create({
        name: ticketChannelName,
        type: 0, // type textuel
        parent: openCategoryId,
        permissionOverwrites: [
          {
            id: interaction.guild.id, // @everyone
            deny: ["ViewChannel"],
          },
          {
            id: interaction.user.id,
            allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
          },
          // Optionnel : ajouter ici un rôle staff pour qu'ils puissent voir tous les tickets
          {
            id: process.env.BANQUIER_ROLE_ID,
            allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
          },
        ],
      });
      
      // Répondre à l'interaction de manière éphémère
      await interaction.reply({ content: `Votre ticket a été créé: ${ticketChannel}`, ephemeral: true });
      
      // Envoyer un message de bienvenue dans le canal du ticket
      const ticketEmbed = new EmbedBuilder()
        .setTitle("Ticket Ouvert")
        .setDescription("Merci d'avoir ouvert un ticket. Un membre du staff vous contactera sous peu.")
        .setColor(0xff0000);
      
      ticketChannel.send({ embeds: [ticketEmbed] });
    } catch (error) {
      console.error(error);
      return interaction.reply({ content: "Une erreur est survenue lors de la création du ticket.", ephemeral: true });
    }
  }
}

module.exports = (client) => {
  return {
    sendTicketPanel,
    handleTicketInteraction
  };
};
