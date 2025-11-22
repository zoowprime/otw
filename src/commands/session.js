// src/commands/session.js

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");

// Rôles depuis l'env
const CITIZEN_ROLE_ID = process.env.CITIZEN_ROLE_ID;

// Stock persistant en mémoire (PAS de timeout)
const SESSIONS = new Map();
// Structure :
// SESSIONS.set(messageId, {
//   present: Set(),
//   absent: Set(),
//   late: Set(),
// });

module.exports = {
  data: new SlashCommandBuilder()
    .setName("session")
    .setDescription("Créer une session RP avec présence, absence et retard.")
    .addStringOption(o =>
      o.setName("psn")
        .setDescription("PSN du joueur")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("date")
        .setDescription("Date de la session")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("heure")
        .setDescription("Heure de la session")
        .setRequired(true)
    ),

  async execute(interaction) {
    const psn   = interaction.options.getString("psn");
    const date  = interaction.options.getString("date");
    const heure = interaction.options.getString("heure");

    // Embed de session
    const embed = new EmbedBuilder()
      .setColor("#b22222")
      .setTitle("📜 Session RP — Inscription")
      .setThumbnail("https://cdn-icons-png.flaticon.com/512/720/720310.png") // jolie icône
      .addFields(
        { name: "🎮 PSN :",   value: `**${psn}**`,  inline: true },
        { name: "📅 Date :",  value: `**${date}**`, inline: true },
        { name: "🕒 Heure :", value: `**${heure}**`, inline: true },
        { name: " ", value: "━━━━━━━━━━━━━━━━━━" },
        { name: "🟩 Présents",  value: "*Personne pour le moment…*", inline: false },
        { name: "🟥 Absents",   value: "*Personne pour le moment…*", inline: false },
        { name: "🟨 En retard", value: "*Personne pour le moment…*", inline: false },
      )
      .setFooter({
        text: "OTW • Sessions RP",
        iconURL: "https://cdn-icons-png.flaticon.com/512/4712/4712100.png"
      });

    // Boutons persistants
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("session_present")
        .setEmoji("🟩")
        .setLabel("Présent")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("session_absent")
        .setEmoji("🟥")
        .setLabel("Absent")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId("session_late")
        .setEmoji("🟨")
        .setLabel("En retard")
        .setStyle(ButtonStyle.Primary)
    );

    let msg;

    // 🔔 Mention du rôle CITIZEN au-dessus de l'embed de session
    if (CITIZEN_ROLE_ID) {
      // 1) On ping le rôle
      await interaction.reply({
        content: `<@&${CITIZEN_ROLE_ID}>`,
        allowedMentions: { roles: [CITIZEN_ROLE_ID] }
      });

      // 2) On envoie ensuite l'embed + boutons
      msg = await interaction.followUp({
        embeds: [embed],
        components: [row],
        fetchReply: true
      });
    } else {
      // Fallback : pas de rôle configuré, on envoie juste l'embed
      msg = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true
      });
    }

    // Initialise la session
    SESSIONS.set(msg.id, {
      present: new Set(),
      absent:  new Set(),
      late:    new Set()
    });

    // Collector SANS timeout global
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
    });

    collector.on("collect", async (btn) => {
      const session = SESSIONS.get(msg.id);
      if (!session) return;

      const userId = btn.user.id;

      // Remove user from all categories, then add to chosen one
      session.present.delete(userId);
      session.absent.delete(userId);
      session.late.delete(userId);

      if (btn.customId === "session_present") session.present.add(userId);
      if (btn.customId === "session_absent")  session.absent.add(userId);
      if (btn.customId === "session_late")    session.late.add(userId);

      // Build lists
      const listPresent = session.present.size
        ? [...session.present].map(id => `<@${id}>`).join("\n")
        : "*Personne pour le moment…*";

      const listAbsent = session.absent.size
        ? [...session.absent].map(id => `<@${id}>`).join("\n")
        : "*Personne pour le moment…*";

      const listLate = session.late.size
        ? [...session.late].map(id => `<@${id}>`).join("\n")
        : "*Personne pour le moment…*";

      const updated = EmbedBuilder.from(embed)
        .setFields([
          { name: "🎮 PSN :",   value: `**${psn}**`,  inline: true },
          { name: "📅 Date :",  value: `**${date}**`, inline: true },
          { name: "🕒 Heure :", value: `**${heure}**`, inline: true },
          { name: " ", value: "━━━━━━━━━━━━━━━━━━" },
          { name: "🟩 Présents",  value: listPresent },
          { name: "🟥 Absents",   value: listAbsent },
          { name: "🟨 En retard", value: listLate },
        ]);

      await btn.update({ embeds: [updated] });
    });
  }
};
