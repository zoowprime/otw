// src/commands/vendrearme.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} = require('discord.js');
const { _stockInternal } = require('../interaction/stockInteraction'); // stock + helpers

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vendrearme')
    .setDescription('Vendre une arme depuis le stock (liste déroulante, même si quantité = 0).')
    .addUserOption(o =>
      o.setName('cible')
        .setDescription('Acheteur')
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('prix')
        .setDescription('Prix en $')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('cible', true);
    const price  = interaction.options.getInteger('prix', true);

    // Récupère tout le stock (avec 0 par défaut sur les armes manquantes)
    const stock = { ..._stockInternal.initAllItems(), ..._stockInternal.loadStock() };

    // Construit le menu avec TOUTES les armes (même celles à 0)
    // NB: ta liste fait 25 armes pile → un seul menu suffit.
    const options = Object.keys(stock).map(name =>
      new StringSelectMenuOptionBuilder()
        .setLabel(name)
        .setValue(name)
        .setDescription(`En stock: ${stock[name] ?? 0}`)
    );

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`sell_weapon_select:${target.id}:${price}`)
      .setPlaceholder(`Choisis l’arme à vendre à ${target.username}`)
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      content: `Sélectionne l’arme à vendre à <@${target.id}> pour **${price}$** :\n*(Les armes à 0 sont affichées mais **non vendables**.)*`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};
