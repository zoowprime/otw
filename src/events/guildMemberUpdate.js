// src/events/guildMemberUpdate.js
const { EmbedBuilder } = require("discord.js");

const BOOST_CHANNEL_ID = process.env.BOOST_CHANNEL_ID;

module.exports = {
  name: "guildMemberUpdate",

  /**
   * @param {import('discord.js').GuildMember} oldMember
   * @param {import('discord.js').GuildMember} newMember
   */
  async execute(oldMember, newMember) {
    try {
      // On ne fait rien si le salon n'est pas configuré
      if (!BOOST_CHANNEL_ID) return;

      // Détection d'un NOUVEAU boost :
      // avant -> pas de boost | après -> boost actif
      const wasBoosting = !!oldMember.premiumSince;
      const isBoosting = !!newMember.premiumSince;

      if (!wasBoosting && isBoosting) {
        const guild = newMember.guild;

        // Récup du salon de boosts
        const channel = await guild.channels
          .fetch(BOOST_CHANNEL_ID)
          .catch(() => null);
        if (!channel) return;

        // Stats globales du serveur
        const totalBoosts = guild.premiumSubscriptionCount || 0;
        const tier = guild.premiumTier || 0;

        const emb = new EmbedBuilder()
          .setColor(0xff73fa)
          .setTitle("🚀 Nouveau boost sur le serveur !")
          .setThumbnail(
            newMember.user.displayAvatarURL({ size: 256, dynamic: true })
          )
          .setDescription(
            [
              `Merci à ${newMember} d'avoir **boosté le serveur** !`,
              "",
              "Grâce à toi, toute la communauté profite de meilleurs avantages :",
              "✨ Meilleure qualité audio, plus d’emojis, plus de style…",
            ].join("\n")
          )
          .addFields(
            {
              name: "👤 Booster",
              value: `${newMember.user} \n(\`${newMember.id}\`)`,
              inline: true,
            },
            {
              name: "⚙️ Niveau Nitro du serveur",
              value: `Niveau **${tier}**`,
              inline: true,
            },
            {
              name: "💜 Boosts totaux",
              value: `Le serveur compte désormais **${totalBoosts}** boost(s) au total.`,
              inline: false,
            }
          )
          .setFooter({ text: "Old Town Western — Merci pour ton soutien 💜" })
          .setTimestamp();

        await channel.send({ embeds: [emb] });
      }
    } catch (err) {
      console.error("Erreur guildMemberUpdate (boost):", err);
    }
  },
};
