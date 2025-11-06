// src/interaction/inventoryInteraction.js
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  MessageFlags,
  ChannelType,
} = require('discord.js');

const {
  getOrCreateInventory,
  addItem,
  removeItem,
} = require('../inventoryData');

const CAT_META = {
  armes:              { label: 'Armes',        emoji: '🗡️' },
  chevaux:            { label: 'Chevaux',      emoji: '🐎' },
  charrettes:         { label: 'Charrettes',   emoji: '🚚' },
  minerais:           { label: 'Minerais',     emoji: '⛏️' },
  autres:             { label: 'Autres',       emoji: '🎒' },
  agricole_brut:      { label: 'Agricole (Brut)',        emoji: '🌾' },
  agricole_transforme:{ label: 'Agricole (Transformé)',  emoji: '⚙️' },
};

function makeItemsMenu(userId, category, customId) {
  const inv = getOrCreateInventory(userId);
  const list = inv[category] || [];

  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder('Choisis un item (1 unité sera transférée)')
    .addOptions(
      list.slice(0, 25).map(it =>
        new StringSelectMenuOptionBuilder()
          .setLabel(it.name)
          .setValue(it.name)
          .setDescription(`Quantité: ${it.quantity}`)
          .setEmoji(CAT_META[category]?.emoji || '📦')
      )
    );

  return new ActionRowBuilder().addComponents(menu);
}

async function dm(user, content) {
  try {
    const dm = await user.createDM();
    await dm.send(content);
  } catch { /* pas grave si fermé */ }
}

module.exports.handleInventoryInteractions = async function handleInventoryInteractions(interaction) {
  if (!interaction.isStringSelectMenu()) return;

  // ————— Donner: étape 1 (choix catégorie) —————
  if (interaction.customId.startsWith('inv_give_select:')) {
    const targetId = interaction.customId.split(':')[1];
    const category = interaction.values?.[0];
    if (!category) {
      return interaction.reply({ content: '❗ Choix invalide.', flags: MessageFlags.Ephemeral });
    }

    // Si pas d’item dans la catégorie (concurrence), on prévient
    const inv = getOrCreateInventory(interaction.user.id);
    if (!(inv[category] || []).length) {
      return interaction.reply({ content: '❗ Catégorie vide.', flags: MessageFlags.Ephemeral });
    }

    const row = makeItemsMenu(interaction.user.id, category, `inv_give_item:${targetId}:${category}`);
    if (interaction.replied || interaction.deferred) {
      return interaction.followUp({ content: 'Sélectionne l’item à donner :', components: [row], flags: MessageFlags.Ephemeral });
    }
    return interaction.update({ content: 'Sélectionne l’item à donner :', components: [row] });
  }

  // ————— Donner: étape 2 (choix item) —————
  if (interaction.customId.startsWith('inv_give_item:')) {
    const [, targetId, category] = interaction.customId.split(':');
    const itemName = interaction.values?.[0];
    if (!itemName) {
      return interaction.reply({ content: '❗ Choix invalide.', flags: MessageFlags.Ephemeral });
    }

    // Retire 1 au donneur
    const res = removeItem(interaction.user.id, category, itemName, 1);
    if (!res.ok) {
      if (res.reason === 'not_found') {
        return interaction.reply({ content: '❗ Item introuvable (inventaire changé ?)', flags: MessageFlags.Ephemeral });
      }
      if (res.reason === 'insufficient') {
        return interaction.reply({ content: `❗ Quantité insuffisante (disponible: ${res.have}).`, flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ content: '❗ Erreur.', flags: MessageFlags.Ephemeral });
    }

    // Ajoute 1 au receveur
    addItem(targetId, category, itemName, 1);

    // DM + confirmations
    const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
    if (targetUser) {
      await dm(targetUser, `🎁 Vous avez reçu **1× ${itemName}** de ${interaction.user.tag}.`);
    }
    await interaction.reply({ content: `✅ Don confirmé : **1× ${itemName}** → <@${targetId}>.`, flags: MessageFlags.Ephemeral });
    return;
  }

  // ————— Voler: étape 1 (choix catégorie chez la cible) —————
  if (interaction.customId.startsWith('inv_steal_select:')) {
    const victimId = interaction.customId.split(':')[1];
    const category = interaction.values?.[0];
    if (!category) {
      return interaction.reply({ content: '❗ Choix invalide.', flags: MessageFlags.Ephemeral });
    }

    const inv = getOrCreateInventory(victimId);
    if (!(inv[category] || []).length) {
      return interaction.reply({ content: '❗ Catégorie vide chez la cible.', flags: MessageFlags.Ephemeral });
    }

    const row = makeItemsMenu(victimId, category, `inv_steal_item:${victimId}:${category}`);
    if (interaction.replied || interaction.deferred) {
      return interaction.followUp({ content: 'Choisis l’item à voler :', components: [row], flags: MessageFlags.Ephemeral });
    }
    return interaction.update({ content: 'Choisis l’item à voler :', components: [row] });
  }

  // ————— Voler: étape 2 (choix item) —————
  if (interaction.customId.startsWith('inv_steal_item:')) {
    const [, victimId, category] = interaction.customId.split(':');
    const itemName = interaction.values?.[0];
    if (!itemName) {
      return interaction.reply({ content: '❗ Choix invalide.', flags: MessageFlags.Ephemeral });
    }

    // Optionnel: vérif rôle voleur
    const thiefRole = process.env.THIEF_ROLE_ID;
    if (thiefRole && !interaction.member.roles.cache.has(thiefRole)) {
      return interaction.reply({ content: '❌ Tu n’as pas le rôle requis pour voler.', flags: MessageFlags.Ephemeral });
    }

    // Retire 1 à la victime
    const res = removeItem(victimId, category, itemName, 1);
    if (!res.ok) {
      if (res.reason === 'not_found') {
        return interaction.reply({ content: '❗ Item introuvable chez la cible (inventaire changé ?)', flags: MessageFlags.Ephemeral });
      }
      if (res.reason === 'insufficient') {
        return interaction.reply({ content: `❗ Quantité insuffisante chez la cible.`, flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ content: '❗ Erreur.', flags: MessageFlags.Ephemeral });
    }

    // Ajoute 1 au voleur
    addItem(interaction.user.id, category, itemName, 1);

    // DM victim + confirmation voleur
    const victimUser = await interaction.client.users.fetch(victimId).catch(() => null);
    if (victimUser) {
      await dm(victimUser, `⚠️ On vous a volé **1× ${itemName}**.`);
    }
    await interaction.reply({ content: `🕶️ Vol confirmé : **1× ${itemName}** pris à <@${victimId}>.`, flags: MessageFlags.Ephemeral });
    return;
  }
};
