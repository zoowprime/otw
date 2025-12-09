// src/events/guildMemberUpdate.js
const { EmbedBuilder } = require("discord.js");

const BOOST_CHANNEL_ID = process.env.BOOST_CHANNEL_ID;

module.exports = (client) => {
  client.on("guildMemberUpdate", async (oldMember, newMember) => {
    try {
      if (!BOOST_CHANNEL_ID) return;

      const wasBoosting = !!oldMember.premiumSince;
      const isBoosting = !!newMember.premiumSince;

      // Détection d’un NOUVEAU boost
      if (!wasBoosting && isBoosting) {
        const guild = newMember.guild;

        const channel = await guild.channels
          .fetch(BOOST_CHANNEL_ID)
          .catch(() => null);
        if (!channel) return;

        const totalBoosts = guild.premiumSubscriptionCount || 0;
        const tier = guild.premiumTier || 0;

        const embed = new EmbedBuilder()
          .setColor(0xff73fa)
          .setTitle("🚀 Nouveau Boost !")
          .setThumbnail(
            newMember.user.displayAvatarURL({ size: 256, dynamic: true })
          )
          .setDescription(
            `Un immense merci à ${newMember} pour avoir **boosté le serveur** ! 💜\n\n` +
            "Grâce à toi, le serveur gagne en puissance :\n" +
            "✨ Avantages Nitro, meilleure qualité audio, plus d'emojis…"
          )
          .addFields(
            {
              name: "👤 Booster",
              value: `${newMember.user} \n(\`${newMember.id}\`)`,
              inline: true,
            },
            {
              name: "⚙️ Niveau Nitro",
              value: `Niveau **${tier}**`,
              inline: true,
            },
            {
              name: "💜 Boosts Totaux",
              value: `Le serveur compte maintenant **${totalBoosts}** boost(s).`,
              inline: false,
            }
          )
          .setFooter({ text: "Old Town Western — Merci pour ton soutien 💜" })
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error("Erreur Boost Event :", err);
    }
  });
};
