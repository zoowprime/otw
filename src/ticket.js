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

async function handleTicketInteraction(interaction) {
  // ─── Ouvrir un ticket ─────────────────────────────
  if (interaction.isButton() && interaction.customId === "open_ticket") {
    // 1) Ack
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // 2) Vérifs
    if (!interaction.guild) {
      return interaction.editReply({
        content: "Cette action ne peut être utilisée que dans un serveur.",
        flags: MessageFlags.Ephemeral
      });
    }
    const openCat = process.env.OPEN_TICKET_CATEGORY_ID;
    if (!openCat) {
      return interaction.editReply({
        content: "La catégorie pour les tickets ouverts n'est pas configurée.",
        flags: MessageFlags.Ephemeral
      });
    }

    // 3) Création du salon
    let ticketChannel;
    try {
      ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}-${Date.now()}`,
        type: 0,
        parent: openCat,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: ["ViewChannel"] },
          { id: interaction.user.id, allow: ["ViewChannel","SendMessages","ReadMessageHistory"] },
          { id: process.env.STAFF_ROLE_ID, allow: ["ViewChannel","SendMessages","ReadMessageHistory"] },
        ]
      });

      // 4) Confirmation à l’auteur
      await interaction.editReply({
        content: `Votre ticket a été créé: ${ticketChannel}`,
        flags: MessageFlags.Ephemeral
      });

      // 5) Menu de sélection dans le ticket
      const ticketEmbed = new EmbedBuilder()
        .setTitle("Ouverture de Ticket")
        .setDescription("Quel type de ticket souhaitez-vous ouvrir ?")
        .setColor(0xff0000);
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("ticket_type_select")
        .setPlaceholder("Sélectionnez le type de ticket")
        .addOptions([
          { label: "Demande particulière", value: "demande_particuliere" },
          { label: "Création de projet",    value: "creation_projet" },
          { label: "Dépôt dossier",         value: "depot_dossier" },
          { label: "Wipe / mort RP",        value: "wipe" },
          { label: "Demande mort RP",       value: "demande_mort_rp" },
          { label: "Demande scène staff",   value: "demande_scene_staff" },
          { label: "Problème groupe",       value: "probleme_groupe" },
          { label: "Question pertinente",   value: "question_pertinente" },
        ]);
      const selectRow = new ActionRowBuilder().addComponents(selectMenu);
      await ticketChannel.send({ embeds: [ticketEmbed], components: [selectRow] });

    } catch (err) {
      console.error("Erreur création ticket :", err);
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

    const confirmEmbed = new EmbedBuilder()
      .setTitle("Ticket ouvert")
      .setDescription(`Vous avez sélectionné **${selectedType}**.\nUn membre STAFF vous prendra en charge rapidement.`)
      .setColor(0xff0000);
    await interaction.channel.send({ embeds: [confirmEmbed] });

    // Supprime le menu original
    await interaction.message.delete().catch(() => {});
    // Ajoute bouton de fermeture
    const closeBtn = new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Fermer le ticket")
      .setStyle(ButtonStyle.Secondary);
    await interaction.channel.send({ content: "Staff only:", components: [new ActionRowBuilder().addComponents(closeBtn)] });
    return;
  }

  // ─── Fermer le ticket ──────────────────────────
  if (interaction.isButton() && interaction.customId === "close_ticket") {
    // Vérif rôle staff
    if (!interaction.member.roles.cache.has(process.env.STAFF_ROLE_ID)) {
      return interaction.reply({
        content: "Vous n'avez pas la permission de fermer ce ticket.",
        flags: MessageFlags.Ephemeral
      });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const closedCat = process.env.CLOSED_TICKET_CATEGORY_ID;
    if (!closedCat) {
      return interaction.editReply({
        content: "La catégorie des tickets fermés n'est pas configurée.",
        flags: MessageFlags.Ephemeral
      });
    }
    await interaction.channel.setParent(closedCat);

    const closedEmbed = new EmbedBuilder()
      .setTitle("Ticket fermé")
      .setDescription("Le ticket est fermé. Cliquez pour supprimer :")
      .setColor(0xff0000);
    const delBtn = new ButtonBuilder()
      .setCustomId("delete_ticket")
      .setLabel("Supprimer le ticket")
      .setStyle(ButtonStyle.Danger);
    await interaction.channel.send({ embeds: [closedEmbed], components: [new ActionRowBuilder().addComponents(delBtn)] });
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
    await interaction.editReply({ content: "Suppression en cours…", flags: MessageFlags.Ephemeral });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
    return;
  }
}

module.exports = {
  sendTicketPanel,
  handleTicketInteraction
};
