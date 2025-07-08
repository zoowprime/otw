// src/events/raidProtect.js
const { ChannelType, PermissionFlagsBits, PermissionOverwriteType } = require('discord.js');

const enabledGuilds = new Set();  // on stocke ici les guildes actives
const joinsMap      = new Map();  // pour chaque guilde, sa liste de timestamps

module.exports = (client) => {
  const THRESHOLD = Number(process.env.RAID_THRESHOLD)   || 5;
  const WINDOW_MS = Number(process.env.RAID_WINDOW_MS)  || 10_000;
  const LOG_CHANNEL_ID = process.env.RAID_LOG_CHANNEL_ID;

  client.on('guildMemberAdd', member => {
    const gid = member.guild.id;
    if (!enabledGuilds.has(gid)) return;  // si la protection n'est pas activée, on ignore

    const now = Date.now();
    const arr = joinsMap.get(gid) || [];
    arr.push(now);
    // on purge les anciennes entrées
    while (arr.length && arr[0] < now - WINDOW_MS) arr.shift();
    joinsMap.set(gid, arr);

    if (arr.length >= THRESHOLD) {
      // Lockdown des salons textuels
      member.guild.channels.cache
        .filter(c => c.type === ChannelType.GuildText)
        .forEach(ch => {
          ch.permissionOverwrites.edit(
            member.guild.roles.everyone,
            { SendMessages: false },
            { type: PermissionOverwriteType.Role }
          ).catch(console.error);
        });
      // Alerte
      const logCh = LOG_CHANNEL_ID
        ? member.guild.channels.cache.get(LOG_CHANNEL_ID)
        : member.guild.systemChannel;
      if (logCh && logCh.isTextBased()) {
        logCh.send(
          `🚨 **Lockdown activé**: ${arr.length} nouveaux membres en ${WINDOW_MS/1000}s.\n`+
          `Les salons ont été mis en lecture seule.`
        ).catch(console.error);
      }
      joinsMap.set(gid, []); // reset
    }
  });
};

module.exports.enable = guildId   => enabledGuilds.add(guildId);
module.exports.disable = guildId  => enabledGuilds.delete(guildId);
