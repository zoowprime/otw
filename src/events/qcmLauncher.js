const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

module.exports = (client) => {
  client.once('ready', async () => {
    const ch = await client.channels.fetch(process.env.QCM_LANCEMENT_CHANNEL);
    if (!ch) return console.error('Salon QCM non trouvé');

    // Ne pas renvoyer si déjà posté
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
        `Une fois cela fait, cliquez sur le bouton ci-dessous pour obtenir le rôle **QCM EN COURS** !`
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

  client.on('interactionCreate', async (i) => {
    if (!i.isButton() || i.customId !== 'qcm_get_role') return;
    try {
      await i.member.roles.add(process.env.QCM_EN_COURS);
      await i.reply({ content: '✅ Vous avez reçu le rôle **QCM EN COURS** !', ephemeral: true });
    } catch (err) {
      console.error(err);
      await i.reply({ content: '❌ Impossible d’attribuer le rôle.', ephemeral: true });
    }
  });
};
