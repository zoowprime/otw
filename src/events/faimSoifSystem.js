const { EmbedBuilder } = require('discord.js');

const hungerData = new Map(); // { userId: { faim: 100, soif: 100 } }
const DECREASE_INTERVAL = 60 * 60 * 1000; // 1h
const ROLE_ID = process.env.ROLE_EN_VILLE;

function decreaseLevels(client) {
  setInterval(async () => {
    const guilds = client.guilds.cache;

    for (const [guildId, guild] of guilds) {
      const role = guild.roles.cache.get(ROLE_ID);
      if (!role) continue;

      for (const member of role.members.values()) {
        const userId = member.id;
        if (!hungerData.has(userId)) {
          hungerData.set(userId, { faim: 100, soif: 100 });
        }

        const current = hungerData.get(userId);
        current.faim = Math.max(current.faim - 10, 0);
        current.soif = Math.max(current.soif - 10, 0);
        hungerData.set(userId, current);
      }
    }
  }, DECREASE_INTERVAL);
}

function getHungerData(userId) {
  if (!hungerData.has(userId)) {
    hungerData.set(userId, { faim: 100, soif: 100 });
  }
  return hungerData.get(userId);
}

function changeHunger(userId, type, amount) {
  const data = getHungerData(userId);
  if (type === 'faim') data.faim = Math.min(data.faim + amount, 100);
  if (type === 'soif') data.soif = Math.min(data.soif + amount, 100);
  hungerData.set(userId, data);
  return data;
}

function getProgressBar(percent) {
  const totalBlocks = 10;
  const filled = Math.round((percent / 100) * totalBlocks);
  const empty = totalBlocks - filled;
  return '▮'.repeat(filled) + '▯'.repeat(empty) + ` (${percent}%)`;
}

module.exports = (client) => {
  decreaseLevels(client);
};

module.exports.getHungerData = getHungerData;
module.exports.changeHunger = changeHunger;
module.exports.getProgressBar = getProgressBar;
