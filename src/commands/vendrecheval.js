const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} = require('discord.js');
const { _horseStockInternal } = require('../interaction/horseStockInteraction');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vendrecheval')
    .setDescription('Vendre un cheval depuis le stock Kinuma (liste déroulante, montre aussi ceux à 0).')
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

    const stock = { ..._horseStockInternal.initAllHorses(), ..._horseStockInternal.loadStock() };

    // Toutes les montures, même à 0 (affiche la quantité)
    const options = Object.keys(stock).map(name =>
      new StringSelectMenuOptionBuilder()
        .setLabel(name)
        .setValue(name)
        .setDescription(`En stock: ${stock[name] ?? 0}`)
    );

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`sell_horse_select:${target.id}:${price}`)
      .setPlaceholder(`Choisis le cheval à vendre à ${target.username}`)
      .addOptions(options.slice(0, 25)); // si >25, on splittera plus tard (actuellement ça passe)

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      content: `Sélectionne le cheval à vendre à <@${target.id}> pour **${price}$** :\n*(Ceux à 0 sont affichés mais **non vendables**.)*`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};
