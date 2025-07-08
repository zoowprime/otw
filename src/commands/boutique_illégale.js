// src/commands/boutique_illégale.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boutique_illégale')
    .setDescription('🔫 Ouvre la boutique d’armes illégales (contact requis)'),
  async execute(interaction) {
    const roleContact = process.env.ILLEGAL_CONTACT_ROLE_ID;
    if (!interaction.member.roles.cache.has(roleContact)) {
      return interaction.reply({
        content: '❌ Vous n’avez pas le rôle **contact illégal**.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x8B0000)
      .setTitle('🔫 Boutique Illégale')
      .setDescription('Sélectionnez une arme dans le menu déroulant ci-dessous :')
      .addFields(
        { name: '1️⃣ Fusil Semi-Automatique',       value: '650 $', inline: true },
        { name: '2️⃣ Mauser',                      value: '750 $', inline: true },
        { name: '3️⃣ Fusil à Double Canon',        value: '750 $', inline: true },
        { name: '4️⃣ Fusil à Pompe',               value: '550 $', inline: true },
        { name: '5️⃣ Fusil à Canon Scié',           value: '550 $', inline: true },
        { name: '6️⃣ Fusil Semi-Automatique',       value: '450 $', inline: true },
        { name: '7️⃣ Fusil à Répétition',           value: '350 $', inline: true },
        { name: '8️⃣ Fusil Carcano',                value: '425 $', inline: true },
        { name: '9️⃣ Dynamites',                   value: '250 $', inline: true },
        { name: '🔟 Bouteilles Incendiaires',      value: '50 $',  inline: true },
        { name: '🔪 Tomahawk',                     value: '150 $', inline: true }
      );

    const options = [
      { label: 'Fusil Semi-Automatique (650 $)',       value: 'semi_auto_650' },
      { label: 'Mauser (750 $)',                       value: 'mauser_750' },
      { label: 'Fusil à Double Canon (750 $)',         value: 'double_canon_750' },
      { label: 'Fusil à Pompe (550 $)',                value: 'pompe_550' },
      { label: 'Fusil à Canon Scié (550 $)',            value: 'canon_scie_550' },
      { label: 'Fusil Semi-Automatique (450 $)',       value: 'semi_auto_450' },
      { label: 'Fusil à Répétition (350 $)',           value: 'repetition_350' },
      { label: 'Fusil Carcano (425 $)',                value: 'carcano_425' },
      { label: 'Dynamites (250 $)',                    value: 'dynamites_250' },
      { label: 'Bouteilles Incendiaires (50 $)',      value: 'bouteilles_incendiaires_50' },
      { label: 'Tomahawk (150 $)',                     value: 'tomahawk_150' }
    ];

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('shop_illegal_buy')
        .setPlaceholder('Choisissez une arme…')
        .addOptions(options)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
