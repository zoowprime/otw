// src/commands/session.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setDescription('Crée une session RP et collecte les présences.')
    .addStringOption(opt =>
      opt.setName('date')
        .setDescription('Date (ex: vendredi 25 juillet)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('horaire')
        .setDescription('Horaire (ex: 18h30)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('psn')
        .setDescription('PSN du lanceur')
        .setRequired(true)
    ),

  async execute(interaction) {
    const date    = interaction.options.getString('date');
    const horaire = interaction.options.getString('horaire');
    const psn     = interaction.options.getString('psn');

    // Embed initial
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('📅 Session RP Old Town Western')
      .setDescription(
        `**Date :** ${date}\n` +
        `**Horaire :** ${horaire}\n` +
        `**PSN du lanceur :** ${psn}\n\n` +
        `✅ = Oui\n🕦 = En retard\n🤷 = Je ne sais pas\n❌ = Absent\n\n` +
        `Merci de cliquer pour indiquer votre présence.`
      )
      .addFields(
        { name: 'Membres présents (0) :', value: 'Aucun' },
        { name: 'Membres en retard (0) :', value: 'Aucun' },
        { name: 'Membres indécis (0) :', value: 'Aucun' },
        { name: 'Membres absents (0) :', value: 'Aucun' },
      );

    // Envoi sans composants (on n’a pas encore l’ID du message)
    await interaction.reply({ embeds: [embed] });
    const msg = await interaction.fetchReply();

    // Boutons avec l’ID du message dans chaque customId → persistant
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`session:present:${msg.id}`)
        .setLabel('Oui')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`session:late:${msg.id}`)
        .setLabel('En retard')
        .setEmoji('🕦')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`session:maybe:${msg.id}`)
        .setLabel('Je ne sais pas')
        .setEmoji('🤷')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`session:absent:${msg.id}`)
        .setLabel('Absent')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger),
    );

    // Édit pour ajouter les boutons
    await msg.edit({ components: [row] });

    // ⚠️ Pas de collector ici → tout est géré globalement dans events/sessionHandler.js
  }
};
