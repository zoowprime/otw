const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { generateTelegramImage } = require('../utils/telegramGenerator');
require('dotenv').config({ path: './id.env' });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('telegram')
    .setDescription('Envoie un télégramme RP en image')
    .addUserOption(opt =>
      opt.setName('destinataire')
         .setDescription('Le joueur qui recevra le télégramme')
         .setRequired(true))
    .addStringOption(opt =>
      opt.setName('de')
         .setDescription('Ton nom (émetteur)')
         .setRequired(true))
    .addStringOption(opt =>
      opt.setName('message')
         .setDescription('Le contenu du télégramme')
         .setRequired(true))
    .addStringOption(opt =>
      opt.setName('signature')
         .setDescription('Ta signature finale')
         .setRequired(true)),

  async execute(interaction) {
    const dest     = interaction.options.getUser('destinataire');
    const from     = interaction.options.getString('de');
    const message  = interaction.options.getString('message');
    const sign     = interaction.options.getString('signature');

    await interaction.deferReply({ ephemeral: true });

    try {
      // Génère l'image
      const buffer = await generateTelegramImage(from, dest.username, message, sign);
      const file = new AttachmentBuilder(buffer, { name: 'telegramme.png' });

      // Envoie en DM
      await dest.send({ files: [file] });
      await interaction.editReply({ content: `✅ Télégramme envoyé à ${dest.tag} !` });
    } catch (err) {
      console.error('Erreur génération/envoyage télégramme :', err);
      await interaction.editReply({ content: '❌ Impossible d’envoyer le télégramme.', ephemeral: true });
    }
  }
};
