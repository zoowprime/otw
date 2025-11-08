// src/commands/illegal_stock.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getIllegalStock } = require('../data/illegalData');

const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;
const GERANT_IDS = [
  process.env.ILLEGAL_GERANT_USER_ID_1,
  process.env.ILLEGAL_GERANT_USER_ID_2,
  process.env.ILLEGAL_GERANT_USER_ID_3,
  process.env.ILLEGAL_GERANT_USER_ID_4,
].filter(Boolean);

function renderStockSec(secObj, title, emoji){
  const entries = Object.entries(secObj || {});
  if (!entries.length) return `**${emoji} ${title}**\n_Vide_\n`;
  const lines = entries.map(([name, qty]) => `• ${name} — **x${qty}**`);
  return `**${emoji} ${title}**\n${lines.join('\n')}\n`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('illegal_stock')
    .setDescription('Voir le stock illégal (staff + gérants)'),
  async execute(interaction){
    const uid = interaction.user.id;
    const isStaff = interaction.member.roles.cache.has(STAFF_ROLE_ID);
    const isGerant = GERANT_IDS.includes(uid);
    if (!isStaff && !isGerant) return interaction.reply({ content:'⛔ Accès refusé.', ephemeral:true });

    const st = getIllegalStock();
    const desc =
      renderStockSec(st.armes, 'Armes', '🔫') +
      '\n' +
      renderStockSec(st.autres, 'Autres', '🎒');

    const emb = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle('🗂️ Stock illégal')
      .setDescription(desc)
      .setFooter({ text: 'OTW — Armes illégales' });

    return interaction.reply({ embeds:[emb], flags: MessageFlags.Ephemeral });
  }
};
