// src/interaction/stockInteraction.js
const {
  InteractionType,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require('discord.js');

// Importez votre liste d'items ou votre structure globale
// pour retrouver le prix unitaire. Par exemple :
const availableItems = {
  "cattleman_revolver": 18.50,
  "navy_revolver": 18.00,
  // ... le reste
};

// Supposez que vous ayez un module economyUtils
// qui gère les comptes, par ex getOrCreateAccount
const { getOrCreateAccount } = require('../economyUtils');

async function handleStockInteractions(interaction) {
  // 1) Sélection d’item dans le select menu
  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === 'stock_select_item'
  ) {
    const selectedItem = interaction.values[0]; // ex: "cattleman_revolver"

    // Créer un modal pour saisir la quantité
    const modal = new ModalBuilder()
      .setCustomId(`stock_quantity_modal_${selectedItem}`)
      .setTitle('Quantité à ajouter');

    // Champ de saisie
    const quantityInput = new TextInputBuilder()
      .setCustomId('stock_quantity_input')
      .setLabel(`Combien de ${selectedItem} ?`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 5')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(quantityInput);
    modal.addComponents(row);

    // Affiche le modal à l’utilisateur
    await interaction.showModal(modal);
  }

  // 2) Réception du modal
  else if (
    interaction.type === InteractionType.ModalSubmit &&
    interaction.customId.startsWith('stock_quantity_modal_')
  ) {
    const selectedItem = interaction.customId.replace('stock_quantity_modal_', '');
    const quantityInput = interaction.fields.getTextInputValue('stock_quantity_input');
    const quantity = parseFloat(quantityInput);

    if (isNaN(quantity) || quantity <= 0) {
      return interaction.reply({
        content: 'Quantité invalide. Veuillez réessayer.',
        ephemeral: true,
      });
    }

    // Vérifier que l’item existe
    const pricePerUnit = availableItems[selectedItem];
    if (!pricePerUnit) {
      return interaction.reply({
        content: 'Item introuvable.',
        ephemeral: true,
      });
    }

    const totalPrice = pricePerUnit * quantity;

    // Exemple : on retire l’argent du compte de l’utilisateur
    const account = getOrCreateAccount(interaction.user.id);
    if (account.courant < totalPrice) {
      return interaction.reply({
        content: `Fonds insuffisants. Vous avez $${account.courant.toFixed(2)}, besoin de $${totalPrice.toFixed(2)}.`,
        ephemeral: true,
      });
    }

    // Retirer du joueur
    account.courant -= totalPrice;

    // Ajouter à l’usine (ID stocké dans process.env.USINE_PRODUCTION_ID)
    const factoryAccount = getOrCreateAccount(process.env.USINE_PRODUCTION_ID);
    factoryAccount.courant += totalPrice;

    // Mettre à jour le stock global
    if (!global.stockData) global.stockData = {};
    if (!global.stockData[selectedItem]) {
      global.stockData[selectedItem] = { quantite: 0, prixtotal: 0 };
    }
    global.stockData[selectedItem].quantite += quantity;
    global.stockData[selectedItem].prixtotal += totalPrice;

    // Réponse finale
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('Stock mis à jour')
      .setDescription(
        `Vous avez ajouté **${quantity}** de **${selectedItem}**.\n` +
        `Prix unitaire : $${pricePerUnit.toFixed(2)}\n` +
        `Total : $${totalPrice.toFixed(2)}\n\n` +
        `Stock mis à jour avec succès !`
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

module.exports = { handleStockInteractions };
