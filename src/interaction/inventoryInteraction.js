// src/interaction/inventoryInteraction.js
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');

const { getUser } = require('../data/inventoryStore');
const catalog = require('../data/itemCatalog');

// Util: transforme la liste {name,quantity} en options de menu
function toSelectOptions(items) {
  // On limite à 25 pour Discord
  return items.slice(0, 25).map(it => {
    const id = it.name || it.id;
    const meta = catalog[id] || {};
    const label = meta.label || id.replace(/_/g, ' ');
    const qty   = typeof it.quantity === 'number' ? it.quantity : 1;
    return {
      label: label,
      value: id,
      description: `x${qty}${meta.weight ? ` — ${meta.weight}kg` : ''}`,
    };
  });
}

async function handleInventoryInteractions(interaction) {
  // Boutons
  if (interaction.isButton()) {
    const uid = interaction.user.id;

    // On récupère l'inventaire utilisateur
    const st = getUser(uid);
    const items = Array.isArray(st.items) ? st.items : [];

    // Menus éphémères (Donner / Utiliser / Jeter)
    if (interaction.customId === 'inv_give') {
      // Ouvre un menu d'items à donner (démonstration : on ne transfère pas encore)
      const options = toSelectOptions(items);
      if (!options.length)
        return interaction.reply({ content: '📦 Inventaire vide.', flags: MessageFlags.Ephemeral });

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('inv_give_select')
          .setPlaceholder('Sélectionne un item à donner…')
          .addOptions(options)
      );

      return interaction.reply({
        embeds: [ new EmbedBuilder().setColor(0x2ecc71).setTitle('Donner — Choix de l’item') ],
        components: [row],
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId === 'inv_use') {
      // Filtre: seulement consommables
      const consumables = items.filter(it => {
        const id = it.name || it.id;
        return (catalog[id]?.consumable) === true;
      });
      if (!consumables.length)
        return interaction.reply({ content: 'Aucun consommable.', flags: MessageFlags.Ephemeral });

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('inv_use_select')
          .setPlaceholder('Sélectionne un consommable…')
          .addOptions(toSelectOptions(consumables))
      );

      return interaction.reply({
        embeds: [ new EmbedBuilder().setColor(0x3498db).setTitle('Utiliser — Choix du consommable') ],
        components: [row],
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId === 'inv_drop') {
      const options = toSelectOptions(items);
      if (!options.length)
        return interaction.reply({ content: '📦 Inventaire vide.', flags: MessageFlags.Ephemeral });

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('inv_drop_select')
          .setPlaceholder('Sélectionne un item à jeter…')
          .addOptions(options)
      );

      return interaction.reply({
        embeds: [ new EmbedBuilder().setColor(0xe74c3c).setTitle('Jeter — Choix de l’item') ],
        components: [row],
        flags: MessageFlags.Ephemeral
      });
    }

    // Si d’autres boutons (non liés à l’inventaire), on ne fait rien ici
    return;
  }

  // Menus (démo : on confirme juste; tu brancheras ensuite la logique réelle donner/consommer/jeter)
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'inv_give_select') {
      const id = interaction.values[0];
      return interaction.update({
        embeds: [ new EmbedBuilder().setColor(0x2ecc71).setDescription(`✅ Tu as choisi **${id.replace(/_/g, ' ')}** à donner.\n(Étape suivante : demander la cible et transférer.)`) ],
        components: []
      });
    }
    if (interaction.customId === 'inv_use_select') {
      const id = interaction.values[0];
      return interaction.update({
        embeds: [ new EmbedBuilder().setColor(0x3498db).setDescription(`✅ Tu as consommé **${id.replace(/_/g, ' ')}**.\n(Étape suivante : appliquer les effets faim/soif et décrémenter.)`) ],
        components: []
      });
    }
    if (interaction.customId === 'inv_drop_select') {
      const id = interaction.values[0];
      return interaction.update({
        embeds: [ new EmbedBuilder().setColor(0xe74c3c).setDescription(`🗑️ Tu as choisi de jeter **${id.replace(/_/g, ' ')}**.\n(Étape suivante : quantité si empilable, puis retrait.)`) ],
        components: []
      });
    }
  }
}

module.exports = { handleInventoryInteractions };
