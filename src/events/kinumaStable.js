// src/events/kinumaStable.js
require('dotenv').config({ path: './id.env' });
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  MessageFlags,
} = require('discord.js');

// Catalogue complet avec prix, groupé par catégories (une catégorie = un message de menu)
const CATALOG = [
  {
    title: '🐎 American Paint',
    items: [
      ['Tobiano', 45],
      ['Overo', 45],
      ['Balzane', 50],
      ['Overo Gris', 60],
    ],
  },
  {
    title: '🐎 Appaloosa',
    items: [
      ['Capé Léopard', 45],
      ['Capée', 45],
      ['Léopard', 60],
      ['Léopard Brun', 60],
    ],
  },
  {
    title: '🐎 Hollandais à Sang Chaud',
    items: [
      ['Isabelle Sooty', 90],
      ['Noir Pangaré', 90],
      ['Rouan Chocolat', 100],
    ],
  },
  {
    title: '🐎 Chevaux de Guerre — Ardennais',
    items: [
      ['Bai Rouanné', 65],
      ['Rouan Fraise', 65],
    ],
  },
  {
    title: '🐎 Chevaux de Guerre — Andalou',
    items: [
      ['Bai Brun', 70],
      ['Alezan Grisonnant', 70],
      ['Perlino', 70],
    ],
  },
  {
    title: '🐎 Demi-Sang Hongrois',
    items: [
      ['Alezan Crins Lavés', 60],
      ['Pie Tobiano', 60],
    ],
  },
  {
    title: '🐎 Mustang',
    items: [
      ['Bai Sauvage', 25],
      ['Grullo', 25],
      ['Bai Tigré', 30],
      ['Isabelle', 105],
      ['Tovero Alezan', 105],
      ['Overo Alezan Dun', 110],
      ['Overo Noir', 115],
    ],
  },
  {
    title: '🐎 Chevaux Polyvalents',
    items: [
      ['Pinto Pommelé Silver', 225],
      ['Champagne Ambre', 225],
      ['Tovero Noir', 300],
      ['Gris Pommelé', 350],
      ['Isabelle Isabelle Bringé', 350],
      ['Noir Rouanné', 350],
    ],
  },
  {
    title: '🐎 Breton',
    items: [
      ['Oseille', 35],
      ['Rubican', 35],
      ['Grullo', 105],
      ['Pangaré', 105],
      ['Bai Pommelé Pangaré', 350],
      ['Gris Fer', 350],
    ],
  },
  {
    title: '🐎 Turkoman',
    items: [
      ['Bai Brun', 300],
      ['Argenté', 350],
      ['Doré', 350],
      ['Alzane', 400],
      ['Gris', 400],
      ['Noir', 430],
      ['Perlino', 400],
    ],
  },
  {
    title: '🐎 Criollo',
    items: [
      ['Dun', 25],
      ['Noir Rouanné', 25],
      ['Bai Bringé', 105],
      ['Overo Oseille', 105],
      ['Frame Overo', 350],
      ['Sabino Marmoré', 350],
    ],
  },
  {
    title: '🐎 Cob Gypsy Pie',
    items: [
      ['Cheval du Kentucky', 40],
      ['Cheval Morgan', 40],
      ['Cheval Tennessee Walker', 30],
    ],
  },
  {
    title: '🐎 Chevaux de Trait',
    items: [
      ['Cheval Belge', 70],
      ['Cheval Shire', 70],
      ['Cheval Suffolk Punch', 65],
      ['Pie', 30],
      ['Blagdon Blanc', 30],
      ['Skewbald', 105],
      ['Blagdon Palomino', 105],
      ['Bai Balzan', 350],
      ['Pie Balzan', 350],
    ],
  },
  {
    title: '🐎 Chevaux de Course',
    items: [
      ['Noir Rouanné', 100],
      ['Rouan Blanc', 100],
      ['Rouan Pommelé Inversé', 100],
    ],
  },
  {
    title: '🐎 Pur-Sang',
    items: [
      ['Bai Acajou', 135],
      ['Bringée', 135],
      ['Gris Pommelé', 135],
    ],
  },
  {
    title: '🐎 Trotteur Américain',
    items: [
      ['Isabelle', 135],
      ['Noir', 135],
      ['Palomino Pommelé', 135],
      ['Isabelle Queue Argentée', 135],
      ['Gris Pommelé Foncé', 85],
    ],
  },
  {
    title: '🐎 Pur-Sang Arabe',
    items: [
      ['Noir', 480],
      ['Blanc', 450],
      ['Rouge', 400],
    ],
  },
  {
    title: '🚚 Charette',
    items: [
      ['Chasseur de prime', 480],
      ['Charette de commerce', 270],
    ],
  },
];

