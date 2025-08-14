require('dotenv').config({ path: './id.env' });
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType } = require('discord.js');
const { groups } = require('../data/horsesCatalog');

module.exports = (client) => {
  client.once('ready', async () => {
    const chId = process.env.KINUMA_STABLE_CHANNEL;
    if (!chId) return console.error('KINUMA_STABLE_CHANNEL non défini');
    const ch = await client.channels.fetch(chId).catch(() => null);
    if (!ch || ch.type !== ChannelType.GuildText) return console.error('Salon Kinuma introuvable');

    // éviter doublon
    const msgs = await ch.messages.fetch({ limit: 30 }).catch(() => null);
    if (msgs?.some(m => m.embeds[0]?.title === 'Catalogue — Kinuma Stable')) return;

    // Texte catalogue avec prix
    const lines = [];
    groups.forEach((g, gi) => {
      lines.push(`${gi ? '\n' : ''}${g.title}`);
      for (const [name, price] of g.items) lines.push(`${name} — ${price} $`);
      if (gi < groups.length - 1) lines.push('\n⸻');
    });

    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle('Catalogue — Kinuma Stable')
      .setDescription(lines.join('\n'));

    // Menus (Discord limite 25 options par menu)
    const allOptions = [];
    groups.forEach(g => g.items.forEach(([name]) => allOptions.push({ label: name, value: name })));

    const rows = [];
    for (let i = 0; i < allOptions.length; i += 25) {
      const chunk = allOptions.slice(i, i + 25);
      rows.push(
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('horse_order_select')
            .setPlaceholder(i === 0 ? 'Commander un cheval…' : `Suite (${i/25 + 1})`)
            .addOptions(chunk)
        )
      );
      if (rows.length === 5) break; // 5 menus max par message
    }

    await ch.send({ embeds: [embed], components: rows });
  });
};
