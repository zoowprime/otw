// src/events/starterPack.js
require('dotenv').config({ path: './id.env' });
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { getOrCreateAccount, updateAccount } = require('../economyData');
const { getOrCreateInventory, updateInventory } = require('../inventoryData');

module.exports = (client) => {
  client.once('ready', async () => {
    // Récupère le salon configuré
    const ch = await client.channels.fetch(process.env.STARTER_PACK_CHANNEL);
    if (!ch || !ch.isTextBased()) return console.error('Salon Starter‑Pack non trouvé');

    // Ne renvoie pas le message s’il est déjà là
    const fetched = await ch.messages.fetch({ limit: 50 });
    if (fetched.some(m => m.embeds[0]?.title === '🎒 Starter Pack')) return;

    const embed = new EmbedBuilder()
      .setTitle('🎒 Starter Pack')
      .setDescription(
        'Bienvenue ! Cliquez sur le bouton ci‑dessous pour récupérer votre pack de bienvenue :\n' +
        '**50 $** et un **Cheval de Kentucky** ajouté à votre inventaire.'
      )
      .setColor(0xFFD700);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('starter_pack_claim')
        .setLabel('🎒 Récupérer mon starter pack')
        .setStyle(ButtonStyle.Success)
    );

    await ch.send({ embeds: [embed], components: [row] });
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== 'starter_pack_claim') return;

    const userId = interaction.user.id;

    // 1️⃣ Créditer 50$ sur le compte courant
    const acc = getOrCreateAccount(userId);
    acc.courant.liquide += 50;
    updateAccount(userId, acc);

    // 2️⃣ Ajouter le cheval à l’inventaire
    const inv = getOrCreateInventory(userId);
    inv.items = inv.items || [];
    inv.items.push({ name: 'Cheval de Kentucky', quantity: 1 });
    updateInventory(userId, inv);

    // 3️⃣ Confirmation éphemère
    await interaction.reply({
      content: '✅ Vous avez reçu **50 $** et un **Cheval de Kentucky** !',
      ephemeral: true
    });
  });
};
