// src/ticket.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SelectMenuBuilder
} = require('discord.js');
require('dotenv').config({ path: './id.env' });

/**
 * Envoie le panel initial pour ouvrir un ticket dans le canal spécifié.
 * @param {TextChannel} channel 
 */
async function sendTicketPanel(channel) {
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

  await channel.send({ embeds: [embed], components: [row] });
}

/**
 * Gère les interactions liées aux tickets.
 * - Bouton "open_ticket" : Crée un canal ticket dans la catégorie définie.
 * - Menu de sélection "ticket_type_select" : Permet à l'utilisateur de choisir le type de ticket.
 * - Bouton "close_ticket" : Permet au staff de fermer le ticket.
 * - Bouton "delete_ticket" : Permet au staff de supprimer le canal après fermeture.
 * @param {ButtonInteraction | SelectMenuInteraction} interaction 
 */
async function handleTicketInteraction(interaction) {
  // Gestion du bouton "Ouvrir un ticket"
  if (interaction.isButton() && interaction.customId === "open_ticket") {
    // Différer la réponse pour éviter l'échec d'interaction
    await interaction.deferReply({ ephemeral: true });
    
    if (!interaction.guild) {
      return interaction.editReply({ content: "Cette action ne peut être utilisée que dans un serveur." });
    }
    
    const openCategoryId = process.env.OPEN_TICKET_CATEGORY_ID;
    if (!openCategoryId) {
      return interaction.editReply({ content: "La catégorie pour les tickets ouverts n'est pas configurée." });
    }
    
    // Créer un canal de ticket avec un nom unique
    const ticketChannelName = `ticket-${interaction.user.username}-${Date.now()}`;
    try {
      const ticketChannel = await interaction.guild.channels.create({
        name: ticketChannelName,
        type: 0, // Canal textuel
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
          {
            id: process.env.STAFF_ROLE_ID,
            allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
          },
        ],
      });

      await interaction.editReply({ content: `Votre ticket a été créé: ${ticketChannel}` });

      // Dans le canal du ticket, envoyer un embed avec un menu de sélection pour le type de ticket
      const ticketEmbed = new EmbedBuilder()
        .setTitle("Ouverture de Ticket")
        .setDescription("Quel type de ticket souhaitez-vous ouvrir ?")
        .setColor(0xff0000);

      const options = [
        { label: "Demande particulière (externe au serveur)", value: "demande_particuliere" },
        { label: "Création de projet", value: "creation_projet" },
        { label: "Dépôt dossier groupe illégal", value: "depot_dossier" },
        { label: "Wipe (changement de personnage ou mort RP)", value: "wipe" },
        { label: "Demande de mort RP", value: "demande_mort_rp" },
        { label: "Demande de scène staff", value: "demande_scene_staff" },
        { label: "Problème avec un groupe/joueur", value: "probleme_groupe" },
        { label: "Question pertinente", value: "question_pertinente" },
      ];

      const selectMenu = new SelectMenuBuilder()
        .setCustomId("ticket_type_select")
        .setPlaceholder("Sélectionnez le type de ticket")
        .addOptions(options);

      const selectRow = new ActionRowBuilder().addComponents(selectMenu);

      await ticketChannel.send({ embeds: [ticketEmbed], components: [selectRow] });
    } catch (error) {
      console.error("Erreur lors de la création du ticket:", error);
      return interaction.editReply({ content: "Une erreur est survenue lors de la création du ticket." });
    }
  }

  // Gestion du menu de sélection du type de ticket
  else if (interaction.isSelectMenu() && interaction.customId === "ticket_type_select") {
    await interaction.deferUpdate();
    const selectedType = interaction.values[0];
    // Mettre à jour le nom du canal pour inclure le type de ticket
    await interaction.channel.setName(`ticket-${selectedType}-${interaction.user.username}`);
    const replyEmbed = new EmbedBuilder()
      .setTitle("Ticket ouvert")
      .setDescription(`Vous avez sélectionné: **${selectedType}**.\nUn membre du staff vous contactera sous peu.`)
      .setColor(0xff0000);
    await interaction.channel.send({ embeds: [replyEmbed] });

    // Ajouter un bouton pour fermer le ticket (visible uniquement aux staffs)
    const closeButton = new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Fermer le ticket")
      .setStyle(ButtonStyle.Secondary);
    const closeRow = new ActionRowBuilder().addComponents(closeButton);
    await interaction.channel.send({ content: "Staff uniquement:", components: [closeRow] });
  }

  // Gestion du bouton "Fermer le ticket"
  else if (interaction.isButton() && interaction.customId === "close_ticket") {
    // Seul un membre ayant le rôle staff peut fermer le ticket
    if (!interaction.member.roles.cache.has(process.env.STAFF_ROLE_ID)) {
      return interaction.reply({ content: "Vous n'avez pas la permission de fermer ce ticket.", ephemeral: true });
    }
    await interaction.deferUpdate();
    const closedCategory = process.env.CLOSED_TICKET_CATEGORY_ID;
    if (!closedCategory) return interaction.editReply({ content: "La catégorie des tickets fermés n'est pas configurée." });
    
    // Déplacer le canal dans la catégorie des tickets fermés
    await interaction.channel.setParent(closedCategory);
    
    // Envoyer un embed indiquant que le ticket est fermé et proposer un bouton pour le supprimer
    const closedEmbed = new EmbedBuilder()
      .setTitle("Ticket fermé")
      .setDescription("Le ticket a été fermé. Cliquez sur le bouton ci-dessous pour supprimer ce ticket.")
      .setColor(0xff0000);
    const deleteButton = new ButtonBuilder()
      .setCustomId("delete_ticket")
      .setLabel("Supprimer le ticket")
      .setStyle(ButtonStyle.Danger);
    const deleteRow = new ActionRowBuilder().addComponents(deleteButton);
    await interaction.channel.send({ embeds: [closedEmbed], components: [deleteRow] });
  }

  // Gestion du bouton "Supprimer le ticket"
  else if (interaction.isButton() && interaction.customId === "delete_ticket") {
    if (!interaction.member.roles.cache.has(process.env.STAFF_ROLE_ID)) {
      return interaction.reply({ content: "Vous n'avez pas la permission de supprimer ce ticket.", ephemeral: true });
    }
    await interaction.reply({ content: "Suppression du ticket...", ephemeral: true });
    setTimeout(() => {
      interaction.channel.delete().catch(console.error);
    }, 3000);
  }
}

module.exports = (client) => {
  // On enregistre l'écouteur pour les interactions de ticket dans ce module.
  client.on('interactionCreate', async (interaction) => {
    // Nous gérons ici uniquement les interactions liées aux tickets.
    await handleTicketInteraction(interaction);
  });

  return { sendTicketPanel };
};
