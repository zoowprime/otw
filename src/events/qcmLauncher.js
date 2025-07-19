// src/events/qcmLauncher.js
require('dotenv').config({ path: './id.env' });
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

module.exports = (client) => {
  client.once('ready', async () => {
    const ch = await client.channels.fetch(process.env.QCM_LANCEMENT_CHANNEL);
    if (!ch) return console.error('Salon QCM non trouvé');

    // Ne renvoie pas l'annonce si elle existe déjà
    const fetched = await ch.messages.fetch({ limit: 50 });
    if (fetched.some(m => m.embeds[0]?.title === 'Bonjour !')) return;

    const embed = new EmbedBuilder()
      .setTitle('Bonjour !')
      .setDescription(
        `Vous êtes dans le salon pour faire votre QCM, avant toute chose, vous devez connaître les salons suivants pour votre QCM :\n` +
        `<#${process.env.SALON_1}>\n` +
        `<#${process.env.SALON_2}>\n` +
        `<#${process.env.SALON_3}>\n` +
        `<#${process.env.SALON_4}>\n\n` +
        `Une fois cela fait, cliquez sur le bouton **QCM EN COURS** !\n` +
        `Lorsque tout sera fait, utilisez la commande **/qcm** pour démarrer votre QCM dans un nouveau salon et suivre les instructions !`
      )
      .setColor(0xff0000);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('qcm_get_role')
        .setLabel('Obtenir le rôle QCM')
        .setStyle(ButtonStyle.Primary)
    );

    await ch.send({ embeds: [embed], components: [row] });
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== 'qcm_get_role') return;

    try {
      // Ajoute le rôle QCM EN COURS
      await interaction.member.roles.add(process.env.QCM_EN_COURS);
      // Retire le rôle ORAL_A_FAIRE s’il est présent
      if (interaction.member.roles.cache.has(process.env.ORAL_A_FAIRE)) {
        await interaction.member.roles.remove(process.env.ORAL_A_FAIRE);
      }
      await interaction.reply({
        content: '✅ Vous avez reçu le rôle **QCM EN COURS** et le rôle **ORAL À FAIRE** a été retiré.',
        ephemeral: true
      });
    } catch (err) {
      console.error('Erreur lors de l’attribution/retrait des rôles QCM :', err);
      await interaction.reply({
        content: '❌ Impossible de gérer vos rôles pour le QCM.',
        ephemeral: true
      });
    }
  });
};
