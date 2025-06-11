const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { changeHunger, getProgressBar } = require('../events/faimSoifSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boire')
    .setDescription("Buvez pour récupérer de la soif"),

  async execute(interaction) {
    const member = interaction.member;
    if (!member.roles.cache.has(process.env.ROLE_EN_VILLE)) {
      return interaction.reply({ content: "❌ Vous n'êtes pas en ville.", ephemeral: true });
    }

    const data = changeHunger(member.id, 'soif', 35);
    const embed = new EmbedBuilder()
      .setTitle("🥤 Vous avez bu")
      .setColor("Aqua")
      .setDescription(getProgressBar(data.soif));

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
