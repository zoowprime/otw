// src/commands/rappel.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rappel')
    .setDescription('Planifie un rappel pour un joueur')
    .addUserOption(opt =>
      opt.setName('cible')
         .setDescription('Le joueur à rappeler')
         .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('duree')
         .setDescription('Dans combien de temps ?')
         .setRequired(true)
         .addChoices(
           { name: '15 minutes',    value: '900000' },  // 15*60*1000
           { name: '30 minutes',    value: '1800000' }, // 30*60*1000
           { name: '1 heure',       value: '3600000' }, // 60*60*1000
           { name: '2 heures',      value: '7200000' }  // 2*60*60*1000
         )
    )
    .addStringOption(opt =>
      opt.setName('message')
         .setDescription('Ce que vous voulez rappeler')
         .setRequired(true)
    )
    // ce flag permet de masquer la commande aux non-staff, mais on double-vérifie
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande.',
        ephemeral: true
      });
    }

    const targetUser = interaction.options.getUser('cible');
    const delayMs    = Number(interaction.options.getString('duree'));
    const text       = interaction.options.getString('message');

    // confirmation immédiate
    const humanLabel = {
      900000:  '15 minutes',
      1800000: '30 minutes',
      3600000: '1 heure',
      7200000: '2 heures'
    }[delayMs] || `${delayMs/60000} minutes`;

    await interaction.reply({
      content: `✅ Rappel planifié dans **${humanLabel}** pour ${targetUser}.`,
      ephemeral: true
    });

    // programme le rappel
    setTimeout(async () => {
      try {
        // récupère le salon d'origine
        const channel = await interaction.client.channels.fetch(interaction.channelId);
        // ping 3 fois le joueur + message
        await channel.send(`${targetUser} ${targetUser} ${targetUser} — ⏰ **Rappel** : ${text}`);
      } catch (err) {
        console.error('Impossible d’envoyer le rappel :', err);
      }
    }, delayMs);
  }
};
