// src/commands/harriettemps.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const MISSION_DURATION = 30 * 60 * 1000; // 30 minutes

module.exports = {
  data: new SlashCommandBuilder()
    .setName('harriettemps')
    .setDescription("Affiche le temps restant pour ta mission de récolte de plantes médicinales."),
  async execute(interaction) {
    const userId = interaction.user.id;
    global.activeHarrietMissions = global.activeHarrietMissions || new Map();
    const mission = global.activeHarrietMissions.get(userId);
    if (!mission) {
      return interaction.reply({ content: "Aucune mission active trouvée.", ephemeral: true });
    }
    const elapsed = Date.now() - mission.startTime;
    const remaining = Math.max(0, MISSION_DURATION - elapsed);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    const embed = new EmbedBuilder()
      .setColor(0xff69b4)
      .setTitle("Temps restant")
      .setDescription(`Il te reste **${minutes} minutes et ${seconds} secondes** pour compléter ta mission.`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