module.exports = (client) => {
  client.once('ready', async () => {
    const catChannelId = process.env.KINUMA_STABLE_CHANNEL;
    const orderLogChannelId = process.env.COMMANDER_CHEVAL_CHANNEL;

    if (!catChannelId) return console.error('KINUMA_STABLE_CHANNEL non défini.');
    const ch = await client.channels.fetch(catChannelId).catch(() => null);
    if (!ch || ch.type !== ChannelType.GuildText) return console.error('Salon Kinuma Stable introuvable / non textuel');

    // éviter les doublons : si l’embed principal existe déjà dans les ~30 derniers messages, on ne renvoie rien
    const msgs = await ch.messages.fetch({ limit: 30 }).catch(() => null);
    if (msgs?.some(m => m.embeds[0]?.title === 'Catalogue — Kinuma Stable')) return;

    // — Embed principal (tous les prix) —
    const lines = [];
    CATALOG.forEach((g, gi) => {
      lines.push(`${gi ? '\n' : ''}${g.title}`);
      for (const [name, price] of g.items) lines.push(`${name} — ${price} $`);
      if (gi < CATALOG.length - 1) lines.push('\n⸻');
    });

    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle('Catalogue — Kinuma Stable')
      .setDescription(lines.join('\n'));

    await ch.send({ embeds: [embed] });

    // — Un message par catégorie avec un SEUL menu (évite custom_id dupliqué) —
    for (let i = 0; i < CATALOG.length; i++) {
      const group = CATALOG[i];

      // Un menu par message, même customId 'horse_order_select' → OK car messages distincts
      const menu = new StringSelectMenuBuilder()
        .setCustomId('horse_order_select')
        .setPlaceholder(`Commander un cheval — ${group.title.replace(/^🐎\s?/, '')}`)
        .addOptions(
          group.items.map(([name, price]) => ({
            label: name,
            value: name,                 // valeur = nom (compatible avec horseStockInteraction.js)
            description: `Prix : ${price} $`,
          }))
        );

      const row = new ActionRowBuilder().addComponents(menu);
      await ch.send({ components: [row] });
    }

    // — Gestion du clic (si tu n’utilises PAS horseStockInteraction.js) —
    // Si tu as déjà un handler qui écoute customId === 'horse_order_select' pour incrémenter le stock,
    // tu peux supprimer ce bloc. Sinon, on log juste la "fabrication" dans COMMANDER_CHEVAL_CHANNEL.
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isStringSelectMenu()) return;
      if (interaction.customId !== 'horse_order_select') return;

      const chosen = interaction.values?.[0];
      if (!chosen) {
        return interaction.reply({ content: '❗ Choix invalide.', flags: MessageFlags.Ephemeral }).catch(() => {});
      }

      const logCh = orderLogChannelId ? await client.channels.fetch(orderLogChannelId).catch(() => null) : null;
      if (logCh) {
        await logCh.send(`🐎 Vous avez fabriqué **${chosen}** (par ${interaction.user}).`).catch(() => {});
      }

      // accusé de réception (si ton handler de stock chevaux existe déjà, tu peux aussi retirer cette réponse)
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: `✅ **${chosen}** enregistré.`, flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    });
  });
};
