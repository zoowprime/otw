const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getHungerData, getProgressBar } = require('../events/faimSoifSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('soif')
    .setDescription("Affiche votre état de soif"),

  async execute(interaction) {
    const member = interaction.member;
    if (!member.roles.cache.has(process.env.ROLE_EN_VILLE)) {
      return interaction.reply({ content: "❌ Vous n'êtes pas en ville.", ephemeral: true });
    }

    const data = getHungerData(member.id);
    const embed = new EmbedBuilder()
      .setTitle('Voici votre état de soif 💧')
      .setColor('Blue')
      .setDescription(getProgressBar(data.soif));

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
