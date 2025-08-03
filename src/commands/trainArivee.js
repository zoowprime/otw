// src/commands/trainArrivee.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('train_arrivee')
    .setDescription('Annonce l’arrivée d’un train en gare.')
    .addStringOption(opt =>
      opt
        .setName('ville')
        .setDescription('Ville où le train arrive')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('marchandises')
        .setDescription('Liste des marchandises livrées')
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt
        .setName('incident')
        .setDescription('Y a-t-il eu un incident ?')
        .setRequired(false)
    ),

  async execute(interaction) {
    const ville  = interaction.options.getString('ville');
    const goods  = interaction.options.getString('marchandises') || 'Non spécifiées';
    const ok     = !interaction.options.getBoolean('incident');
    // Génère un numéro de convoi aléatoire entre 1000 et 9999
    const numero = Math.floor(Math.random() * 9000) + 1000;

    const embed = new EmbedBuilder()
      .setColor(ok ? 0x00AA00 : 0xFF0000)
      .setTitle(`🚉 Train arrivé en gare de ${ville}`)
      .setDescription(`Le convoi n°**${numero}** est arrivé avec succès.`)
      .addFields(
        { name: '📦 Marchandises livrées', value: goods, inline: false },
        { name: '⚠️ Incident ?',           value: ok ? 'Aucun incident signalé.' : 'Un incident a été signalé.', inline: false }
      );

    await interaction.reply({ embeds: [embed] });
  }
};