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

const {
  OPEN_TICKET_CATEGORY_ID,
  CLOSED_TICKET_CATEGORY_ID,
  STAFF_ROLE_ID
} = process.env;

// Mapping des raisons pour avoir à la fois labels et valeurs
const reasons = [
  { label: "Demande particulière",    value: "demande_particuliere" },
  { label: "Création de projet",      value: "creation_projet" },
  { label: "Dépôt dossier illégal",   value: "depot_dossier" },
  { label: "Wipe / mort RP",          value: "wipe_mort_rp" },
  { label: "Demande scène staff",     value: "demande_scene_staff" },
  { label: "Problème groupe/joueur",  value: "probleme_groupe" },
  { label: "Question pertinente",     value: "question_pertinente" }
];

/**
 * Envoie le panel pour ouvrir un ticket
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

  const select = new StringSelectMenuBuilder()
    .setCustomId("ticket_reason_select")
    .setPlaceholder("Choisissez une raison…")
    .addOptions(reasons);

  const row = new ActionRowBuilder().addComponents(select);

  await channel.send({ embeds: [embed], components: [row] });
}

/**
 * Gère toutes les interactions du système de ticket
 */
async function handleTicketInteraction(interaction) {
  // 1️⃣ Sélection de la raison → création du salon
  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_reason_select") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const choice = interaction.values[0];
    const reason = reasons.find(r => r.value === choice)?.label || choice;

    // Création du salon
    try {
      const channel = await interaction.guild.channels.create({
        name: `${interaction.user.username}-${choice}`,
        type: 0,
        parent: OPEN_TICKET_CATEGORY_ID,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: ["ViewChannel"] },
          { id: interaction.user.id, allow: ["ViewChannel","SendMessages","ReadMessageHistory"] },
          { id: STAFF_ROLE_ID, allow: ["ViewChannel","SendMessages","ReadMessageHistory"] }
        ]
      });

      // Embed d’accueil
      const welcomeEmbed = new EmbedBuilder()
        .setTitle(`Ticket – ${interaction.user.tag}`)
        .setDescription(
          `**Raison :** ${reason}\n\n` +
          "Un membre de l'équipe **STAFF HOLLOWAY - OTW** vous prendra en charge le plus vite possible."
        )
        .setColor(0xff0000);

      // Bouton Fermer
      const closeBtn = new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Fermer le ticket")
        .setStyle(ButtonStyle.Secondary);

      await channel.send({ embeds: [welcomeEmbed], components: [new ActionRowBuilder().addComponents(closeBtn)] });

      // Confirmation éphémère
      return interaction.editReply({
        content: `✅ Votre ticket a été créé : ${channel}`,
        flags: MessageFlags.Ephemeral
      });
    } catch (err) {
      console.error("Erreur création ticket :", err);
      return interaction.editReply({
        content: "❌ Impossible de créer le ticket.",
        flags: MessageFlags.Ephemeral
      });
    }
  }

  // 2️⃣ Bouton Fermer → déplacer en fermé + afficher Réouvrir/Supprimer
  if (interaction.isButton() && interaction.customId === "close_ticket") {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: "❌ Vous n'avez pas la permission.",
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await interaction.channel.setParent(CLOSED_TICKET_CATEGORY_ID);

      // Nouvel embed
      const closedEmbed = new EmbedBuilder()
        .setTitle("Ticket fermé")
        .setDescription("Ce ticket est désormais fermé.")
        .setColor(0x555555);

      // Boutons Réouvrir & Supprimer
      const reopenBtn = new ButtonBuilder()
        .setCustomId("reopen_ticket")
        .setLabel("Réouvrir")
        .setStyle(ButtonStyle.Primary);

      const deleteBtn = new ButtonBuilder()
        .setCustomId("delete_ticket")
        .setLabel("Supprimer")
        .setStyle(ButtonStyle.Danger);

      await interaction.channel.send({
        embeds: [closedEmbed],
        components: [new ActionRowBuilder().addComponents(reopenBtn, deleteBtn)]
      });

      return interaction.editReply({ content: "🔒 Ticket fermé.", flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error("Erreur fermeture ticket :", err);
      return interaction.editReply({
        content: "❌ Impossible de fermer le ticket.",
        flags: MessageFlags.Ephemeral
      });
    }
  }

  // 3️⃣ Bouton Réouvrir → déplacer en ouvert + bouton Fermer
  if (interaction.isButton() && interaction.customId === "reopen_ticket") {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: "❌ Vous n'avez pas la permission.",
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await interaction.channel.setParent(OPEN_TICKET_CATEGORY_ID);

      const reopenEmbed = new EmbedBuilder()
        .setTitle("Ticket réouvert")
        .setDescription("Le ticket a été réouvert.")
        .setColor(0x00AA00);

      const closeBtn = new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Fermer le ticket")
        .setStyle(ButtonStyle.Secondary);

      await interaction.channel.send({
        embeds: [reopenEmbed],
        components: [new ActionRowBuilder().addComponents(closeBtn)]
      });

      return interaction.editReply({ content: "🔓 Ticket réouvert.", flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error("Erreur réouverture ticket :", err);
      return interaction.editReply({
        content: "❌ Impossible de réouvrir le ticket.",
        flags: MessageFlags.Ephemeral
      });
    }
  }

  // 4️⃣ Bouton Supprimer → supprime le canal
  if (interaction.isButton() && interaction.customId === "delete_ticket") {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: "❌ Vous n'avez pas la permission.",
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.reply({ content: "🗑️ Suppression du ticket…", flags: MessageFlags.Ephemeral });
    setTimeout(() => {
      interaction.channel.delete().catch(console.error);
    }, 1500);

    return;
  }
}

module.exports = {
  sendTicketPanel,
  handleTicketInteraction
};
