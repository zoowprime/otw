// src/commands/inventaire.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');

const {
  getOrCreateInventory,
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

function embedInventory(username, inv) {
  const lines = [];
  const section = (key) => {
    const meta = CAT_META[key];
    const items = inv[key] || [];
    const title = `\n${meta.emoji} **${meta.label}**`;
    if (!items.length) return `${title}\n• _Aucun_`;
    return `${title}\n` + items.map(it => `• ${it.name} — **$${(it.quantity || 0)}**`).join('\n');
  };

  const desc = [
    section('armes'),
    section('chevaux'),
    section('charrettes'),
    section('minerais'),
    section('autres'),
    // Affiche les sections agricoles si tu veux les rendre visibles tout de suite :
    // section('agricole_brut'),
    // section('agricole_transforme'),
  ].join('\n');

  return new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle(`🎒 Inventaire de ${username}`)
    .setDescription(desc)
    .setFooter({ text: 'OTW • Inventaire persistant' })
    .setTimestamp();
}

function categoriesForUser(userId) {
  const inv = getOrCreateInventory(userId);
  const keys = Object.keys(CAT_META);
  return keys.filter(k => (inv[k] || []).length > 0);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventaire')
    .setDescription("Gestion d'inventaire persistant & joliment présenté.")

    .addSubcommand(sc =>
      sc.setName('voir')
        .setDescription("Voir un inventaire")
        .addUserOption(o =>
          o.setName('cible')
            .setDescription("Joueur dont on veut voir l'inventaire (facultatif)")
            .setRequired(false)
        )
    )

    .addSubcommand(sc =>
      sc.setName('donner')
        .setDescription("Donner 1 unité d'un item à un joueur (menu par catégorie → item)")
        .addUserOption(o =>
          o.setName('cible')
            .setDescription('Joueur à qui donner')
            .setRequired(true)
        )
    )

    .addSubcommand(sc =>
      sc.setName('voler')
        .setDescription("Voler 1 unité d'un item (catégorie → item). Rôle requis: THIEF_ROLE_ID")
        .addUserOption(o =>
          o.setName('cible')
            .setDescription('Victime')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'voir') {
      const user = interaction.options.getUser('cible') || interaction.user;
      const inv = getOrCreateInventory(user.id);
      const embed = embedInventory(user.username, inv);
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'donner') {
      const target = interaction.options.getUser('cible', true);
      if (target.id === interaction.user.id) {
        return interaction.reply({ content: '❌ Tu ne peux pas te donner un item à toi-même.', flags: MessageFlags.Ephemeral });
      }
      const availCats = categoriesForUser(interaction.user.id);
      if (!availCats.length) {
        return interaction.reply({ content: '🥲 Ton inventaire est vide.', flags: MessageFlags.Ephemeral });
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`inv_give_select:${target.id}`)
        .setPlaceholder('Choisis une catégorie à donner')
        .addOptions(
          availCats.map(k => {
            const meta = CAT_META[k];
            return new StringSelectMenuOptionBuilder()
              .setLabel(meta.label)
              .setValue(k)
              .setEmoji(meta.emoji);
          })
        );

      const row = new ActionRowBuilder().addComponents(menu);
      return interaction.reply({
        content: `🎁 Sélectionne une **catégorie** à donner à <@${target.id}> :`,
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'voler') {
      const thiefRole = process.env.THIEF_ROLE_ID;
      if (thiefRole && !interaction.member.roles.cache.has(thiefRole)) {
        return interaction.reply({ content: '❌ Tu n’as pas l’autorisation de voler.', flags: MessageFlags.Ephemeral });
      }
      const victim = interaction.options.getUser('cible', true);
      if (victim.id === interaction.user.id) {
        return interaction.reply({ content: '❌ Tu ne peux pas te voler toi-même.', flags: MessageFlags.Ephemeral });
      }

      const availCats = categoriesForUser(victim.id);
      if (!availCats.length) {
        return interaction.reply({ content: '😶 La cible n’a rien à voler.', flags: MessageFlags.Ephemeral });
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`inv_steal_select:${victim.id}`)
        .setPlaceholder('Choisis une catégorie à voler')
        .addOptions(
          availCats.map(k => {
            const meta = CAT_META[k];
            return new StringSelectMenuOptionBuilder()
              .setLabel(meta.label)
              .setValue(k)
              .setEmoji(meta.emoji);
          })
        );

      const row = new ActionRowBuilder().addComponents(menu);
      return interaction.reply({
        content: `🕶️ Choisis une **catégorie** à voler à <@${victim.id}> :`,
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
