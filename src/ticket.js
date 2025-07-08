// src/ticket.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags
} = require('discord.js');
require('dotenv').config({ path: './id.env' });

/**
 * Envoie le panel initial pour ouvrir un ticket dans le canal spécifié.
 * @param {TextChannel} channel 
 */
async function sendTicketPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle("Ouvrir un Ticket")
    .setDescription(
      "👋 BONJOUR À TOUS 👋\n" +
      "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n" +
      "MERCI DE SÉLECTIONNER UNE RAISON EN RAPPORT AVEC VOTRE SOUCI OU VOTRE DEMANDE.\n" +
      "TOUT TICKET INACTIF SERA FERMÉ !\n" +
      "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬"
    )
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
 * @param {Interaction} interaction 
 */
async function handleTicketInteraction(interaction) {
  // ─── Ouvrir un ticket ─────────────────────────────
  if (interaction.isButton() && interaction.customId === "open_ticket") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.guild) {
      return interaction.editReply({
        content: "Cette action ne peut être utilisée que dans un serveur.",
        flags: MessageFlags.Ephemeral
      });
    }

    const openCategoryId = process.env.OPEN_TICKET_CATEGORY_ID;
    if (!openCategoryId) {
      return interaction.editReply({
        content: "La catégorie pour les tickets ouverts n'est pas configurée.",
        flags: MessageFlags.Ephemeral
      });
    }

    const ticketChannelName = `ticket-${interaction.user.username}-${Date.now()}`;

    try {
      const ticketChannel = await interaction.guild.channels.create({
        name: ticketChannelName,
        type: 0, // textuel
        parent: openCategoryId,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: ["ViewChannel"] },
          { id: interaction.user.id, allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"] },
          { id: process.env.STAFF_ROLE_ID, allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"] },
        ],
      });

      await interaction.editReply({
        content: `Votre ticket a été créé : ${ticketChannel}`,
        flags: MessageFlags.Ephemeral
      });

      // Menu de sélection
      const ticketEmbed = new EmbedBuilder()
        .setTitle("Ouverture de Ticket")
        .setDescription("Quel type de ticket souhaitez-vous ouvrir ?")
        .setColor(0xff0000);

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("ticket_type_select")
        .setPlaceholder("Sélectionnez le type de ticket")
        .addOptions([
          { label: "Demande particulière",        value: "demande_particuliere" },
          { label: "Création de projet",          value: "creation_projet" },
          { label: "Dépôt dossier illégal",       value: "depot_dossier" },
          { label: "Wipe / mort RP",              value: "wipe" },
          { label: "Demande de mort RP",          value: "demande_mort_rp" },
          { label: "Demande scène staff",         value: "demande_scene_staff" },
          { label: "Problème groupe/joueur",      value: "probleme_groupe" },
          { label: "Question pertinente",         value: "question_pertinente" },
        ]);

      const selectRow = new ActionRowBuilder().addComponents(selectMenu);
      await ticketChannel.send({ embeds: [ticketEmbed], components: [selectRow] });
    } catch (error) {
      console.error("Erreur lors de la création du ticket :", error);
      return interaction.editReply({
        content: "Une erreur est survenue lors de la création du ticket.",
        flags: MessageFlags.Ephemeral
      });
    }

    return;
  }

  // ─── Choix du type de ticket ────────────────────
  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_type_select") {
    await interaction.deferUpdate();
    const selectedType = interaction.values[0];

    await interaction.channel.setName(`ticket-${selectedType}-${interaction.user.username}`);

    const replyEmbed = new EmbedBuilder()
      .setTitle("Ticket ouvert")
      .setDescription(
        `Vous avez sélectionné : **${selectedType}**.\n` +
        `Un membre de l'équipe STAFF OTW vous prendra en charge le plus vite possible.`
      )
      .setColor(0xff0000);

    await interaction.channel.send({ embeds: [replyEmbed] });
    await interaction.message.delete().catch(console.error);

    const closeButton = new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Fermer le ticket")
      .setStyle(ButtonStyle.Secondary);
    const closeRow = new ActionRowBuilder().addComponents(closeButton);
    await interaction.channel.send({ content: "Staff uniquement :", components: [closeRow] });
    return;
  }

  // ─── Fermer le ticket ──────────────────────────
  if (interaction.isButton() && interaction.customId === "close_ticket") {
    if (!interaction.member.roles.cache.has(process.env.STAFF_ROLE_ID)) {
      return interaction.reply({
        content: "Vous n'avez pas la permission de fermer ce ticket.",
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const closedCategory = process.env.CLOSED_TICKET_CATEGORY_ID;
    if (!closedCategory) {
      return interaction.editReply({
        content: "La catégorie des tickets fermés n'est pas configurée.",
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.channel.setParent(closedCategory);

    const closedEmbed = new EmbedBuilder()
      .setTitle("Ticket fermé")
      .setDescription("Le ticket a été fermé. Cliquez sur le bouton ci-dessous pour le supprimer.")
      .setColor(0xff0000);

    const deleteButton = new ButtonBuilder()
      .setCustomId("delete_ticket")
      .setLabel("Supprimer le ticket")
      .setStyle(ButtonStyle.Danger);
    const deleteRow = new ActionRowBuilder().addComponents(deleteButton);

    await interaction.channel.send({ embeds: [closedEmbed], components: [deleteRow] });
    return;
  }

  // ─── Supprimer le ticket ───────────────────────
  if (interaction.isButton() && interaction.customId === "delete_ticket") {
    if (!interaction.member.roles.cache.has(process.env.STAFF_ROLE_ID)) {
      return interaction.reply({
        content: "Vous n'avez pas la permission de supprimer ce ticket.",
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await interaction.editReply({ content: "Suppression du ticket en cours…", flags: MessageFlags.Ephemeral });
    setTimeout(() => interaction.channel.delete().catch(console.error), 3000);
    return;
  }
}

module.exports = {
  sendTicketPanel,
  handleTicketInteraction
};
