// src/events/sessionHandler.js
const { EmbedBuilder } = require('discord.js');
const VOTE_OPTIONS = [
  { id: 'present', category: 'présents' },
  { id: 'late',    category: 'en retard' },
  { id: 'maybe',   category: 'indécis' },
  { id: 'absent',  category: 'absents' }
];

module.exports = (client) => {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const session = client.sessionVotes.get(interaction.message.id);
    if (!session) {
      return interaction.reply({ content: '❌ Ce message n’est pas une session active.', ephemeral: true });
    }

    const { embed, row, votes } = session;
    const uid = interaction.user.id;
    const choice = interaction.customId;

    // 1️⃣ retire l'utilisateur de tous les sets
    Object.values(votes).forEach(set => set.delete(uid));
    // 2️⃣ ajoute dans le bon set
    if (votes[choice]) votes[choice].add(uid);

    // 3️⃣ reconstruit les fields
    const fields = VOTE_OPTIONS.map(o => {
      const users = Array.from(votes[o.id]);
      return {
        name: `Membres ${o.category} (${users.length}) :`,
        value: users.length ? users.map(u => `<@${u}>`).join(' ') : 'Aucun'
      };
    });

    // 4️⃣ met à jour l'embed
    const newEmbed = EmbedBuilder.from(embed).setFields(fields);

    // 5️⃣ répond et actualise
    await interaction.update({ embeds: [newEmbed], components: [row] });
  });
};
