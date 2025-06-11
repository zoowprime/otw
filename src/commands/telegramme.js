const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('telegramme')
    .setDescription('Envoyer un télégramme à un autre joueur par message privé')
    .addUserOption(option =>
      option.setName('destinataire')
        .setDescription('Utilisateur à qui envoyer le télégramme')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('de')
        .setDescription('Nom de l\'expéditeur')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Contenu du message')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('signature')
        .setDescription('Signature du télégramme')
        .setRequired(true)),

  async execute(interaction) {
    const destinataire = interaction.options.getUser('destinataire');
    const de = interaction.options.getString('de');
    const message = interaction.options.getString('message');
    const signature = interaction.options.getString('signature');

    const date = new Date().toLocaleDateString('fr-FR');

    const embed = new EmbedBuilder()
      .setColor(0x8B4513) // marron
      .setTitle('📨 Télégramme')
      .setDescription(`**Date :** ${date}`)
      .addFields(
        { name: '**De :**', value: de, inline: false },
        { name: '**À :**', value: `${destinataire}`, inline: false },
        { name: '**Message :**', value: message, inline: false },
        { name: '**Signature :**', value: signature, inline: false },
      )
      .setFooter({ text: 'Télégramme confidentiel' });

    try {
      await destinataire.send({ embeds: [embed] });
      await interaction.reply({
        content: `✅ Télégramme envoyé à ${destinataire.tag} en privé.`,
        ephemeral: true
      });
    } catch (err) {
      console.error('Erreur lors de l\'envoi du télégramme :', err);
      await interaction.reply({
        content: `❌ Impossible d’envoyer un message privé à ${destinataire.tag}.`,
        ephemeral: true
      });
    }
  }
};
