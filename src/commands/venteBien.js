// src/commands/venteBien.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vente_bien')
    .setDescription('Annonce la vente d’un bien immobilier.')
    .addStringOption(opt =>
      opt
        .setName('client')
        .setDescription('Nom du client')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('type_bien')
        .setDescription('Type de bien (ex : maison, appartement)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('lieu')
        .setDescription('Localisation du bien')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('prix')
        .setDescription('Prix de vente (ex : 450$)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('agent')
        .setDescription('Nom de l’agent immobilier')
        .setRequired(true)
    ),

  async execute(interaction) {
    const clientName = interaction.options.getString('client');
    const typeBien   = interaction.options.getString('type_bien');
    const lieu       = interaction.options.getString('lieu');
    const prix       = interaction.options.getString('prix');
    const agent      = interaction.options.getString('agent');

    // Vous pouvez remplacer cette constante par process.env.AGENCY_NAME si vous le souhaitez
    const entreprise = 'Shinsei Properties';

    const embed = new EmbedBuilder()
      .setColor(0x00CC66)
      .setTitle('🏠 Vente immobilière confirmée')
      .addFields(
        { name: '• Client',               value: clientName, inline: false },
        { name: '• Bien',                 value: `${typeBien} – ${lieu}`, inline: false },
        { name: '• Montant',              value: prix, inline: false },
        { name: '• Agent immobilier',     value: agent, inline: false },
        { name: '• Entreprise',           value: entreprise, inline: false }
      )
      .setFooter({ text: '📝 Le contrat a été signé et archivé. Le client peut désormais accéder à son bien.' });

    await interaction.reply({ embeds: [embed] });
  }
};