// src/commands/anonymous.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anonymous')
    .setDescription('Envoie un message anonyme dans le salon dédié.')
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('Le message à envoyer anonymement.')
        .setRequired(true)
    ),
  async execute(interaction) {
    const anonMessage = interaction.options.getString('message');
    const channelId = process.env.ANONYMOUS_CHANNEL_ID;
    const channel = await interaction.client.channels.fetch(channelId);
    if (!channel) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xff0000).setDescription("❌ Le salon anonyme est introuvable.")],
        ephemeral: true
      });
    }
    await channel.send(`💬 **Message anonyme :** ${anonMessage}`);
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xff0000).setDescription("✅ Votre message a été envoyé anonymement !")],
      ephemeral: true
    });
  }
};
