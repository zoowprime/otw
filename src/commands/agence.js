// src/commands/agence.js

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
  MessageFlags,
} = require('discord.js');

const {
  PROPERTY_CATEGORIES,
  STATE_PROPERTIES_CATALOG,
  createAgency,
  getAgencyByOwner,
  getAgencyForUser,
  listAgencyProperties,
  addAgent,
  removeAgent,
  listStatePropertiesByCategory,
  assignPropertyToAgency,
  summarizeAgencyCatalog,
} = require('../data/realEstateData');

const { getOrCreateAccount, updateAccount } = require('../economyData');

const STAFF_ROLE_ID       = process.env.STAFF_ROLE_ID;
const GOVERNMENT_USER_ID  = process.env.GOUVERNEMENT_USER_ID;

// ─────────────────────────────────────────────
// Helpers

const fmtMoney = (n) =>
  `${(Number(n) || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} $`;

function hasStaff(interaction) {
  return interaction.member.roles.cache.has(STAFF_ROLE_ID);
}

function buildAgencyEmbed(agency, patronUser, bankBalance, catalogSummary) {
  const { vente, location, vendus, loues, total } = catalogSummary;
  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`🏠 Agence : ${agency.name}`)
    .setDescription('Gestion de l’agence immobilière.')
    .addFields(
      { name: 'Type', value: '🏢 Agence Immobilière', inline: true },
      { name: 'Patron', value: patronUser ? `${patronUser}` : `<@${agency.ownerId}>`, inline: true },
      { name: 'Solde (banque agence)', value: bankBalance != null ? fmtMoney(bankBalance) : 'N/A', inline: true },
      { name: 'Catalogue', value:
        `🟢 En vente : **${vente}**\n` +
        `🟡 En location : **${location}**\n` +
        `⚪ Total catalogue : **${total}**\n` +
        `✅ Vendus : **${vendus}**\n` +
        `📑 Loués : **${loues}**`,
        inline: false
      },
      {
        name: 'Agents',
        value: agency.agents.length
          ? agency.agents.map(id => `<@${id}>`).join('\n')
          : '*Aucun agent pour le moment…*',
        inline: false,
      },
      { name: 'ID interne', value: `\`${agency.id}\``, inline: false },
    )
    .setFooter({ text: 'OTW • Agences immobilières' });
}

function propertyToLine(p) {
  let emoji = '🏠';
  if (p.category === PROPERTY_CATEGORIES.TERRAIN) emoji = '🌾';
  else if (p.category === PROPERTY_CATEGORIES.LOCAL) emoji = '🏚';
  else if (p.category === PROPERTY_CATEGORIES.IMMEUBLE) emoji = '🏢';

  const statusEmoji =
    p.status === 'en_vente'      ? '🟢'
  : p.status === 'en_location'   ? '🟡'
  : p.status === 'vendu'         ? '✅'
  : p.status === 'loue'          ? '📑'
  : p.status === 'agence_catalogue' ? '⚪'
  : '⚫';

  const price =
    p.currentPriceSale != null ? `${fmtMoney(p.currentPriceSale)} (vente)` :
    p.currentPriceRent != null ? `${fmtMoney(p.currentPriceRent)} (loyer)` :
    `${fmtMoney(p.basePrice)} (prix d’achat)`;

  return `${emoji} **${p.name}** — ${statusEmoji} \`${p.status}\` — ${price}`;
}

function buildCatalogueEmbed(agency, patronUser, props, bankBalance) {
  const desc = props.length
    ? props.map(propertyToLine).slice(0, 25).join('\n')
    : '*Aucun bien dans le catalogue pour le moment.*';

  return new EmbedBuilder()
    .setColor(0x1abc9c)
    .setTitle(`📚 Catalogue de l’agence : ${agency.name}`)
    .setDescription(desc)
    .addFields(
      { name: 'Patron', value: patronUser ? `${patronUser}` : `<@${agency.ownerId}>`, inline: true },
      { name: 'Solde banque agence', value: fmtMoney(bankBalance || 0), inline: true },
      { name: 'Nombre total de biens', value: `${props.length}`, inline: true },
    )
    .setFooter({ text: 'OTW • Catalogue immobilier' });
}

// ─────────────────────────────────────────────
// Select menus pour /agence ajouterbien

function buildCategorySelectRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('agence_add_cat')
      .setPlaceholder('Choisissez une catégorie de propriétés…')
      .addOptions(
        { label: 'Maisons', value: 'MAISON', emoji: '🏠', description: 'Maisons individuelles, cabanes, manoirs…' },
        { label: 'Terrains', value: 'TERRAIN', emoji: '🌾', description: 'Fermes, ranchs, grandes propriétés.' },
        { label: 'Locaux commerciaux', value: 'LOCAL', emoji: '🏚', description: 'Saloon, boutiques, banques…' },
        { label: 'Immeubles', value: 'IMMEUBLE', emoji: '🏢', description: 'Mines, usines, docks, gros sites.' },
      )
  );
}

function buildPropertySelectRow(category, availableProps) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('agence_add_prop')
      .setPlaceholder('Choisissez un bien à acheter pour votre agence…')
      .addOptions(
        availableProps.slice(0, 25).map(p => ({
          label: p.name.length > 95 ? p.name.slice(0, 92) + '…' : p.name,
          value: p.id,
          description: fmtMoney(p.basePrice),
          emoji:
            category === PROPERTY_CATEGORIES.MAISON   ? '🏠' :
            category === PROPERTY_CATEGORIES.TERRAIN  ? '🌾' :
            category === PROPERTY_CATEGORIES.LOCAL    ? '🏚' :
                                                       '🏢',
        }))
      )
  );
}

