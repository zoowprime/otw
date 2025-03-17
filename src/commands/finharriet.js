// src/commands/finharriet.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('finharriet')
    .setDescription("Termine ta mission de récolte de plantes médicinales."),
  async execute(interaction) {
    const userId = interaction.user.id;
    global.activeHarrietMissions = global.activeHarrietMissions || new Map();
    const mission = global.activeHarrietMissions.get(userId);
    if (!mission) {
      return interaction.reply({ content: "Aucune mission active trouvée.", ephemeral: true });
    }
    // Annuler le timer
    if (mission.timeout) clearTimeout(mission.timeout);
    mission.completed = true;
    global.activeHarrietMissions.delete(userId);
    
    const embed = new EmbedBuilder()
      .setColor(0xff69b4)
      .setTitle("Mission terminée")
      .setDescription("Super, vous avez récupéré les plantes que j'ai demandée pour fabriquer le remède, veillez à bien les ramener à votre cabinet pour les fabriquer ! 🪴");
      
    return interaction.reply({ embeds: [embed] });
  }
};
