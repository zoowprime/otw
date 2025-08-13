require('dotenv').config({ path: './id.env' });
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType } = require('discord.js');
const { categories } = require('../data/weaponsCatalog');
const { _stockInternal } = require('../interaction/stockInteraction');

module.exports = (client) => {
  client.once('ready', async () => {
    const catChannelId = process.env.CATALOGUE_WEAPONS_CHANNEL;
    if (!catChannelId) return console.error('CATALOGUE_WEAPONS_CHANNEL non défini');
    const ch = await client.channels.fetch(catChannelId).catch(() => null);
    if (!ch || ch.type !== ChannelType.GuildText) return console.error('Salon catalogue introuvable');

    // éviter les doublons
    const msgs = await ch.messages.fetch({ limit: 30 }).catch(() => null);
    if (msgs?.some(m => m.embeds[0]?.title === 'Catalogue des Armes')) return;

    const lines = [];
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      lines.push(`${i ? '\n' : ''}${cat.name} :`);
      for (const item of cat.items) lines.push(`● ${item}`);
      if (i < categories.length - 1) lines.push('\n⸻');
    }

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('Catalogue des Armes')
      .setDescription(lines.join('\n'));

    const chunks = _stockInternal.chunkWeapons(); // pagination 25 options max
    const rows = chunks.map((chunk, i) =>
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('weapon_fabricate_select')
          .setPlaceholder(i === 0 ? 'Fabriquer une arme…' : `Suite (${i + 1})`)
          .addOptions(chunk)
      )
    );

    await ch.send({ embeds: [embed], components: rows.slice(0, 5) }); // 5 menus max par message
  });
};
