const { AttachmentBuilder } = require('discord.js');
const { generateCard } = require('../utils/welcomeCard');
require('dotenv').config({ path: './id.env' });

module.exports = (client) => {
  const channelId    = process.env.WELCOME_CHANNEL_ID;
  const roleId       = process.env.WELCOME_ROLE_ID;
  const leaveChannel = process.env.FAREWELL_CHANNEL_ID || channelId;

  client.on('guildMemberAdd', async member => {
    try {
      // 1) Give role
      if (roleId) {
        const role = member.guild.roles.cache.get(roleId);
        if (role) await member.roles.add(role);
      }

      // 2) Génère la carte
      const buffer = await generateCard({
        username:      member.user.username,
        discriminator: member.user.discriminator,
        avatarURL:     member.user.displayAvatarURL({ extension: 'png' }),
        memberCount:   member.guild.memberCount,
        isWelcome:     true
      });

      const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });

      // 3) Embed d’accompagnement + envoi
      const embed = {
        color: 0xff0000,
        description: `Salut ${member}, bienvenue chez **OTW** !\n` +
                     `Passe un bon RP, et n’hésite pas à cliquer sur :\n` +
                     `> 🔔 pour activer les notifications`,
      };

      const channel = member.guild.channels.cache.get(channelId);
      if (channel?.isTextBased()) {
        await channel.send({ embeds: [embed], files: [attachment] });
      }
    } catch (err) {
      console.error('Erreur welcome:', err);
    }
  });

  client.on('guildMemberRemove', async member => {
    try {
      const buffer = await generateCard({
        username:      member.user.username,
        discriminator: member.user.discriminator,
        avatarURL:     member.user.displayAvatarURL({ extension: 'png' }),
        memberCount:   member.guild.memberCount - 1,
        isWelcome:     false
      });
      const attachment = new AttachmentBuilder(buffer, { name: 'farewell.png' });

      const embed = {
        color: 0xff0000,
        description: `**${member.user.username}** nous a quittés…\n` +
                     `On espère te revoir bientôt !`
      };

      const channel = member.guild.channels.cache.get(leaveChannel);
      if (channel?.isTextBased()) {
        await channel.send({ embeds: [embed], files: [attachment] });
      }
    } catch (err) {
      console.error('Erreur farewell:', err);
    }
  });
};
