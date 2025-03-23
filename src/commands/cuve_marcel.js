// src/commands/cuve_marcel.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const recipes = [
  {
    name: "Alcool arômes des îles",
    ingredients: [
      "Abricots en conserve",
      "Groseille odorante",
      "Rhum des Caraïbes"
    ]
  },
  {
    name: "Cidre sauvage",
    ingredients: [
      "Pomme",
      "Ginseng d'Alaska",
      "Cassis"
    ]
  },
  {
    name: "Liqueur de jouvence",
    ingredients: [
      "Airelle ovale",
      "Baie de gaulthérie couchée",
      "Ginseng américain"
    ]
  },
  {
    name: "Menthe Sanguine",
    ingredients: [
      "Fraises en conserve",
      "Mûres",
      "Menthe sauvage"
    ]
  },
  {
    name: "Pomme rose",
    ingredients: [
      "Pomme",
      "Mûres",
      "Fleur de vanille"
    ]
  },
  {
    name: "Prune sauvage",
    ingredients: [
      "Menthe sauvage",
      "Fleur de vanille",
      "Prunus des rivières"
    ]
  },
  {
    name: "Punch Tropical",
    ingredients: [
      "Ananas en conserve",
      "Poire",
      "Fleur de vanille"
    ]
  },
  {
    name: "Péché mignon",
    ingredients: [
      "Pêches en conserve",
      "Framboise",
      "Pêche"
    ]
  },
  {
    name: "Soleil rouge",
    ingredients: [
      "Fraises en conserve",
      "Airelle ovale",
      "Agarita"
    ]
  }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cuve_marcel')
    .setDescription('Marcel vous demande de récolter des ingrédients pour fabriquer une cuvée d’alcool gratuite.'),
  async execute(interaction) {
    // Sélection aléatoire d'une recette
    const recipe = recipes[Math.floor(Math.random() * recipes.length)];

    const embed = new EmbedBuilder()
      .setColor(0xffc0cb) // rose
      .setTitle("Message de Marcel")
      .setDescription(
        `Bien le bonjour, je souhaiterai que tu me récolte ces 3 ingrédients 7 fois pour que l’on puisse fabriquer **${recipe.name}** :\n\n` +
        recipe.ingredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n')
      );
      
    await interaction.reply({ embeds: [embed] });
  }
};
