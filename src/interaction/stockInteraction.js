// src/interaction/stockInteraction.js
const {
  InteractionType,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require('discord.js');

// Liste complète des items disponibles (exemple basé sur votre liste)
const availableItems = {
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
  // Ajoutez ici les autres items (chevaux, alcools, etc.)
};

// Exemple minimal pour la gestion des comptes
// Remplacez ou importez votre fonction réelle depuis economy.js ou un module dédié
function getOrCreateAccount(userId) {
  // Pour cet exemple, nous utilisons un objet en mémoire avec 1000$ par défaut
  if (!global._accounts) global._accounts = {};
  if (!global._accounts[userId]) {
    global._accounts[userId] = { courant: 1000, epargne: 0, investissement: 0 };
  }
  return global._accounts[userId];
}

async function handleStockInteractions(interaction) {
  // Gestion du Select Menu pour la commande /stock add
  if (interaction.isStringSelectMenu() && interaction.customId === 'stock_select_item') {
    const selectedItem = interaction.values[0]; // ex: "cattleman_revolver"

    // Création d'un modal pour demander la quantité
    const modal = new ModalBuilder()
      .setCustomId(`stock_quantity_modal_${selectedItem}`)
      .setTitle('Quantité à ajouter');

    const quantityInput = new TextInputBuilder()
      .setCustomId('stock_quantity_input')
      .setLabel(`Combien de ${selectedItem} souhaitez-vous ajouter ?`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 5')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(quantityInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }
  // Gestion de la soumission du modal
  else if (
    interaction.type === InteractionType.ModalSubmit &&
    interaction.customId.startsWith('stock_quantity_modal_')
  ) {
    const selectedItem = interaction.customId.replace('stock_quantity_modal_', '');
    const quantityValue = interaction.fields.getTextInputValue('stock_quantity_input');
    const quantity = parseFloat(quantityValue);
    if (isNaN(quantity) || quantity <= 0) {
      return interaction.reply({ content: 'Quantité invalide. Veuillez réessayer.', ephemeral: true });
    }
    const pricePerUnit = availableItems[selectedItem];
    if (!pricePerUnit) {
      return interaction.reply({ content: 'Item introuvable.', ephemeral: true });
    }
    const totalPrice = pricePerUnit * quantity;

    // Vérification des fonds du joueur
    const account = getOrCreateAccount(interaction.user.id);
    if (account.courant < totalPrice) {
      return interaction.reply({
        content: `Fonds insuffisants. Vous avez $${account.courant.toFixed(2)}, besoin de $${totalPrice.toFixed(2)}.`,
        ephemeral: true,
      });
    }
    // Déduction des fonds du joueur
    account.courant -= totalPrice;
    // Ajout des fonds à l'usine de production
    const factoryAccount = getOrCreateAccount(process.env.USINE_PRODUCTION_ID);
    factoryAccount.courant += totalPrice;
    // Mise à jour du stock global
    if (!global.stockData) global.stockData = {};
    if (!global.stockData[selectedItem]) global.stockData[selectedItem] = { quantite: 0, prixtotal: 0 };
    global.stockData[selectedItem].quantite += quantity;
    global.stockData[selectedItem].prixtotal += totalPrice;

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('Stock mis à jour')
      .setDescription(
        `Vous avez ajouté **${quantity}** de **${selectedItem}**.\n` +
        `Prix unitaire : $${pricePerUnit.toFixed(2)}\n` +
        `Total : $${totalPrice.toFixed(2)}\n\n` +
        `Les fonds ont été déduits et crédités à l'usine de production.`
      );
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

module.exports = { handleStockInteractions };
