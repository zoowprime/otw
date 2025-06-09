const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const roleIDEnVille = '1378037596566978561';

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
        .setDescription('L\'horaire de la session (ex. 19h30)')
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

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('Session Roleplay Old Town Western')
      .setDescription(`${sessionDate}\n\n**Horaire :** ${sessionHoraire}\n**Psn du lanceur :** ${sessionPsn}\n\n✅ = oui\n🕦 = en retard\n🤷 = je ne sais pas\n❌ = non plus\n\nMerci de voter afin de nous indiquer votre présence, l’abstention est autorisée mais a une limite, si elle n’est pas respectée vous devrez passer votre candidature.`)
      .addFields(
        { name: 'Membres présents (0) :', value: 'Aucun', inline: false },
        { name: 'Membres en retard (0) :', value: 'Aucun', inline: false },
        { name: 'Membres indécis (0) :', value: 'Aucun', inline: false },
        { name: 'Membres absents (0) :', value: 'Aucun', inline: false },
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('en_ville').setLabel('✔️ En Ville').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('oui').setLabel('✅').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('retard').setLabel('🕦').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('indecis').setLabel('🤷').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('absent').setLabel('❌').setStyle(ButtonStyle.Danger),
    );

    const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const responses = {
      oui: new Set(),
      retard: new Set(),
      indecis: new Set(),
      absent: new Set(),
    };

    const collector = message.createMessageComponentCollector({ time: 3_600_000 }); // 1h

    collector.on('collect', async i => {
      const user = i.user;

      if (i.customId === 'en_ville') {
        try {
          const member = await i.guild.members.fetch(user.id);
          if (!member.roles.cache.has(roleIDEnVille)) {
            await member.roles.add(roleIDEnVille);
            await i.reply({ content: `Tu as bien reçu le rôle "En Ville".`, ephemeral: true });
          } else {
            await i.reply({ content: `Tu as déjà le rôle "En Ville".`, ephemeral: true });
          }
        } catch (err) {
          console.error(err);
          await i.reply({ content: `Erreur lors de l'attribution du rôle.`, ephemeral: true });
        }
        return;
      }

      // Remove user from all sets
      for (const key of Object.keys(responses)) {
        responses[key].delete(`<@${user.id}>`);
      }
      // Add to selected category
      responses[i.customId].add(`<@${user.id}>`);

      // Build new embed
      const buildField = (label, set) =>
        `${label} (${set.size}) :\n${set.size > 0 ? Array.from(set).join(', ') : 'Aucun'}`;

      const newEmbed = EmbedBuilder.from(embed)
        .setFields(
          { name: buildField('Membres présents', responses.oui), value: '\u200B', inline: false },
          { name: buildField('Membres en retard', responses.retard), value: '\u200B', inline: false },
          { name: buildField('Membres indécis', responses.indecis), value: '\u200B', inline: false },
          { name: buildField('Membres absents', responses.absent), value: '\u200B', inline: false },
        );

      await i.update({ embeds: [newEmbed], components: [row] });
    });
  },
};
