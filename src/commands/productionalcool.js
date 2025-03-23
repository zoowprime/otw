// src/commands/productionalcool.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const alcoholChoices = [
  { name: "Alcool arômes des îles", value: "alcool_aromes_des_iles" },
  { name: "Cidre sauvage", value: "cidre_sauvage" },
  { name: "Liqueur de jouvence", value: "liqueur_de_jouvence" },
  { name: "Menthe Sanguine", value: "menthe_sanguine" },
  { name: "Pomme rose", value: "pomme_rose" },
  { name: "Prune sauvage", value: "prune_sauvage" },
  { name: "Punch Tropical", value: "punch_tropical" },
  { name: "Péché mignon", value: "peche_mignon" },
  { name: "Soleil rouge", value: "soleil_rouge" }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('productionalcool')
    .setDescription("Lance la production d'un alcool sélectionné.")
    .addStringOption(option =>
      option.setName('alcool')
        .setDescription("Choisissez l'alcool à produire")
        .setRequired(true)
        .addChoices(...alcoholChoices)
    ),
  async execute(interaction) {
    const alcoolValue = interaction.options.getString('alcool');
    const selected = alcoholChoices.find(choice => choice.value === alcoolValue);
    const alcoolName = selected ? selected.name : "l'alcool sélectionné";

    const embedInitial = new EmbedBuilder()
      .setColor(0xffc0cb)
      .setTitle("Production d'alcool")
      .setDescription(`Vous lancez une production d’alcool (${alcoolName}). Elle sera prête dans une heure !`);

    await interaction.reply({ embeds: [embedInitial] });

    // Après 1 heure, envoyer un message final en pinguant l'utilisateur
    setTimeout(async () => {
      const embedFinal = new EmbedBuilder()
        .setColor(0xffc0cb)
        .setTitle("Production terminée")
        .setDescription("Production de votre alcool terminée !");
      await interaction.followUp({ content: `<@${interaction.user.id}>`, embeds: [embedFinal] });
    }, 3600000); // 1 heure en millisecondes
  }
};
