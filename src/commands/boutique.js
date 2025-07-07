// src/commands/boutique.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require('discord.js');

const { getOrCreateAccount, updateAccount } = require('../economyData');
require('dotenv').config({ path: './id.env' });

const SHOP_OWNER_ID = process.env.SHOP_OWNER_ID;

// Définition des articles
const items = {
  tente_amelioree: {
    name: 'Tente améliorée',
    desc: 'Tente plus grande et plus résistante contre les intempéries',
    price: 45
  },
  tente_luxe: {
    name: 'Tente de luxe (voyageur)',
    desc: 'Confort supérieur pour un repos optimal',
    price: 80
  },
  feu_camp: {
    name: 'Feu de camp renforcé',
    desc: 'Plus grand foyer permettant de cuisiner plus rapidement',
    price: 18
  },
  tapis_sol: {
    name: 'Tapis de sol',
    desc: 'Tapis pour plus de confort et d’esthétique',
    price: 10
  },
  chaises: {
    name: 'Chaises et tabourets',
    desc: 'Permet aux membres du camp de s’asseoir RP',
    price: 12
  },
  table_camp: {
    name: 'Table de camp',
    desc: 'Permet les repas communs ou réunions RP',
    price: 20
  },
  drapeaux: {
    name: 'Drapeaux personnalisés',
    desc: 'Bannières RP indiquant l’identité du groupe',
    price: 15
  },
  eclairage: {
    name: 'Éclairage (lanternes)',
    desc: 'Ajoute des lanternes suspendues et fixes',
    price: 8
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boutique')
    .setDescription('🏕️ Ouvre la boutique du camp'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🏕️ Boutique du camp')
      .setDescription('Sélectionnez un article dans le menu ci-dessous pour l’acheter avec votre compte courant.');
    
    // Ajout des articles dans l’embed
    for (const key of Object.keys(items)) {
      const it = items[key];
      embed.addFields({ name: `${it.name} — $${it.price}`, value: it.desc, inline: false });
    }

    // Création du menu déroulant
    const options = Object.entries(items).map(([value, it]) => ({
      label: it.name,
      description: `$${it.price}`,
      value
    }));
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('shop_buy')
        .setPlaceholder('Choisissez un article…')
        .addOptions(options)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
