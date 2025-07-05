// src/commands/telegram.js
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { generateTelegramImage } = require('../utils/telegramGenerator');
require('dotenv').config({ path: './id.env' });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('telegram')
    .setDescription('Envoie un télégramme RP en image')
    .addStringOption(opt =>
      opt.setName('message')
         .setDescription('Le texte de votre télégramme')
         .setRequired(true)
    ),

  async execute(interaction) {
    const text = interaction.options.getString('message');
    const author = interaction.user.username;

    await interaction.deferReply(); // laisse le temps de générer l’image

    try {
      const buffer = await generateTelegramImage(text, author);
      const attachment = new AttachmentBuilder(buffer, { name: 'telegram.png' });
      await interaction.editReply({ files: [attachment] });
    } catch (err) {
      console.error('Erreur génération télégramme :', err);
      await interaction.editReply({ content: '❌ Impossible de générer le télégramme.' });
    }
  }
};
