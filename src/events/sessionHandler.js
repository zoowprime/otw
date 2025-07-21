// src/events/sessionHandler.js
const { EmbedBuilder } = require('discord.js');

// 1️⃣ Les mêmes options que dans /session
const VOTE_OPTIONS = [
  { id: 'present', label: 'Oui',           emoji: '✅', category: 'présents'   },
  { id: 'late',    label: 'En retard',     emoji: '🕦', category: 'en retard'   },
  { id: 'maybe',   label: 'Je ne sais pas',emoji: '🤷', category: 'indécis'     },
  { id: 'absent',  label: 'Absent',        emoji: '❌', category: 'absents'     },
];

module.exports = client => {
  // stocke pour chaque message-id l’état des votes et l’embed original
  client.sessionVotes = new Map();

  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    const voteOpt = VOTE_OPTIONS.find(o => o.id === interaction.customId);
    if (!voteOpt) return;

    const session = client.sessionVotes.get(interaction.message.id);
    if (!session) {
      // pas une de nos sessions
      return interaction.reply({ content: '❌ Ce message n’est pas une session active.', ephemeral: true });
    }

    // ne laisser voter que l’auteur d’un clic valide
    const userId = interaction.user.id;

    // on retire le vote précédent
    for (const key of Object.keys(session.votes)) {
      session.votes[key].delete(userId);
    }
    // on ajoute dans sa nouvelle catégorie
    session.votes[voteOpt.id].add(userId);

    // on reconstruit les champs
    const fields = VOTE_OPTIONS.map(o => {
      const users = Array.from(session.votes[o.id]);
      return {
        name: `Membres ${o.category} (${users.length}) :`,
        value: users.length ? users.map(u => `<@${u}>`).join(' ') : 'Aucun'
      };
    });

    // on met à jour l’embed
    const updated = EmbedBuilder.from(session.embed).setFields(fields);

    // on répond en update (rafraîchit l’embed et conserve les boutons)
    await interaction.update({ embeds: [updated] });
  });
};
