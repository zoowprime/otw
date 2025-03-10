const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fishingSessions } = require('../fishingData');

// Import des fonctions d'économie pour plus tard si besoin de manipulation
// const { getOrCreateAccount, updateAccount } = require('../economyData');

// Liste des poissons (hors "Poisson-chat à tête plate")
const fishList = [
  { name: "Achigan à grande bouche (Largemouth Bass)", price: 1.20 },
  { name: "Achigan à petite bouche (Smallmouth Bass)", price: 1.30 },
  { name: "Bar bleu (Bluegill)", price: 0.40 },
  { name: "Brochet maillé (Chain Pickerel)", price: 0.75 },
  // Poisson-chat à tête plate exclu
  { name: "Perche commune (Perch)", price: 0.60 },
  { name: "Gardon (Redfin Pickerel)", price: 0.55 },
  { name: "Poisson-lune (Rock Bass)", price: 0.50 },
  { name: "Corégone de montagne (Lake Whitefish)", price: 1.00 },
  { name: "Omble à tête plate (Bullhead Catfish)", price: 0.80 },
  { name: "Esturgeon jaune (Lake Sturgeon)", price: 4.50 },
  { name: "Maskinongé (Muskie)", price: 3.75 },
  { name: "Grand brochet du Nord (Northern Pike)", price: 3.25 },
  { name: "Saumon royal (Sockeye Salmon)", price: 2.50 },
  { name: "Truite arc-en-ciel (Rainbow Trout)", price: 2.00 },
  { name: "Truite dorée (Steelhead Trout)", price: 2.25 },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('debutpeche')
    .setDescription('Commence une mission de pêche pour Gus'),
    
  async execute(interaction) {
    // Génération d'un poisson aléatoire
    const randomIndex = Math.floor(Math.random() * fishList.length);
    const fish = fishList[randomIndex];
    
    // Génération d’une quantité aléatoire entre 1 et 5
    const quantity = Math.floor(Math.random() * 5) + 1;
    
    // Enregistrement de la mission dans fishingSessions
    fishingSessions.set(interaction.user.id, {
      fishName: fish.name,
      fishPrice: fish.price,
      quantity: quantity,
      startTime: Date.now()
    });
    
    // Création de l'embed
    const embed = new EmbedBuilder()
      .setColor(0x00BFFF) // Bleu clair
      .setTitle("Mission de pêche")
      .setDescription(
        `👋Salut, mon ami !\n` +
        `J’aimerais que tu pêches ce poisson : **${fish.name}**\n` +
        `**${quantity} fois**.\n` +
        `Une fois que tu les auras, reviens me voir pour ta paye 🐟.`
      );
      
    return interaction.reply({ embeds: [embed] });
  },
};
