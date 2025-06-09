const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

const CHANNEL_ID = '1381732914751864953';
const ROLE_ID = '1378037596566978561';

let userStats = {}; // { userId: { faim: 100, soif: 100 } }

// Diminuer les stats toutes les heures
function decrementStats() {
  for (const userId in userStats) {
    userStats[userId].faim = Math.max(0, userStats[userId].faim - 10);
    userStats[userId].soif = Math.max(0, userStats[userId].soif - 15);
  }
}

// Restaurer la stat choisie
function restoreStat(userId, type) {
  if (!userStats[userId]) return;
  userStats[userId][type] = 100;
}

// Message toutes les 15 minutes
async function sendAlimentationMessages(client) {
  const guild = client.guilds.cache.first();
  const channel = guild.channels.cache.get(CHANNEL_ID);
  const role = guild.roles.cache.get(ROLE_ID);
  if (!guild || !channel || !role) return;

  role.members.forEach(async member => {
    const id = member.id;
    if (!userStats[id]) {
      userStats[id] = { faim: 100, soif: 100 };
    }

    const type = Math.random() < 0.5 ? 'faim' : 'soif';
    const stat = userStats[id][type];
    if (stat >= 80) return; // Ne pas spam si stat est bonne

    const emoji = type === 'faim' ? '🌮' : '🫗';
    const couleur = type === 'faim' ? 0xF1C40F : 0x3498DB;
    const titre = `Vous avez ${type} ${emoji}`;

    const embed = new EmbedBuilder()
      .setColor(couleur)
      .setTitle(titre)
      .setDescription(`${member} - Niveau ${type}: ${stat}%`);

    const button = new ButtonBuilder()
      .setCustomId(`aliment_${type}_${id}`)
      .setLabel(`${type === 'faim' ? 'Manger' : 'Boire'} ${emoji}`)
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);
    await channel.send({ embeds: [embed], components: [row] });
  });
}

function start(client) {
  // Diminuer les stats toutes les heures
  setInterval(() => {
    decrementStats();
  }, 60 * 60 * 1000);

  // Envoyer messages toutes les 15 minutes
  setInterval(() => {
    sendAlimentationMessages(client);
  }, 15 * 60 * 1000);
}

module.exports = {
  start,
  restoreStat
};
