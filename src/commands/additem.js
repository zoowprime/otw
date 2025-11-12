// src/commands/additem.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  MessageFlags,
} = require('discord.js');

const catalog = require('../data/itemCatalog');
const { addItem } = require('../data/inventoryStore');

const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;

// ———————————————————————————————————————————————
// Regroupement des items en catégories lisibles
// (basé sur les propriétés/ids présents dans itemCatalog)
// ———————————————————————————————————————————————

const ILLEGAL_IDS = new Set([
  'dynamite','bouteille_incendiaire','tomahawk',
  'fusil_double_canon','fusil_pompe','fusil_canon_scie',
  'fusil_semi_automatique','pistolet_semi_automatique',
  'pistolet_mauser','pistolet_1899','fusil_carcano','fusil_rolling_block'
]);

const TOOL_IDS = new Set([
  'kit_crochetage','lasso','cisaille','couteau','couteau_de_chasse',
  'couteau_de_lancer','marteau','hachette','hache','machette'
]);

function buildGroups() {
  /** @type {Record<string, Array<{id:string,label:string,emoji?:string}>>} */
  const groups = {
    '🌮 Consommables': [],
    '🧰 Outils & divers': [],
    '🪖 Armes légales': [],
    '⛏️ Exploitation — bruts': [],
    '🏭 Exploitation — transformés': [],
    '🕶️ Armes illégales': [], // présent pour tests Staff, même si la boutique illégale est supprimée
  };

  for (const id of Object.keys(catalog)) {
    const it = catalog[id];
    const entry = { id: it.id, label: it.label || it.id, emoji: it.emoji };

    if (it.consumable === true) {
      groups['🌮 Consommables'].push(entry);
      continue;
    }

    if (id.endsWith('_brut')) {
      groups['⛏️ Exploitation — bruts'].push(entry);
      continue;
    }
    if (id.endsWith('_transformer')) {
      groups['🏭 Exploitation — transformés'].push(entry);
      continue;
    }

    if (ILLEGAL_IDS.has(id)) {
      groups['🕶️ Armes illégales'].push(entry);
      continue;
    }

    if (TOOL_IDS.has(id)) {
      groups['🧰 Outils & divers'].push(entry);
      continue;
    }

    // Armes légales (heuristique : préfixes connus)
    if (
      id.startsWith('revolver_') || id.startsWith('pistolet_') ||
      id.startsWith('carabine_') || id.startsWith('fusil_') ||
      id.startsWith('arc')
    ) {
      // éviter collision avec illégales déjà classées
      if (!ILLEGAL_IDS.has(id)) groups['🪖 Armes légales'].push(entry);
      continue;
    }

    // Par défaut: fourrer dans outils & divers si rien d'autre
    groups['🧰 Outils & divers'].push(entry);
  }

  // Tri alphabétique par lisibilité
  for (const k of Object.keys(groups)) {
    groups[k].sort((a,b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
  }

  return groups;
}

function buildCategoryMenu(groups) {
  const catNames = Object.keys(groups).filter(k => groups[k]?.length);
  const menu = new StringSelectMenuBuilder()
    .setCustomId('additem_category')
    .setPlaceholder('Choisis une catégorie d’items…')
    .addOptions(catNames.slice(0, 25).map((name) => ({
      label: name.replace(/^[^\w]*\s*/, ''), // enlever l’emoji dans le label du menu
      value: name,
      description: `${groups[name].length} item(s)`,
      emoji: name.split(' ')[0], // l’emoji du début du nom de catégorie
    })));

  return new ActionRowBuilder().addComponents(menu);
}

function buildItemMenu(items) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('additem_item')
    .setPlaceholder('Choisis un item…')
    .addOptions(items.slice(0, 25).map((it) => ({
      label: it.label.slice(0, 100),
      value: it.id,
      description: it.id,
      emoji: it.emoji || undefined,
    })));

  return new ActionRowBuilder().addComponents(menu);
}

function buildQuantityMenu() {
  const quantities = [1, 2, 5, 10, 25, 50, 100];
  const menu = new StringSelectMenuBuilder()
    .setCustomId('additem_qty')
    .setPlaceholder('Quantité à ajouter…')
    .addOptions(quantities.map(q => ({
      label: `x${q}`,
      value: String(q),
      description: `Ajouter ${q} exemplaire(s)`,
    })));
  return new ActionRowBuilder().addComponents(menu);
}

// ———————————————————————————————————————————————

module.exports = {
  data: new SlashCommandBuilder()
    .setName('additem')
    .setDescription('STAFF — Ajouter rapidement des items à ton inventaire pour tests')
    // .addUserOption(o => o.setName('cible').setDescription('Optionnel: donner à un autre joueur').setRequired(false)) // à activer si tu veux cibler quelqu’un
  ,
  async execute(interaction) {
    // Permission STAFF
    if (STAFF_ROLE_ID && !interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: '⛔ Réservé au STAFF.', flags: MessageFlags.Ephemeral });
    }

    const groups = buildGroups();

    const intro = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle('🎒 Add Item — Staff')
      .setDescription(
        `Sélectionne d’abord une **catégorie**, puis un **item**, puis une **quantité**.\n\n` +
        `Les items sélectionnés seront **ajoutés à *ton* inventaire** (utilisateur courant).\n` +
        `> Astuce: tape **/inventaire** après pour vérifier la sacoche.`
      )
      .setFooter({ text: 'OTW — Outil Staff' });

    await interaction.reply({
      embeds: [intro],
      components: [buildCategoryMenu(groups)],
      flags: MessageFlags.Ephemeral
    });

    const msg = await interaction.fetchReply();

    // 1) Catégorie
    const catSel = await msg.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      time: 90_000,
      filter: i => i.customId === 'additem_category' && i.user.id === interaction.user.id
    }).catch(() => null);

    if (!catSel) {
      return interaction.editReply({
        embeds: [ new EmbedBuilder().setColor(0x7f8c8d).setTitle('⏱️ Temps écoulé') ],
        components: []
      });
    }

    const catName = catSel.values[0];
    const items = groups[catName] || [];
    if (!items.length) {
      return catSel.update({
        embeds: [ new EmbedBuilder().setColor(0xe74c3c).setTitle('❌ Catégorie vide') ],
        components: []
      });
    }

    await catSel.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle(`📦 Catégorie: ${catName}`)
          .setDescription('Choisis **un item** puis **une quantité**.')
      ],
      components: [buildItemMenu(items)]
    });

    // 2) Item
    const itemSel = await msg.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      time: 90_000,
      filter: i => i.customId === 'additem_item' && i.user.id === interaction.user.id
    }).catch(() => null);

    if (!itemSel) {
      return interaction.editReply({
        embeds: [ new EmbedBuilder().setColor(0x7f8c8d).setTitle('⏱️ Temps écoulé') ],
        components: []
      });
    }

    const itemId = itemSel.values[0];
    const meta = catalog[itemId];
    if (!meta) {
      return itemSel.update({
        embeds: [ new EmbedBuilder().setColor(0xe74c3c).setTitle('❌ Item inconnu').setDescription(itemId) ],
        components: []
      });
    }

    await itemSel.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`🎯 Item: ${meta.label}`)
          .setDescription('Sélectionne la **quantité** à ajouter.')
          .addFields(
            { name: 'ID', value: meta.id, inline: true },
            { name: 'Poids unitaire', value: `${meta.weight ?? 0} kg`, inline: true },
            { name: 'Empilable', value: String(!!meta.stackable), inline: true },
          )
      ],
      components: [buildQuantityMenu()]
    });

    // 3) Quantité
    const qtySel = await msg.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      time: 90_000,
      filter: i => i.customId === 'additem_qty' && i.user.id === interaction.user.id
    }).catch(() => null);

    if (!qtySel) {
      return interaction.editReply({
        embeds: [ new EmbedBuilder().setColor(0x7f8c8d).setTitle('⏱️ Temps écoulé') ],
        components: []
      });
    }

    const qty = Math.max(1, parseInt(qtySel.values[0], 10) || 1);
    const userId = interaction.user.id; // on give à soi-même

    // Ajout inventaire
    const result = addItem(userId, itemId, qty);

    return qtySel.update({
      embeds: [
        new EmbedBuilder()
          .setColor(result?.ok ? 0x2ecc71 : 0xe74c3c)
          .setTitle(result?.ok ? '✅ Ajout effectué' : '❌ Échec de l’ajout')
          .setDescription(
            result?.ok
              ? `Tu as reçu **${qty} × ${meta.label}** dans ta sacoche.\n> Lance **/inventaire** pour vérifier.`
              : (result?.reason || 'Erreur inconnue.')
          )
      ],
      components: []
    });
  }
};
