// src/utils/commerceLogger.js
const { EmbedBuilder } = require('discord.js');
const LOG_CHANNEL_ID = process.env.COMMANDE_CHANNEL;

async function logTransaction(client, type, seller, buyer, item, price, shopId) {
  const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const color =
    type === 'VENTE' ? 0x2ecc71 :
    type === 'IMPORT' ? 0x3498db :
    0xf1c40f;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(type === 'VENTE' ? '💰 Nouvelle Vente' : '📦 Import effectué')
    .addFields(
      { name: '🧍‍♂️ Vendeur', value: seller, inline: true },
      { name: '🤝 Acheteur', value: buyer, inline: true },
      { name: '🎯 Objet', value: item, inline: false },
      { name: '💵 Prix', value: `$${price}`, inline: true },
      { name: '🏪 Commerce', value: shopId, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'OTW Économie' });

  channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { logTransaction };
