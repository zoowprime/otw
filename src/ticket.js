zow
nxzow
zowgoat

C'est le début du salon #bot-otw-2. 
zow — 09/06/2025 17:40
// Gestion commandes session lancee
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  const role = interaction.guild.roles.cache.get('1378037596566978561');
  const member = interaction.member;
  if (!role || !member) return;
  try {
    if (interaction.customId === 'en_ville') {
      await member.roles.add(role);
      await interaction.reply({ content: ✅ ${member} est maintenant marqué comme en ville., ephemeral: true });
    } else if (interaction.customId === 'deconnecte') {
      await member.roles.remove(role);
      await interaction.reply({ content: ❌ ${member} a été marqué comme déconnecté., ephemeral: true });
    }
  } catch (err) {
    console.error('Erreur lors de l’attribution du rôle :', err);
    await interaction.reply({ content: '❗ Une erreur est survenue.', ephemeral: true });
  }
});
zow — Hier à 22:43
require('dotenv').config({ path: './id.env' });
const { Client, GatewayIntentBits, Collection, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Modules internes
Afficher plus
message.txt
7 Ko
zow — 02:20
require('dotenv').config({ path: './id.env' });
const { Client, GatewayIntentBits, Collection, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Modules internes
Afficher plus
message.txt
9 Ko
zow — 02:52

// src/ticket.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
Afficher plus
message.txt
8 Ko
﻿

// src/ticket.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
require('dotenv').config({ path: './id.env' });

/**
 * Envoie le panel initial pour ouvrir un ticket dans le canal spécifié.
 * @param {TextChannel} channel 
 */
async function sendTicketPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle("Ouvrir un Ticket")
    .setDescription("👋 BONJOUR À TOUS 👋▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ MERCI DE SÉLECTIONNER UNE RAISON EN RAPPORT AVEC VOTRE SOUCI OU VOTRE DEMANDE. TOUT TICKET INACTIF SERA FERMÉ ! ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬.")
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
 * - Bouton "open_ticket" : création d'un canal ticket.
 * - Menu de sélection "ticket_type_select" : choix du type de ticket, renommage du canal et suppression du message d'origine.
 * - Bouton "close_ticket" et "delete_ticket" : fermeture et suppression du ticket.
 * @param {Interaction} interaction 
 */
async function handleTicketInteraction(interaction) {
  // Gestion du bouton "Ouvrir un ticket"
  if (interaction.isButton() && interaction.customId === "open_ticket") {
    await interaction.deferReply({ flags: 64 }); // Accuser réception de manière éphémère
    if (!interaction.guild) {
      return interaction.editReply({ content: "Cette action ne peut être utilisée que dans un serveur." });
    }
    const openCategoryId = process.env.OPEN_TICKET_CATEGORY_ID;
    if (!openCategoryId) {
      return interaction.editReply({ content: "La catégorie pour les tickets ouverts n'est pas configurée." });
    }
    const ticketChannelName = ticket-${interaction.user.username}-${Date.now()};
    try {
      const ticketChannel = await interaction.guild.channels.create({
        name: ticketChannelName,
        type: 0, // Canal textuel
        parent: openCategoryId,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: ["ViewChannel"] },
          { id: interaction.user.id, allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"] },
          { id: process.env.STAFF_ROLE_ID, allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"] },
        ],
      });
      await interaction.editReply({ content: Votre ticket a été créé: ${ticketChannel} });

      // Envoyer l'embed avec le menu de sélection du type de ticket
      const ticketEmbed = new EmbedBuilder()
        .setTitle("Ouverture de Ticket")
        .setDescription("Quel type de ticket souhaitez-vous ouvrir ?")
        .setColor(0xff0000);

      // Utilisez StringSelectMenuBuilder (remplace SelectMenuBuilder)
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("ticket_type_select")
        .setPlaceholder("Sélectionnez le type de ticket")
        .addOptions([
          { label: "Demande particulière (externe au serveur)", value: "demande_particuliere" },
          { label: "Création de projet", value: "creation_projet" },
          { label: "Dépôt dossier groupe illégal", value: "depot_dossier" },
          { label: "Wipe (changement de personnage ou mort RP)", value: "wipe" },
          { label: "Demande de mort RP", value: "demande_mort_rp" },
          { label: "Demande de scène staff", value: "demande_scene_staff" },
          { label: "Problème avec un groupe/joueur", value: "probleme_groupe" },
          { label: "Question pertinente", value: "question_pertinente" },
        ]);

      const selectRow = new ActionRowBuilder().addComponents(selectMenu);

      // Envoyer le message et conserver la référence pour pouvoir le supprimer plus tard
      const selectionMessage = await ticketChannel.send({ embeds: [ticketEmbed], components: [selectRow] });
    } catch (error) {
      console.error("Erreur lors de la création du ticket:", error);
      return interaction.editReply({ content: "Une erreur est survenue lors de la création du ticket." });
    }
  }
  // Gestion du menu de sélection pour le type de ticket
  else if (interaction.isStringSelectMenu() && interaction.customId === "ticket_type_select") {
    await interaction.deferUpdate();
    const selectedType = interaction.values[0];
    // Renommer le canal pour y inclure le type de ticket sélectionné
    await interaction.channel.setName(ticket-${selectedType}-${interaction.user.username});
    
    // Envoyer une confirmation dans le canal
    const replyEmbed = new EmbedBuilder()
      .setTitle("Ticket ouvert")
      .setDescription(Vous avez sélectionné: **${selectedType}**.\nUn membre de l'équipe STAFF OTW vous prendra en charge le plus vite possible.)
      .setColor(0xff0000);
    await interaction.channel.send({ embeds: [replyEmbed] });

    // Supprimer le message contenant le menu de sélection pour "faire disparaître" l'embed
    await interaction.message.delete().catch(console.error);

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
    if (!interaction.member.roles.cache.has(process.env.STAFF_ROLE_ID)) {
      return interaction.reply({ content: "Vous n'avez pas la permission de fermer ce ticket.", flags: 64 });
    }
    await interaction.deferReply({ flags: 64 });
    const closedCategory = process.env.CLOSED_TICKET_CATEGORY_ID;
    if (!closedCategory) return interaction.editReply({ content: "La catégorie des tickets fermés n'est pas configurée." });
    await interaction.channel.setParent(closedCategory);
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
      return interaction.reply({ content: "Vous n'avez pas la permission de supprimer ce ticket.", flags: 64 });
    }
    await interaction.deferReply({ flags: 64 });
    await interaction.editReply({ content: "Suppression du ticket..." });
    setTimeout(() => {
      interaction.channel.delete().catch(console.error);
    }, 3000);
  }
}

module.exports = {
  sendTicketPanel,
  handleTicketInteraction,
};
message.txt
8 Ko
