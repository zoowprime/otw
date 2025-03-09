const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const votingData = require('../votingData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('votepolitiques')
    .setDescription('Vote anonymement pour un candidat en élection')
    .addUserOption(option =>
      option.setName('candidat')
        .setDescription('Le candidat pour lequel vous votez')
        .setRequired(true)
    ),
  async execute(interaction) {
    if (!votingData.active) {
      return interaction.reply({ content: "Aucune session de vote n'est ouverte actuellement.", ephemeral: true });
    }
    const candidat = interaction.options.getUser('candidat');
    if (!votingData.candidates.includes(candidat.id)) {
      return interaction.reply({ content: "Ce candidat n'est pas autorisé dans cette session de vote.", ephemeral: true });
    }
    votingData.votes[candidat.id] += 1;
    // Envoyer le vote anonymement dans le canal dédié
    try {
      const voteChannel = await interaction.client.channels.fetch(process.env.VOTE_CHANNEL_ID);
      if (voteChannel) {
        await voteChannel.send(`Un vote a été enregistré pour <@${candidat.id}>.`);
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi du vote :", error);
    }
    return interaction.reply({ content: "Votre vote a été enregistré.", ephemeral: true });
  }
};
