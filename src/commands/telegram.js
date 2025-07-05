// src/commands/telegram.js
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { generateTelegramImage } = require('../utils/telegramGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('telegram')
    .setDescription('Envoie un télégramme RP en image')
    .addUserOption(opt =>
      opt.setName('destinataire').setDescription('Le joueur qui recevra le télégramme').setRequired(true))
    .addStringOption(opt =>
      opt.setName('de').setDescription('Ton nom (émetteur)').setRequired(true))
    .addStringOption(opt =>
      opt.setName('message').setDescription('Le contenu du télégramme').setRequired(true))
    .addStringOption(opt =>
      opt.setName('signature').setDescription('Ta signature finale').setRequired(true)),

  async execute(interaction) {
    // 1) Ack immédiat pour éviter le timeout
    await interaction.reply({ content: '✉️ Envoi du télégramme…', ephemeral: true });

    const dest    = interaction.options.getUser('destinataire');
    const from    = interaction.options.getString('de');
    const text    = interaction.options.getString('message');
    const signature = interaction.options.getString('signature');

    try {
      // 2) Génération de l’image
      const buffer = await generateTelegramImage(from, dest.username, text, signature);
      const attachment = new AttachmentBuilder(buffer, { name: 'telegram.png' });

      // 3) Envoi en DM
      await dest.send({ files: [attachment] });

      // 4) Mise à jour du message éphémère
      await interaction.editReply({ content: `✅ Télégramme envoyé à ${dest.tag} !` });
    } catch (err) {
      console.error('Erreur télégramme :', err);
      // En cas d’erreur, on édite quand même la réponse
      await interaction.editReply({ content: '❌ Impossible d’envoyer le télégramme.' });
    }
  }
};
