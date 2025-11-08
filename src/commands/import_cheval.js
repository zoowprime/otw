// src/commands/import_cheval.js
const {
  SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder, ComponentType, MessageFlags
} = require('discord.js');
const { HORSE_GROUPS } = require('../data/catalogHorses');
const {
  getShopIdFromMember, getOwnerId, getOwnerEnvVarName,
  debitOwnerEnterprise, incrementStock
} = require('../data/shopsData');

const IMPORT_CHANNEL_ID = process.env.CHEVAL_IMPORT_CHANNEL;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cheval')
    .setDescription('Gestion des imports de chevaux')
    .addSubcommand(sc => sc
      .setName('import')
      .setDescription('Importer un cheval (écuries uniquement)')),
  async execute(interaction){
    if (interaction.options.getSubcommand() !== 'import') return;

    // 🔒 ne considère que les rôles d’ÉCURIE
    const shopId = getShopIdFromMember(interaction.member, 'ecurie');
    if (!shopId) {
      return interaction.reply({
        content: '❌ Cette commande est réservée aux **écuries**.',
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

    // 1) Sélecteur de groupe
    const groupMenu = new StringSelectMenuBuilder()
      .setCustomId('horse_group')
      .setPlaceholder('🐎 Choisis une catégorie de chevaux')
      .addOptions(HORSE_GROUPS.map(g => ({
        label: g.title.replace('🐎 ','').replace('🚚 ',''),
        description: `${g.items.length} options`,
        value: g.title,
        emoji: g.title.startsWith('🚚') ? '🚚' : '🐎'
      })));

    const row1 = new ActionRowBuilder().addComponents(groupMenu);
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('📥 Import — Écurie')
      .setDescription('Sélectionne une **catégorie** pour voir les chevaux disponibles à l’import.')
      .setFooter({ text: 'OTW Économie' });

    await interaction.reply({ embeds: [embed], components: [row1], flags: MessageFlags.Ephemeral });

    // 2) Sélection du groupe
    const msg = await interaction.fetchReply();
    const sel1 = await msg.awaitMessageComponent({
      componentType: ComponentType.StringSelect, time: 60_000
    }).catch(() => null);
    if (!sel1) return;

    const groupTitle = sel1.values[0];
    const group = HORSE_GROUPS.find(g => g.title === groupTitle);
    if (!group) return sel1.update({ content: 'Catégorie invalide.', components: [], embeds: [] });

    // 3) Menu des chevaux de ce groupe
    const itemsMenu = new StringSelectMenuBuilder()
      .setCustomId('horse_item')
      .setPlaceholder(`${group.title} — Choisis un cheval à importer`)
      .addOptions(group.items.map(([name, price]) => ({
        label: name,
        value: JSON.stringify({ name, price }),
        description: `$${price}`,
        emoji: group.title.startsWith('🚚') ? '🚚':'🐎'
      })));

    const row2 = new ActionRowBuilder().addComponents(itemsMenu);
    await sel1.update({
      embeds: [ new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(group.title)
        .setDescription('Sélectionne un **cheval** à importer.\nLe coût sera débité du **compte entreprise** de la boutique.')
        .setFooter({ text: 'OTW Économie' })
      ],
      components: [row2]
    });

    const sel2 = await msg.awaitMessageComponent({
      componentType: ComponentType.StringSelect, time: 60_000
    }).catch(() => null);
    if (!sel2) return;

    const { name, price } = JSON.parse(sel2.values[0]);

    // 4) Paiement
    const pay = debitOwnerEnterprise(shopId, price);
    if (!pay.ok) {
      return sel2.update({
        embeds: [ new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('⛔ Paiement refusé')
          .setDescription(`Raison: ${pay.reason || 'inconnue'}\nMontant requis: **$${price}**`)
          .setFooter({ text: 'OTW Économie' })
        ],
        components: []
      });
    }

    // 5) Ajout au stock
    const cat = group.title.startsWith('🚚') ? 'charrettes' : 'chevaux';
    incrementStock(shopId, cat, name, 1);

    await sel2.update({
      embeds: [ new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Import confirmé')
        .setDescription(`**${name}** importé pour **$${price}**.\nAjouté au stock **${shopId}** (${cat}).`)
        .setFooter({ text: 'OTW Économie' })
      ],
      components: []
    });

    // 6) Journal d’import
    if (IMPORT_CHANNEL_ID) {
      interaction.client.channels.fetch(IMPORT_CHANNEL_ID).then(ch => {
        ch?.send({ embeds: [ new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('📥 Import Cheval')
          .setDescription(`**${interaction.member}** a importé **${name}** pour **$${price}**\nBoutique: **${shopId}**`)
          .setTimestamp()
          .setFooter({ text: 'OTW Économie' })
        ]}).catch(()=>{});
      }).catch(()=>{});
    }
  }
};
