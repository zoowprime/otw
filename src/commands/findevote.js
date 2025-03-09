const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const votingData = require('../votingData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('findevote')
    .setDescription('Calcule le pourcentage de votes pour chaque candidat'),
  async execute(interaction) {
    if (!votingData.active) {
      return interaction.reply({ content: "Aucune session de vote n'est ouverte.", ephemeral: true });
    }
    const totalVotes = Object.values(votingData.votes).reduce((sum, v) => sum + v, 0);
    if (totalVotes === 0) {
      return interaction.reply({ content: "Aucun vote n'a été enregistré.", ephemeral: true });
    }
    let description = "Résultats du vote:\n";
    for (const candidateId of votingData.candidates) {
      const votes = votingData.votes[candidateId] || 0;
      const pourcentage = ((votes / totalVotes) * 100).toFixed(2);
      description += `<@${candidateId}> : ${votes} vote(s) (${pourcentage}%)\n`;
    }
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("Résultats des votes")
      .setDescription(description);
    
    // Terminer la session de vote
    votingData.active = false;
    votingData.candidates = [];
    votingData.votes = {};
    
    return interaction.reply({ embeds: [embed] });
  }
};
