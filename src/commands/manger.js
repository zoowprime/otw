const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { changeHunger, getProgressBar } = require('../events/faimSoifSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('manger')
    .setDescription("Mange pour récupérer de la faim"),

  async execute(interaction) {
    const member = interaction.member;
    if (!member.roles.cache.has(process.env.ROLE_EN_VILLE)) {
      return interaction.reply({ content: "❌ Vous n'êtes pas en ville.", ephemeral: true });
    }

    const data = changeHunger(member.id, 'faim', 35);
    const embed = new EmbedBuilder()
      .setTitle("🍗 Vous avez mangé")
      .setColor("Orange")
      .setDescription(getProgressBar(data.faim));

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
