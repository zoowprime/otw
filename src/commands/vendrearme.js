const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');
const { _stockInternal } = require('../interaction/stockInteraction');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vendrearme')
    .setDescription('Vendre une arme depuis le stock.')
    .addStringOption(o =>
      o.setName('atelier')
        .setDescription('Nom de l’atelier')
        .setRequired(true)
        .addChoices({ name: 'tetsuironworks', value: 'tetsuironworks' })
    )
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
    const atelier = interaction.options.getString('atelier', true);
    const target = interaction.options.getUser('cible', true);
    const price = interaction.options.getInteger('prix', true);

    if (atelier !== 'tetsuironworks') {
      return interaction.reply({ content: 'Atelier inconnu.', flags: MessageFlags.Ephemeral });
    }

    const stock = { ..._stockInternal.initAllItems(), ..._stockInternal.loadStock() };

    // Options : uniquement armes avec stock > 0 (sinon frustrant)
    const options = Object.entries(stock)
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([name]) => ({ label: name, value: name }));

    if (options.length === 0) {
      return interaction.reply({ content: '❌ Le stock est vide.', flags: MessageFlags.Ephemeral });
    }

    // Sélecteur d’armes (pas de saisie manuelle)
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`sell_weapon_select:${target.id}:${price}`)
      .setPlaceholder(`Choisis l’arme à vendre à ${target.username}`)
      .addOptions(options.slice(0,25)); // 25 max par menu

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      content: `Sélectionne l’arme à vendre à <@${target.id}> pour **${price}$** :`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};
