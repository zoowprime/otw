// src/commands/habitationafficher.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getHabitation } = require('../data/habitationData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('habitationafficher')
    .setDescription('Affiche l’état de votre habitation'),

  async execute(interaction) {
    const HAB_ROLE = process.env.HABITATION_ROLE;
    if (!interaction.member.roles.cache.has(HAB_ROLE)) {
      return interaction.reply({ content: '❌ Vous n’avez pas de maison assignée.', ephemeral: true });
    }

    const hab = getHabitation(interaction.user.id);
    const embed = new EmbedBuilder()
      .setTitle(`Habitation de ${interaction.user.username}`)
      .setColor(0x00aa00)
      .addFields(
        { name: '💰 Argent en dépôt', value: `${hab.argent}$`, inline: false },
        { name: '📦 Objets stockés', value:
            Object.entries(hab.items).length
              ? Object.entries(hab.items).map(([it, q]) => `${q} × ${it}`).join('\n')
              : 'Aucun objet'
        }
      );
    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};
