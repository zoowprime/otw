// src/commands/import_arme.js
const {
  SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder, ComponentType, MessageFlags
} = require('discord.js');
const { WEAPONS } = require('../data/catalogWeapons');
const {
  getShopIdFromMember, debitOwnerEnterprise, incrementStock, getOwnerId
} = require('../data/shopsData');

const IMPORT_CHANNEL_ID = process.env.ARME_IMPORT_CHANNEL;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('arme')
    .setDescription('Gestion des imports d’armes')
    .addSubcommand(sc => sc
      .setName('import')
      .setDescription('Importer une arme (armureries uniquement)')
    ),
  async execute(interaction){
    if (interaction.options.getSubcommand() !== 'import') return;

    // Vérifie que l'utilisateur appartient bien à une armurerie
    const shopId = getShopIdFromMember(interaction.member);
    if (!shopId || !shopId.startsWith('armurerie_')) {
      return interaction.reply({ content: '❌ Cette commande est réservée aux **armureries**.', ephemeral: true });
    }

    // ✅ Vérification du patron (owner) défini pour cette boutique
    const ownerId = getOwnerId(shopId);
    if (!ownerId) {
      console.warn(`[import_arme] Aucun patron pour ${shopId}. Vérifie le .env (PATRON_*_USER_ID).`);
      const varName =
        shopId === 'armurerie_sd'     ? 'PATRON_ARMURERIE_SD_USER_ID' :
        shopId === 'armurerie_rhodes' ? 'PATRON_ARMURERIE_RHODES_USER_ID' :
        shopId === 'armurerie_ab'     ? 'PATRON_ARMURERIE_AB_USER_ID' :
        shopId === 'ecurie_sd'        ? 'PATRON_ECURIE_SD_USER_ID' :
        shopId === 'ecurie_rhodes'    ? 'PATRON_ECURIE_RHODES_USER_ID' :
                                        'PATRON_ECURIE_VH_USER_ID';

      return interaction.reply({
        embeds: [ new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('⛔ Aucun patron défini')
          .setDescription(
            `Boutique: **${shopId}**\n\n` +
            `➡️ Renseigne la variable **${varName}** dans ton \`.env\` (ou les Env Vars Render) ` +
            `puis redémarre le bot.`
          )
          .setFooter({ text: 'OTW Économie' })
        ],
        ephemeral: true
      });
    }

    // 1) Menu armes (on peut paginer plus tard si besoin)
    const menu = new StringSelectMenuBuilder()
      .setCustomId('weapon_select')
      .setPlaceholder('🔫 Choisis une arme à importer')
      .addOptions(WEAPONS.slice(0, 25).map(w => ({
        label: w.name,
        value: JSON.stringify({ name: w.name, price: w.importPrice }),
        description: `$${w.importPrice}`,
        emoji: '🔫'
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
      componentType: ComponentType.StringSelect,
      time: 60_000
    }).catch(() => null);
    if (!sel) return;

    const { name, price } = JSON.parse(sel.values[0] || '{}');
    if (!name || typeof price !== 'number') {
      return sel.update({
        embeds: [ new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('⛔ Sélection invalide')
          .setDescription('Réessaie avec une arme valide.')
          .setFooter({ text: 'OTW Économie' })
        ],
        components: []
      });
    }

    // 2) Paiement entreprise (patron) — via shopsData
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

    // 4) Confirmation
    await sel.update({
      embeds: [ new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Import confirmé')
        .setDescription(`**${name}** importée pour **$${price}**.\nAjoutée au stock **${shopId}** (armes).`)
        .setFooter({ text: 'OTW Économie' })
      ],
      components: []
    });

    // 5) Trace dans le salon d’import si configuré
    if (IMPORT_CHANNEL_ID) {
      interaction.client.channels.fetch(IMPORT_CHANNEL_ID).then(ch => {
        ch?.send({
          embeds: [ new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('📥 Import Arme')
            .setDescription(
              `**${interaction.member}** a importé **${name}** pour **$${price}**\n` +
              `Boutique: **${shopId}**\n` +
              `Patron: <@${ownerId}>`
            )
            .setTimestamp()
            .setFooter({ text: 'OTW Économie' })
          ]
        }).catch(()=>{});
      }).catch(()=>{});
    }
  }
};
