// src/commands/avertir.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'warnings.json');

// Charge (ou initialise) le fichier de données
function loadWarnings() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, '{}');
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}
function saveWarnings(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avertir')
    .setDescription('⚠️ Avertit un membre et suit le nombre d’avertissements.')
    .addUserOption(opt =>
      opt.setName('cible')
         .setDescription('Le membre à avertir')
         .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('raison')
         .setDescription('Raison de l’avertissement')
         .setRequired(true)
    )
    // On restreint l’usage à ceux qui peuvent gérer les messages, ou on reverra si tu veux rôle STAFF seulement
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;
    // Vérif rôle staff
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: '❌ Vous n’avez pas la permission d’utiliser cette commande.',
        ephemeral: true
      });
    }

    const target = interaction.options.getUser('cible');
    const reason = interaction.options.getString('raison');

    // Charge et met à jour le compteur
    const warnings = loadWarnings();
    const id = target.id;
    warnings[id] = (warnings[id] || 0) + 1;
    saveWarnings(warnings);

    // Crée l’embed
    const embed = new EmbedBuilder()
      .setTitle('Sanction')
      .setColor(0xff0000)
      .setDescription(
        `Le membre **${target.username}** (<@${id}>) a été **averti**. `+
        `(${warnings[id]} avertissement${warnings[id] > 1 ? 's' : ''})`
      )
      .addFields({ name: 'Raison', value: reason });

    // Envoi public
    await interaction.reply({ embeds: [embed] });
  }
};