// src/commands/fabriquer_bateau.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fabriquer_bateau')
    .setDescription('Fabriquez un bateau selon vos besoins.')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Choisissez le type de bateau à fabriquer')
        .setRequired(true)
        .addChoices(
          { name: '1️⃣ Kayak – Petit, rapide, idéal pour la pêche et la discrétion.', value: 'kayak' },
          { name: '2️⃣ Bateau à rames – Moyen, parfait pour le transport de personnes et petites cargaisons.', value: 'bateau_rames' },
          { name: '3️⃣ Petit bateau à vapeur – Motorisé, rapide mais coûteux en ressources.', value: 'petit_bateau_vapeur' },
          { name: '4️⃣ Grand bateau à vapeur – Imposant, transporte grandes marchandises et passagers.', value: 'grand_bateau_vapeur' }
        )
    ),
  async execute(interaction) {
    const type = interaction.options.getString('type');
    let boatName, fabricationTime, riskMessage = "";
    
    switch (type) {
      case 'kayak':
        boatName = 'Kayak';
        fabricationTime = '12h IRL';
        break;
      case 'bateau_rames':
        boatName = 'Bateau à rames';
        fabricationTime = '24h IRL';
        break;
      case 'petit_bateau_vapeur':
        boatName = 'Petit bateau à vapeur';
        fabricationTime = '72h IRL';
        riskMessage = "\n⚠️ Risque aléatoire (10% de chance) : Problème de moteur";
        break;
      case 'grand_bateau_vapeur':
        boatName = 'Grand bateau à vapeur';
        fabricationTime = '7 jours IRL';
        riskMessage = "\n⚠️ Risque aléatoire (15% de chance) : Défaut de fabrication nécessitant une réparation avant mise à l’eau";
        break;
      default:
        boatName = 'Bateau inconnu';
        fabricationTime = 'Temps inconnu';
    }
    
    const embed = new EmbedBuilder()
      .setColor(0x000080) // Bleu marine
      .setTitle("Fabrication de bateau en cours ⚙️")
      .setDescription(`Vous fabriquez actuellement le **${boatName}**.\nPatientez **${fabricationTime}**.${riskMessage}`);
    
    await interaction.reply({ embeds: [embed] });
  }
};
