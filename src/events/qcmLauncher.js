// src/events/qcmLauncher.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = (client) => {
  client.once('ready', async () => {
    const channel = await client.channels.fetch(process.env.QCM_LANCEMENT_CHANNEL);
    if (!channel) return console.error("Canal de lancement QCM introuvable.");

    // Vérifier si le message existe déjà (on stocke l’ID en mémoire ou via un fichier/datastore)
    const fetched = await channel.messages.fetch({ limit: 50 });
    if (fetched.some(m => m.author.id === client.user.id && m.components.length)) {
      return; // déjà posté
    }

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("Bonjour !")
      .setDescription(
`Vous êtes dans le salon pour faire votre QCM, avant toute chose vous devez connaître les salons suivants pour votre QCM :
<#${process.env.SALON_1}>
<#${process.env.SALON_2}>
<#${process.env.SALON_3}>
<#${process.env.SALON_4}>

Une fois cela fait, cliquez sur le bouton ci-dessous pour avoir le rôle **QCM EN COURS**. Ensuite, utilisez la commande **/qcm** qui vous redirigera vers un autre salon pour débuter votre QCM !`
      );

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('qcm_get_role')
          .setLabel('Rôle QCM')
          .setStyle(ButtonStyle.Primary)
      );

    await channel.send({ embeds: [embed], components: [row] });
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || interaction.customId !== 'qcm_get_role') return;

    const member = interaction.member;
    if (!member) return;

    try {
      await member.roles.add(process.env.QCM_EN_COURS);
      return interaction.reply({ content: "✅ Rôle QCM EN COURS ajouté !", ephemeral: true });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: "❌ Impossible d’ajouter le rôle.", ephemeral: true });
    }
  });
};
