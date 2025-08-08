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
        { name: 'Membres indécis (0) :',   value: 'Aucun' },
        { name: 'Membres absents (0) :',   value: 'Aucun' },
      );

    try {
      // 1) Envoi du message de session
      await interaction.reply({ embeds: [embed] });
      // 2) Récupération sûre du message renvoyé
      const msg = await interaction.fetchReply();

      // 3) Construction des boutons avec l'ID DU MESSAGE
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

      // 4) Ré-édition du même message avec EMBED + BOUTONS
      await msg.edit({ embeds: [embed], components: [row] });
      console.log(`✔ Boutons ajoutés à la session ${msg.id}`);
    } catch (err) {
      console.error('✖ Impossible d’ajouter les boutons à la session :', err);
      try {
        if (!interaction.replied) {
          await interaction.reply('❌ Erreur lors de la création de la session.');
        }
      } catch {}
    }
  }
};
