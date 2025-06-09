// src/commands/sesslancee.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const roleIDEnVille = '1378037596566978561';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sesslancee')
    .setDescription('Annonce le début d\'une session avec options de présence.')
    .addStringOption(option =>
      option
        .setName('horaire')
        .setDescription('L\'horaire de lancement de la session (ex. 20h30)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('psn')
        .setDescription('Le PSN du lanceur')
        .setRequired(true)
    ),
  async execute(interaction) {
    const horaire = interaction.options.getString('horaire');
    const psn = interaction.options.getString('psn');

    const embed = new EmbedBuilder()
      .setColor(0xff0000) // rouge
      .setTitle('Session Roleplay Old Town Western - Lancement')
      .setDescription(`**Horaire de lancement :** ${horaire}
**PSN du lanceur :** ${psn}

✔️ En Ville
❌ Déconnecté

Merci de cliquer sur le bouton ✔️ En Ville lorsque vous êtes en session et de cocher sur le bouton ❌ Déconnecté lorsque vous vous êtes déconnecté de la session.`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('en_ville')
        .setLabel('✔️ En Ville')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('deconnecte')
        .setLabel('❌ Déconnecté')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};

// --- Interaction Handler ---

// Dans votre listener d'interactions par boutons (ex: dans interactionCreate.js ou index.js)
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const member = interaction.member;
  const role = interaction.guild.roles.cache.get('1378037596566978561');

  if (!role) return interaction.reply({ content: 'Rôle introuvable.', ephemeral: true });

  if (interaction.customId === 'en_ville') {
    await member.roles.add(role);
    await interaction.reply({ content: 'Tu as été ajouté au rôle En Ville.', ephemeral: true });
  } else if (interaction.customId === 'deconnecte') {
    await member.roles.remove(role);
    await interaction.reply({ content: 'Tu as été retiré du rôle En Ville.', ephemeral: true });
  }
});
