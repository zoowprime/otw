// src/commands/import_arme.js
const {
  SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder, ComponentType, MessageFlags
} = require('discord.js');
const { WEAPONS } = require('../data/catalogWeapons');
const {
  getShopIdFromMember, getOwnerId, getOwnerEnvVarName,
  debitOwnerEnterprise, incrementStock
} = require('../data/shopsData');

const IMPORT_CHANNEL_ID = process.env.ARME_IMPORT_CHANNEL;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('arme')
    .setDescription('Gestion des imports d’armes')
    .addSubcommand(sc => sc
      .setName('import')
      .setDescription('Importer une arme (armureries uniquement)')),
  async execute(interaction){
    if (interaction.options.getSubcommand() !== 'import') return;

    // 🔒 ne considère que les rôles d’ARMURERIE
    const shopId = getShopIdFromMember(interaction.member, 'armurerie');
    if (!shopId) {
      return interaction.reply({
        content: '❌ Cette commande est réservée aux **armureries**.',
        ephemeral: true
      });
    }

    // ✅ Vérif qu’un patron est bien configuré pour cette boutique
    const ownerId = getOwnerId(shopId);
    if (!ownerId) {
      const varName = getOwnerEnvVarName(shopId);
      const eb = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('⛔ Aucun patron défini')
        .setDescription(
          `Boutique: **${shopId}**\n\n` +
          `➡️ Renseigne la variable **${varName}** dans ton \`.env\` ` +
          `(ou via les Env Vars Render) puis redémarre le bot.`
        )
        .setFooter({ text: 'OTW Économie' });
      return interaction.reply({ embeds: [eb], flags: MessageFlags.Ephemeral });
    }

    // 1) Menu armes
    const menu = new StringSelectMenuBuilder()
      .setCustomId('weapon_select')
      .setPlaceholder('🔫 Choisis une arme à importer')
      .addOptions(WEAPONS.slice(0, 25).map(w => ({
        label: w.name,
        value: JSON.stringify({ name: w.name, price: w.importPrice }),
        description: `$${w.importPrice}`, emoji: '🔫'
      })));

    const row = new ActionRowBuilder().addComponents(menu);
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('📥 Import — Armurerie')
      .setDescription('Sélectionne une **arme**. Le prix sera débité du **compte entreprise** du patron.')
      .setFooter({ text: 'OTW Économie' });

    await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });

    const msg = await interaction.fetchReply();
    const sel = await msg.awaitMessageComponent({
      componentType: ComponentType.StringSelect, time: 60_000
    }).catch(() => null);
    if (!sel) return;

    const { name, price } = JSON.parse(sel.values[0]);

    // 2) Paiement entreprise (patron)
    const pay = debitOwnerEnterprise(shopId, price);
    if (!pay.ok) {
      return sel.update({
        embeds: [ new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('⛔ Paiement refusé')
          .setDescription(`Raison: ${pay.reason || 'inconnue'}\nMontant requis: **$${price}**`)
          .setFooter({ text: 'OTW Économie' })
        ],
        components: []
      });
    }

    // 3) Ajout au stock
    incrementStock(shopId, 'armes', name, 1);

    await sel.update({
      embeds: [ new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Import confirmé')
        .setDescription(`**${name}** importée pour **$${price}**.\nAjoutée au stock **${shopId}** (armes).`)
        .setFooter({ text: 'OTW Économie' })
      ],
      components: []
    });

    // 4) Journal d’import dans le salon dédié
    if (IMPORT_CHANNEL_ID) {
      interaction.client.channels.fetch(IMPORT_CHANNEL_ID).then(ch => {
        ch?.send({ embeds: [ new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('📥 Import Arme')
          .setDescription(`**${interaction.member}** a importé **${name}** pour **$${price}**\nBoutique: **${shopId}**`)
          .setTimestamp()
          .setFooter({ text: 'OTW Économie' })
        ]}).catch(()=>{});
      }).catch(()=>{});
    }
  }
};
