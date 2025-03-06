// src/commands/stock.js
const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

// Liste complète des items avec leurs prix unitaires (adaptée de votre liste)
const availableItems = {
  // Armes
  "cattleman_revolver": 18.50,
  "navy_revolver": 18.00,
  "double_action_revolver": 19.00,
  "schofield_revolver": 20.50,
  "lemat_revolver": 25.25,
  "volcanic_pistol": 18.50,
  "litchfield_rifle": 26.25,
  "evans_rifle": 32.25,
  "lancaster_rifle": 32.25,
  "carabine_a_repetition": 32.25,
  "fusil_a_petit_gibier": 15.25,
  "fusil_springfield": 19.75,
  "fusil_a_verrou": 26.25,
  // Chevaux (exemples)
  "american_paint_tobiano": 100.00,
  "american_paint_overo": 100.00,
  "american_paint_balzane": 110.00,
  "american_paint_overo_gris": 120.00,
  "appaloosa_cape_leopard": 100.00,
  "appaloosa_capee": 100.00,
  "appaloosa_leopard": 120.00,
  "appaloosa_leopard_brun": 120.00,
  // Alcools
  "vin_parisien_bouteille": 12.00,
  "vin_parisien_tonneau": 1800.00,
  "vin_bordelais_bouteille": 15.00,
  "vin_bordelais_tonneau": 2200.00,
  "champagne_bouteille": 20.00,
  "champagne_tonneau": 3000.00,
  "whisky_anglais_bouteille": 15.00,
  "whisky_anglais_tonneau": 2500.00,
  "whisky_ecossais_bouteille": 18.00,
  "whisky_ecossais_tonneau": 3500.00,
  "whisky_irlandais_bouteille": 14.00,
  "whisky_irlandais_tonneau": 2000.00,
  // Ajoutez ici le reste de vos items selon votre liste...
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stock')
    .setDescription('Gérer le stock via un menu interactif.')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Ajouter un item au stock (menu interactif).')
    ),
  
  async execute(interaction) {
    if (interaction.options.getSubcommand() === 'add') {
      // Créer un select menu avec toutes les options
      const options = Object.entries(availableItems).map(([key, price]) => ({
        label: `${key} ($${price.toFixed(2)})`,
        value: key,
      }));
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('stock_select_item')
        .setPlaceholder('Choisissez un item à ajouter...')
        .addOptions(options);
      const row = new ActionRowBuilder().addComponents(selectMenu);
      await interaction.reply({
        content: 'Sélectionnez l’item que vous souhaitez ajouter au stock :',
        components: [row],
        ephemeral: true,
      });
    }
  },
};
