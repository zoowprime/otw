// src/commands/wl.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const CITIZEN_ROLE_ID = process.env.CITIZEN_ROLE_ID; // rôle citoyen / WL
const ORAL_A_FAIRE = process.env.ORAL_A_FAIRE; // rôle à ping / retirer
const VALID_WL_CHANNEL_ID = process.env.VALID_WL_CHANNEL_ID;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;

const FOOTER = { text: "Old Town Western — Whitelist" };

function isStaff(member) {
  if (!STAFF_ROLE_ID) return false;
  return member.roles.cache.has(STAFF_ROLE_ID);
}

function canManageRole(guild, roleId) {
  try {
    const me = guild.members.me;
    const role = guild.roles.cache.get(roleId);
    if (!me || !role) return false;
    return me.roles.highest.comparePositionTo(role) > 0;
  } catch {
    return false;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wl")
    .setDescription("Gestion de la whitelist OTW.")
    .addSubcommand((sc) =>
      sc
        .setName("annonce")
        .setDescription("Annonce une session d’oraux de whitelist.")
        .addStringOption((o) =>
          o
            .setName("debut")
            .setDescription("Heure de début (ex: 20h30)")
            .setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName("fin")
            .setDescription("Heure de fin (ex: 23h00)")
            .setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("valider")
        .setDescription("Valider la whitelist d’un joueur.")
        .addUserOption((o) =>
          o
            .setName("joueur")
            .setDescription("Joueur à whitelister")
            .setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName("type")
            .setDescription("Type de whitelist (ex: citoyen, illégale...)")
            .setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName("infos")
            .setDescription("Infos supplémentaires (faction, gang, métier...)")
            .setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName("parrain")
            .setDescription("Parrainé par (facultatif)")
            .setRequired(false)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("fermer")
        .setDescription("Annoncer la fermeture des oraux WL.")
    )
    // on met une permission de base côté Discord
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const member = interaction.member;

    // sécurité staff
    if (!isStaff(member)) {
      const emb = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle("⛔ Accès refusé")
        .setDescription(
          "Tu n’as pas la permission d’utiliser ces commandes (réservé au staff)."
        )
        .setFooter(FOOTER);
      return interaction.reply({ embeds: [emb], ephemeral: true });
    }

    // ─────────────────────────────
    // /wl annonce
    if (sub === "annonce") {
      const debut = interaction.options.getString("debut");
      const fin = interaction.options.getString("fin");

      if (!ORAL_A_FAIRE) {
        const emb = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("⚙️ Configuration manquante")
          .setDescription(
            "La variable `ORAL_A_FAIRE` est manquante dans ton id.env."
          )
          .setFooter(FOOTER);
        return interaction.reply({ embeds: [emb], ephemeral: true });
      }

      const roleMention = `<@&${ORAL_A_FAIRE}>`;

      const emb = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("📣 Session d’oraux Whitelist")
        .setDescription(
          [
            "Les **oraux pour passer la whitelist** sont désormais **ouverts**.",
            "",
            `🕒 **Horaires :** \`${debut}\` ➜ \`${fin}\``,
            "",
            "Merci de rester disponibles et attentifs aux appels du staff.",
          ].join("\n")
        )
        .setFooter(FOOTER);

      return interaction.reply({
        content: roleMention,
        embeds: [emb],
      });
    }

    // ─────────────────────────────
    // /wl valider
    if (sub === "valider") {
      const user = interaction.options.getUser("joueur");
      const type = interaction.options.getString("type");
      const infos = interaction.options.getString("infos");
      const parrain =
        interaction.options.getString("parrain") || "aucun parrain";

      if (!CITIZEN_ROLE_ID || !ORAL_A_FAIRE || !VALID_WL_CHANNEL_ID) {
        const missing = [];
        if (!CITIZEN_ROLE_ID) missing.push("CITIZEN_ROLE_ID");
        if (!ORAL_A_FAIRE) missing.push("ORAL_A_FAIRE");
        if (!VALID_WL_CHANNEL_ID) missing.push("VALID_WL_CHANNEL_ID");

        const emb = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("⚙️ Configuration manquante")
          .setDescription(
            "Les variables suivantes sont manquantes dans ton id.env :\n```" +
              missing.join(", ") +
              "```"
          )
          .setFooter(FOOTER);
        return interaction.reply({ embeds: [emb], ephemeral: true });
      }

      const guild = interaction.guild;
      const targetMember = await guild.members
        .fetch(user.id)
        .catch(() => null);

      if (!targetMember) {
        const emb = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("❌ Joueur introuvable")
          .setDescription("Cet utilisateur n’est pas présent sur le serveur.")
          .setFooter(FOOTER);
        return interaction.reply({ embeds: [emb], ephemeral: true });
      }

      // Vérif que le bot peut gérer les rôles
      if (!canManageRole(guild, CITIZEN_ROLE_ID)) {
        const emb = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("❌ Rôle citoyen inatteignable")
          .setDescription(
            "Le bot n’a pas la hiérarchie suffisante pour attribuer le rôle citoyen / whitelist."
          )
          .setFooter(FOOTER);
        return interaction.reply({ embeds: [emb], ephemeral: true });
      }
      if (!canManageRole(guild, ORAL_A_FAIRE)) {
        const emb = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("❌ Rôle ORAL_A_FAIRE inatteignable")
          .setDescription(
            "Le bot n’a pas la hiérarchie suffisante pour retirer le rôle des oraux."
          )
          .setFooter(FOOTER);
        return interaction.reply({ embeds: [emb], ephemeral: true });
      }

      // Embed d’infos WL (style de ton screen)
      const wlEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("📜 Informations de la Whitelist")
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          {
            name: "👤 Membre",
            value: `${user}\n(\`${user.id}\`)`,
            inline: false,
          },
          {
            name: "🏷️ Type de Whitelist",
            value: type,
            inline: false,
          },
          {
            name: "ℹ️ Infos Supp.",
            value: infos,
            inline: false,
          },
          {
            name: "🤝 Parrainé par",
            value: parrain,
            inline: false,
          },
          {
            name: "✅ Whitelist par",
            value: `${interaction.user}`,
            inline: false,
          }
        )
        .setTimestamp()
        .setFooter(FOOTER);

      // DM au joueur
      let dmOk = true;
      try {
        await user.send(
          [
            `Bonjour ${user},`,
            "",
            `Félicitations ! Vous avez été ajouté à la **whitelist d’Old Town Western** en tant que **${type}**.`,
            "",
            `**Informations supplémentaires :** ${infos}`,
            "",
            "Bienvenue sur le serveur !",
          ].join("\n")
        );
        await user.send({ embeds: [wlEmbed] });
      } catch {
        dmOk = false;
      }

      // Mise à jour des rôles
      let rolesOk = true;
      try {
        if (targetMember.roles.cache.has(ORAL_A_FAIRE)) {
          await targetMember.roles.remove(
            ORAL_A_FAIRE,
            "[WL] Retrait rôle ORAL_A_FAIRE"
          );
        }
        if (!targetMember.roles.cache.has(CITIZEN_ROLE_ID)) {
          await targetMember.roles.add(
            CITIZEN_ROLE_ID,
            "[WL] Attribution rôle citoyen / whitelist"
          );
        }
      } catch {
        rolesOk = false;
      }

      // Envoi dans le salon VALID_WL
      let logOk = true;
      try {
        const logChannel = await interaction.client.channels
          .fetch(VALID_WL_CHANNEL_ID)
          .catch(() => null);
        if (logChannel) {
          await logChannel.send({
            content: `Bonjour ${user},`,
            embeds: [wlEmbed],
          });
        } else {
          logOk = false;
        }
      } catch {
        logOk = false;
      }

      // Réponse au staff
      const summary = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("✅ Whitelist appliquée")
        .setDescription(
          [
            `Le joueur ${user} a été **whitelist** avec succès.`,
            "",
            `📨 DM : ${dmOk ? "✅ envoyé" : "⚠️ impossible (MP fermés ?)"}\n`,
            `🎭 Rôles : ${rolesOk ? "✅ mis à jour" : "⚠️ échec (hiérarchie / permissions ?)"}\n`,
            `📂 Salon de validation : ${
              logOk ? "✅ message envoyé" : "⚠️ impossible"
            }`,
          ].join("\n")
        )
        .setFooter(FOOTER);

      return interaction.reply({ embeds: [summary], ephemeral: true });
    }

    // ─────────────────────────────
    // /wl fermer
    if (sub === "fermer") {
      if (!ORAL_A_FAIRE) {
        const emb = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("⚙️ Configuration manquante")
          .setDescription(
            "La variable `ORAL_A_FAIRE` est manquante dans ton id.env."
          )
          .setFooter(FOOTER);
        return interaction.reply({ embeds: [emb], ephemeral: true });
      }

      const roleMention = `<@&${ORAL_A_FAIRE}>`;

      const emb = new EmbedBuilder()
        .setColor(0x95a5a6)
        .setTitle("🔒 Orals de Whitelist clôturés")
        .setDescription(
          [
            "Les **oraux de whitelist sont désormais terminés** pour cette session.",
            "",
            "Merci à tous les joueurs ayant participé, et aux membres du staff pour leur temps.",
          ].join("\n")
        )
        .setFooter(FOOTER);

      return interaction.reply({
        content: roleMention,
        embeds: [emb],
      });
    }
  },
};
