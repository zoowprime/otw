// src/commands/braquage.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { getOrCreateAccount, updateAccount } = require('../economyData');

const DURATION = {
  Banque: 15,
  Maison: 10,
  Magasin: 5,
  Train: 15
};

const RANGES = {
  Banque: {
    'Saint-Denis': [2600, 3000],
    Rhodes:      [1800, 2000],
    Blackwater:  [2200, 2500],
    Valentine:   [1200, 1600]
  },
  Maison: {
    'Saint-Denis': [200, 700],
    Rhodes:      [200, 450],
    Blackwater:  [200, 500],
    Valentine:   [200, 335]
  },
  Magasin: {
    'Saint-Denis': [12, 200],
    Rhodes:      [12, 100],
    Blackwater:  [12, 150],
    Valentine:   [12, 50]
  },
  Train: {
    'Saint-Denis': [1500, 2000],
    Rhodes:      [1500, 2000],
    Blackwater:  [1500, 2000],
    Valentine:   [1500, 2000]
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('braquage')
    .setDescription('Lance un braquage RP')
    .addStringOption(o =>
      o.setName('type')
       .setDescription('Type de braquage')
       .setRequired(true)
       .addChoices(
         { name: 'Banque', value: 'Banque' },
         { name: 'Maison', value: 'Maison' },
         { name: 'Magasin', value: 'Magasin' },
         { name: 'Train',   value: 'Train' }
       )
    )
    .addStringOption(o =>
      o.setName('lieu')
       .setDescription('Lieu du braquage')
       .setRequired(true)
       .addChoices(
         { name: 'Saint‑Denis', value: 'Saint-Denis' },
         { name: 'Valentine',   value: 'Valentine' },
         { name: 'Blackwater',  value: 'Blackwater' },
         { name: 'Rhodes',      value: 'Rhodes' }
       )
    )
    .addRoleOption(o =>
      o.setName('role1')
       .setDescription('Mention 1 (ex: police)')
       .setRequired(true)
    )
    .addRoleOption(o =>
      o.setName('role2')
       .setDescription('Mention 2 (ex: milice)')
       .setRequired(true)
    )
    .addAttachmentOption(o =>
      o.setName('photo')
       .setDescription('Photo illustrant le braquage')
       .setRequired(false)
    ),

  async execute(interaction) {
    const client = interaction.client;
    const userId = interaction.user.id;

    // empêche doublon
    if (client.heistSessions.has(userId)) {
      return interaction.reply({
        content: '❌ Vous avez déjà un braquage en cours.',
        ephemeral: true
      });
    }

    const type    = interaction.options.getString('type');
    const lieu    = interaction.options.getString('lieu');
    const role1   = interaction.options.getRole('role1');
    const role2   = interaction.options.getRole('role2');
    const photo   = interaction.options.getAttachment('photo');

    // calcule durée et total aléatoire
    const minutes = DURATION[type];
    const [minSum, maxSum] = RANGES[type][lieu];
    const totalSum = Math.floor(Math.random() * (maxSum - minSum + 1)) + minSum;

    // nombre de passages toutes les 30s
    const ticks = Math.floor((minutes * 60) / 30);
    const base    = Math.floor(totalSum / ticks);
    let   rem     = totalSum - base * ticks;

    // envoie embed de démarrage
    const startEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(`Braquage – ${type} à ${lieu}`)
      .setDescription(
        `Vous commencez votre braquage de **${type}** à **${lieu}**, vous disposez de **${minutes} minutes**.\n` +
        `🔔 Attention ${role1}, ${role2} peuvent arriver à tout moment !`
      );
    if (photo) startEmbed.setImage(photo.url);

    await interaction.reply({ embeds: [startEmbed] });

    // prépare le channel de rapport
    const reportCh = await client.channels.fetch(process.env.BRAQUAGE_CHANNEL);
    if (!reportCh) return console.error('Channel de braquage introuvable');

    // lance le cycle
    let count = 0;
    const intervalId = setInterval(async () => {
      count++;
      // calcule ce tick
      let gain = base + (count === ticks ? rem : 0);
      if (count === ticks) rem = 0;

      // crédit
      const acc = getOrCreateAccount(userId);
      acc.courant.liquide += gain;
      updateAccount(userId, acc);

      // message
      const tickEmbed = new EmbedBuilder()
        .setTitle('💵 Vous avez récupéré')
        .setDescription(`**${gain}$**`)
        .setColor(0xdaa520)
        .setFooter({ text: `Braquage en cours… (${count}/${ticks})` });
      await reportCh.send({ embeds: [tickEmbed] });

      // fin
      if (count >= ticks) {
        clearInterval(intervalId);
        client.heistSessions.delete(userId);

        const endEmbed = new EmbedBuilder()
          .setTitle('🏁 Braquage terminé')
          .setDescription(`Vous avez récupéré au total **${totalSum}$**.`)
          .setColor(0x00ff00);
        return reportCh.send({ embeds: [endEmbed] });
      }
    }, 30_000);

    // pour /stopbraquage
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      client.heistSessions.delete(userId);
    }, minutes * 60 * 1000 + 5000);

    client.heistSessions.set(userId, { intervalId, timeoutId });
  }
};
