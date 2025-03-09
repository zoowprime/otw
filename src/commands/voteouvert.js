const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const votingData = require('../votingData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voteouvert')
    .setDescription('Ouvre une session de vote pour les élections (max 4 candidats)')
    .addUserOption(option =>
      option.setName('candidat1')
        .setDescription('Premier candidat')
        .setRequired(true)
    )
    .addUserOption(option =>
      option.setName('candidat2')
        .setDescription('Deuxième candidat')
        .setRequired(true)
    )
    .addUserOption(option =>
      option.setName('candidat3')
        .setDescription('Troisième candidat (optionnel)')
        .setRequired(false)
    )
    .addUserOption(option =>
      option.setName('candidat4')
        .setDescription('Quatrième candidat (optionnel)')
        .setRequired(false)
    ),
  async execute(interaction) {
    // Vérifier le rôle Élection
    if (!interaction.member.roles.cache.has(process.env.ELECTION_ROLE_ID)) {
      return interaction.reply({ content: "Vous n'avez pas la permission d'ouvrir une session de vote.", ephemeral: true });
    }
    // Récupérer les candidats
    const candidat1 = interaction.options.getUser('candidat1');
    const candidat2 = interaction.options.getUser('candidat2');
    const candidat3 = interaction.options.getUser('candidat3');
    const candidat4 = interaction.options.getUser('candidat4');

    const candidates = [candidat1, candidat2];
    if (candidat3) candidates.push(candidat3);
    if (candidat4) candidates.push(candidat4);

    // Enregistrer la session de vote
    votingData.active = true;
    votingData.candidates = candidates.map(u => u.id);
    votingData.votes = {};
    candidates.forEach(user => {
      votingData.votes[user.id] = 0;
    });

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle("Session de vote ouverte")
      .setDescription("Les candidats pour cette élection sont :\n" +
        candidates.map((u, i) => `${i + 1}. ${u.tag}`).join("\n") +
        "\n\nLes votes seront enregistrés via la commande /votepolitiques.");
    return interaction.reply({ embeds: [embed] });
  }
};