// ─────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('agence')
    .setDescription('Gestion des agences immobilières.')

    // 1) créer
    .addSubcommand(sc =>
      sc
        .setName('creer')
        .setDescription('Créer une agence immobilière (STAFF uniquement).')
        .addUserOption(o =>
          o.setName('patron').setDescription('Propriétaire / patron de l’agence').setRequired(true)
        )
        .addStringOption(o =>
          o.setName('nom').setDescription("Nom de l’agence").setRequired(true)
        )
    )

    // 2) recruter
    .addSubcommand(sc =>
      sc
        .setName('recruter')
        .setDescription("Recruter un agent pour ton agence.")
        .addUserOption(o =>
          o.setName('cible').setDescription('Joueur à recruter').setRequired(true)
        )
    )

    // 3) virer
    .addSubcommand(sc =>
      sc
        .setName('virer')
        .setDescription("Retirer un agent de ton agence.")
        .addUserOption(o =>
          o.setName('cible').setDescription('Joueur à retirer').setRequired(true)
        )
    )

    // 4) catalogue
    .addSubcommand(sc =>
      sc
        .setName('catalogue')
        .setDescription("Voir le catalogue de biens de ton agence.")
    )

    // 5) voir
    .addSubcommand(sc =>
      sc
        .setName('voir')
        .setDescription("Voir la fiche détaillée de ton agence.")
    )

    // 6) ajouterbien
    .addSubcommand(sc =>
      sc
        .setName('ajouterbien')
        .setDescription("Acheter un bien de l'État pour l’ajouter au catalogue de ton agence.")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // 1) /agence creer
    if (sub === 'creer') {
      if (!hasStaff(interaction)) {
        return interaction.reply({
          content: '⛔ Cette commande est réservée au STAFF.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const patron = interaction.options.getUser('patron');
      const nom    = interaction.options.getString('nom').trim();

      const res = createAgency({ name: nom, ownerId: patron.id });
      if (!res.ok && res.reason === 'OWNER_ALREADY_HAS_AGENCY') {
        return interaction.reply({
          content: `⚠ <@${patron.id}> possède déjà une agence : **${res.agency.name}**.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const agency = res.agency;
      const accPatron = getOrCreateAccount(patron.id);
      const bankBalance = accPatron.entreprise?.banque || 0;

      const emb = buildAgencyEmbed(
        agency,
        patron,
        bankBalance,
        summarizeAgencyCatalog(agency.id),
      );

      return interaction.reply({
        content: `✅ Agence **${nom}** créée pour ${patron}.`,
        embeds: [emb],
      });
    }

    // récupérer l'agence de l'utilisateur pour les autres commandes
    const userId = interaction.user.id;
    const agency = getAgencyForUser(userId);

    if (!agency && sub !== 'creer') {
      return interaction.reply({
        content: '❌ Tu n’appartiens à aucune agence immobilière.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // helper pour solde agence = compte entreprise banque du patron
    const patronAcc = agency ? getOrCreateAccount(agency.ownerId) : null;
    const agenceSoldeBanque = patronAcc ? (patronAcc.entreprise?.banque || 0) : 0;

    // 2) /agence recruter
    if (sub === 'recruter') {
      if (agency.ownerId !== userId) {
        return interaction.reply({
          content: '⛔ Seul le patron de l’agence peut recruter des agents.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const cible = interaction.options.getUser('cible');
      const res   = addAgent(agency.id, cible.id, 3);

      if (!res.ok) {
        let msg = '❌ Impossible de recruter ce joueur.';
        if (res.reason === 'IS_OWNER') msg = '⚠ Ce joueur est déjà patron de l’agence.';
        else if (res.reason === 'ALREADY_AGENT') msg = '⚠ Ce joueur est déjà agent de ton agence.';
        else if (res.reason === 'MAX_AGENTS') msg = '⚠ Limite d’agents atteinte pour cette agence.';
        return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
      }

      const count = res.agency.agents.length + 1; // +1 patron
      return interaction.reply({
        content: `✅ ${cible} rejoint l’équipe de l’agence **${agency.name}** (${count}/4).`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 3) /agence virer
    if (sub === 'virer') {
      if (agency.ownerId !== userId) {
        return interaction.reply({
          content: '⛔ Seul le patron de l’agence peut retirer des agents.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const cible = interaction.options.getUser('cible');
      if (!agency.agents.includes(cible.id)) {
        return interaction.reply({
          content: '⚠ Ce joueur n’est pas agent de ton agence.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const confirmEmbed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle('❓ Confirmation')
        .setDescription(`Voulez-vous vraiment retirer ${cible} de l’agence **${agency.name}** ?`);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('agence_fire_confirm')
          .setLabel('Confirmer')
          .setEmoji('🟩')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('agence_fire_cancel')
          .setLabel('Annuler')
          .setEmoji('🟥')
          .setStyle(ButtonStyle.Danger),
      );

      const msg = await interaction.reply({
        embeds: [confirmEmbed],
        components: [row],
        flags: MessageFlags.Ephemeral,
        fetchReply: true,
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30_000,
        filter: (i) => i.user.id === userId,
      });

      collector.on('collect', async (btn) => {
        if (btn.customId === 'agence_fire_cancel') {
          collector.stop('cancel');
          return btn.update({
            embeds: [confirmEmbed.setDescription('❌ Opération annulée.')],
            components: [],
          });
        }

        if (btn.customId === 'agence_fire_confirm') {
          const res = removeAgent(agency.id, cible.id);
          collector.stop('done');
          if (!res.ok) {
            return btn.update({
              embeds: [confirmEmbed.setDescription('❌ Impossible de retirer cet agent (peut-être déjà retiré).')],
              components: [],
            });
          }
          return btn.update({
            embeds: [confirmEmbed.setDescription(`✅ ${cible} a été retiré de l’agence **${agency.name}**.`)],
            components: [],
          });
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time' && msg.editable) {
          msg.edit({
            embeds: [confirmEmbed.setDescription('⌛ Temps écoulé. Recommence la commande si besoin.')],
            components: [],
          }).catch(() => {});
        }
      });

      return;
    }

    // 4) /agence catalogue
    if (sub === 'catalogue') {
      const props = listAgencyProperties(agency.id);
      const emb = buildCatalogueEmbed(
        agency,
        interaction.guild?.members.cache.get(agency.ownerId)?.user || null,
        props,
        agenceSoldeBanque,
      );

      return interaction.reply({ embeds: [emb] });
    }

    // 5) /agence voir
    if (sub === 'voir') {
      const patronUser = interaction.guild?.members.cache.get(agency.ownerId)?.user || null;
      const emb = buildAgencyEmbed(
        agency,
        patronUser,
        agenceSoldeBanque,
        summarizeAgencyCatalog(agency.id),
      );
      return interaction.reply({ embeds: [emb] });
    }

    // 6) /agence ajouterbien
    if (sub === 'ajouterbien') {
      // Seuls patron & agents de CETTE agence
      if (!(agency.ownerId === userId || agency.agents.includes(userId))) {
        return interaction.reply({
          content: '⛔ Tu dois être patron ou agent de cette agence pour acheter des biens.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const initialEmbed = new EmbedBuilder()
        .setColor(0x2980b9)
        .setTitle(`🏠 ${agency.name} — Ajouter un bien`)
        .setDescription(
          'Sélectionne la **catégorie** de propriété que tu veux acheter pour ton agence.\n' +
          'Les biens déjà achetés par d’autres agences ne sont pas affichés.'
        )
        .setFooter({ text: 'OTW • Catalogue de l’État' });

      const msg = await interaction.reply({
        embeds: [initialEmbed],
        components: [buildCategorySelectRow()],
        flags: MessageFlags.Ephemeral,
        fetchReply: true,
      });

      let chosenCategory = null;

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 120_000,
        filter: (i) => i.user.id === userId,
      });

      collector.on('collect', async (sel) => {
        try {
          if (sel.customId === 'agence_add_cat') {
            chosenCategory = PROPERTY_CATEGORIES[sel.values[0]];
            const available = listStatePropertiesByCategory(chosenCategory);

            if (!available.length) {
              return sel.update({
                embeds: [
                  initialEmbed.setDescription(
                    `⚠ Aucun bien disponible actuellement dans la catégorie **${chosenCategory}**.`
                  ),
                ],
                components: [buildCategorySelectRow()],
              });
            }

            const emb = new EmbedBuilder()
              .setColor(0x2980b9)
              .setTitle(`🏠 ${agency.name} — Ajouter un bien`)
              .setDescription(
                `Catégorie choisie : **${chosenCategory}**.\n` +
                'Sélectionne maintenant un **bien précis** à acheter pour ton agence.'
              );

            return sel.update({
              embeds: [emb],
              components: [buildPropertySelectRow(chosenCategory, available)],
            });
          }

          if (sel.customId === 'agence_add_prop') {
            const propId = sel.values[0];
            const allPropsThisCat = listStatePropertiesByCategory(chosenCategory);
            const prop = allPropsThisCat.find(p => p.id === propId);

            if (!prop) {
              return sel.update({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('❌ Bien introuvable')
                    .setDescription(
                      'Ce bien ne semble plus disponible (probablement acheté par une autre agence).'
                    ),
                ],
                components: [],
              });
            }

            // Vérifier les fonds (compte entreprise banque du patron)
            const patronAcc2 = getOrCreateAccount(agency.ownerId);
            const soldeBanque = patronAcc2.entreprise?.banque || 0;

            if (soldeBanque < prop.basePrice) {
              return sel.update({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0xe67e22)
                    .setTitle('⚠ Fonds insuffisants')
                    .setDescription(
                      `Ton agence n’a pas assez de fonds en **banque entreprise** pour acheter **${prop.name}**.\n` +
                      `Prix : ${fmtMoney(prop.basePrice)}\n` +
                      `Solde actuel : ${fmtMoney(soldeBanque)}`
                    ),
                ],
                components: [],
              });
            }

            // Débiter agence (banque entreprise du patron)
            patronAcc2.entreprise = patronAcc2.entreprise || { liquide: 0, banque: 0 };
            patronAcc2.entreprise.banque -= prop.basePrice;
            updateAccount(agency.ownerId, patronAcc2);

            // Créditer le GOUVERNEMENT
            if (GOVERNMENT_USER_ID) {
              const govAcc = getOrCreateAccount(GOVERNMENT_USER_ID);
              govAcc.entreprise = govAcc.entreprise || { liquide: 0, banque: 0 };
              govAcc.entreprise.banque = (govAcc.entreprise.banque || 0) + prop.basePrice;
              updateAccount(GOVERNMENT_USER_ID, govAcc);
            }

            // Assigner la propriété à l’agence
            const assignRes = assignPropertyToAgency(prop.id, agency.id);
            if (!assignRes.ok) {
              return sel.update({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('❌ Erreur lors de l’achat')
                    .setDescription('Le bien semble déjà possédé par une autre agence.'),
                ],
                components: [],
              });
            }

            const newSolde = patronAcc2.entreprise.banque || 0;

            const confirmEmbed = new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle('✅ Bien ajouté au catalogue')
              .setDescription(
                `Ton agence **${agency.name}** a acheté :\n\n` +
                `🏷 **${prop.name}**\n` +
                `📂 Catégorie : **${prop.category}**\n` +
                `💰 Prix d’achat : ${fmtMoney(prop.basePrice)}\n\n` +
                `Le **Gouvernement** a été crédité de cette somme.\n` +
                `Nouveau solde de ton compte entreprise (banque) : **${fmtMoney(newSolde)}**.`
              );

            collector.stop('done');

            return sel.update({
              embeds: [confirmEmbed],
              components: [],
            });
          }
        } catch (err) {
          console.error('Erreur /agence ajouterbien:', err);
          if (!sel.replied && !sel.deferred) {
            await sel.reply({
              content: '❌ Une erreur est survenue pendant le processus.',
              flags: MessageFlags.Ephemeral,
            });
          }
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time' && msg.editable) {
          msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('⌛ Temps écoulé')
                .setDescription('La sélection a expiré. Relance `/agence ajouterbien` si besoin.')
            ],
            components: [],
          }).catch(() => {});
        }
      });

      return;
    }
  },
};
