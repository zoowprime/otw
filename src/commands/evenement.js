// src/commands/evenement.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('evenement')
    .setDescription('Déclenche un événement parmi ceux disponibles.')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Sélectionnez le type d’événement')
        .setRequired(true)
        .addChoices(
          { name: 'Des bandits attaquent une ville', value: 'bandits' },
          { name: 'Une tempête / ouragan qui impacte les cultures', value: 'tempete' },
          { name: 'Une fuite d’un prisonnier dangereux', value: 'prisonnier' },
          { name: 'Un cargo s\'échoue avec des trésors aux large de West-Elizabeth', value: 'cargo' }
        )
    ),
  async execute(interaction) {
    const type = interaction.options.getString('type');
    let eventText = '';
    switch (type) {
      case 'bandits':
        eventText = 'Des bandits attaquent une ville';
        break;
      case 'tempete':
        eventText = 'Une tempête / ouragan qui impacte les cultures';
        break;
      case 'prisonnier':
        eventText = 'Une fuite d’un prisonnier dangereux';
        break;
      case 'cargo':
        eventText = 'Un cargo s\'échoue avec des trésors aux large de West-Elizabeth';
        break;
      default:
        eventText = 'Événement inconnu';
    }
    const embed = new EmbedBuilder()
      .setColor(0x808080) // couleur gris
      .setDescription(`${eventText} est en cours, vite ☔️!`);
    await interaction.reply({ embeds: [embed] });
  }
};
