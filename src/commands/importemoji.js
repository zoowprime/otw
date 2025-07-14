// src/commands/importemoji.js
const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('importemoji')
    .setDescription('Importe un émoji dans ce serveur à partir de son ID Discord')
    .addStringOption(opt =>
      opt
        .setName('id')
        .setDescription('ID de l’émoji (sans <> et sans <:>)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('nom')
        .setDescription('Nom à donner à l’émoji (sans espaces)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const id   = interaction.options.getString('id');
    const name = interaction.options.getString('nom');

    // Tenter le GIF animé, sinon PNG
    const tryUrls = [
      `https://cdn.discordapp.com/emojis/${id}.gif`,
      `https://cdn.discordapp.com/emojis/${id}.png`
    ];

    let buffer, urlUsed;
    for (const url of tryUrls) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('non trouvé');
        buffer = await res.buffer();
        urlUsed = url;
        break;
      } catch {}
    }

    if (!buffer) {
      return interaction.reply({ content: '❌ Impossible de récupérer cet émoji (ID invalide).', ephemeral: true });
    }

    try {
      const emoji = await interaction.guild.emojis.create({
        attachment: buffer,
        name: name
      });
      return interaction.reply({ content: `✅ Émoji importé : ${emoji}`, ephemeral: false });
    } catch (err) {
      console.error('Erreur lors de la création de l’émoji:', err);
      return interaction.reply({
        content: '❌ Impossible de créer l’émoji. Vérifie que le bot a la permission Gérer les émojis et que tu as de la place.',
        ephemeral: true
      });
    }
  }
};
