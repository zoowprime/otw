const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Dictionnaire des emojis et de leurs catégories
const STATUS = {
  '✅': 'présents',
  '🕦': 'en retard',
  '🤷': 'indécis',
  '❌': 'absents'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setDescription('Crée une session de RP avec les informations de date, horaire et psn du lanceur.')
    .addStringOption(option =>
      option
        .setName('date')
        .setDescription('La date de la session (ex. vendredi 07 mars 2025)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('horaire')
        .setDescription("L'horaire de la session (ex. 19h30)")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('psn')
        .setDescription('Le PSN du lanceur')
        .setRequired(true)
    ),
  async execute(interaction) {
    const sessionDate = interaction.options.getString('date');
    const sessionHoraire = interaction.options.getString('horaire');
    const sessionPsn = interaction.options.getString('psn');

    const citizenRoleId = '1308118795285565530';
    const mention = `<@&${citizenRoleId}>`;

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('Session Roleplay Old Town Western')
      .setDescription(
        `${sessionDate}\n\n**Horaire :** ${sessionHoraire}\n**Psn du lanceur :** ${sessionPsn}\n\n✅ = oui\n🕦 = en retard\n🤷 = je ne sais pas\n❌ = non plus\n\nMerci de voter afin de nous indiquer votre présence, l’abstention est autorisée mais a une limite, si elle n’est pas respectée vous redevrez passer votre candidature.`
      )
      .addFields(
        { name: 'Membres présents (0) :', value: 'Aucun', inline: false },
        { name: 'Membres en retard (0) :', value: 'Aucun', inline: false },
        { name: 'Membres indécis (0) :', value: 'Aucun', inline: false },
        { name: 'Membres absents (0) :', value: 'Aucun', inline: false }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('✅').setLabel('Oui').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('🕦').setLabel('En retard').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('🤷').setLabel('Je ne sais pas').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('❌').setLabel('Absent').setStyle(ButtonStyle.Danger)
    );

    const message = await interaction.reply({ content: mention, embeds: [embed], components: [row], fetchReply: true });

    const collector = message.createMessageComponentCollector({ time: 86400000 }); // 24h

    const votes = {
      '✅': new Set(),
      '🕦': new Set(),
      '🤷': new Set(),
      '❌': new Set()
    };

    collector.on('collect', async i => {
      for (const key of Object.keys(votes)) {
        votes[key].delete(i.user);
      }
      votes[i.customId].add(i.user);

      const fields = Object.entries(STATUS).map(([emoji, label]) => {
        const users = Array.from(votes[emoji]);
        const mentions = users.map(u => `<@${u.id}>`).join(' ');
        return {
          name: `Membres ${label} (${users.length}) :`,
          value: users.length ? mentions : 'Aucun',
          inline: false
        };
      });

      const updatedEmbed = EmbedBuilder.from(embed).setFields(fields);

      await i.update({ embeds: [updatedEmbed], components: [row] });
    });
  }
};
