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
  createAgency,
  getAgencyForUser,
  listAgencyProperties,
  addAgent,
  removeAgent,
  listStatePropertiesByCategory,
  assignPropertyToAgency,
  summarizeAgencyCatalog,
  listAgencies,
  deleteAgency,
  getPropertyById,
  setPropertySalePrice,
  setPropertyRentPrice,
  markPropertySold,
  markPropertyRented,
  expelTenant,
} = require('../data/realEstateData');

const { getOrCreateAccount, updateAccount } = require('../economyData');

const STAFF_ROLE_ID      = process.env.STAFF_ROLE_ID;
const GOVERNMENT_USER_ID = process.env.GOUVERNEMENT_USER_ID;

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
      {
        name: 'Catalogue',
        value:
          `🟢 En vente : **${vente}**\n` +
          `🟡 En location : **${location}**\n` +
          `✅ Vendus : **${vendus}**\n` +
          `📑 Loués : **${loues}**\n` +
          `📂 Total : **${total}**`,
        inline: false,
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
    p.status === 'en_vente'         ? '🟢' :
    p.status === 'en_location'      ? '🟡' :
    p.status === 'vendu'            ? '✅' :
    p.status === 'loue'             ? '📑' :
    p.status === 'agence_catalogue' ? '⚪' :
                                      '⚫';

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

// Select catégories / biens (ajouterbien)
function buildCategorySelectRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('agence_add_cat')
      .setPlaceholder('Choisissez une catégorie de propriétés…')
      .addOptions(
        { label: 'Maisons', value: 'MAISON', emoji: '🏠', description: 'Maisons, cabanes, manoirs…' },
        { label: 'Terrains', value: 'TERRAIN', emoji: '🌾', description: 'Fermes, ranchs, grandes propriétés.' },
        { label: 'Locaux commerciaux', value: 'LOCAL', emoji: '🏚', description: 'Saloons, boutiques, banques…' },
        { label: 'Immeubles', value: 'IMMEUBLE', emoji: '🏢', description: 'Mines, usines, docks, gros sites.' },
      )
  );
}

function buildPropertySelectRowForCategory(category, availableProps) {
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

// Select de biens générique (définirprix / modifierprix / vendre / louer / expulser)
function buildPropertySelectRowGeneric(customId, props, placeholder) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .addOptions(
        props.slice(0, 25).map(p => {
          let emoji = '🏠';
          if (p.category === PROPERTY_CATEGORIES.TERRAIN) emoji = '🌾';
          else if (p.category === PROPERTY_CATEGORIES.LOCAL) emoji = '🏚';
          else if (p.category === PROPERTY_CATEGORIES.IMMEUBLE) emoji = '🏢';

          const desc =
            (p.currentPriceSale != null ? `Vente: ${fmtMoney(p.currentPriceSale)}` : '') +
            (p.currentPriceRent != null
              ? (p.currentPriceSale != null ? ' • ' : '') + `Loyer: ${fmtMoney(p.currentPriceRent)}`
              : (p.currentPriceSale == null ? `Base: ${fmtMoney(p.basePrice)}` : ''));

          return {
            label: p.name.length > 95 ? p.name.slice(0, 92) + '…' : p.name,
            value: p.id,
            description: desc,
            emoji,
          };
        })
      )
  );
}

// ─────────────────────────────────────────────
// Prix: helper flow commun

async function startPriceFlow(interaction, agency, mode) {
  const userId = interaction.user.id;
  const props = listAgencyProperties(agency.id);

  if (!props.length) {
    return interaction.reply({
      content: '⚠ Ton agence ne possède encore aucun bien.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const title =
    mode === 'definir'
      ? '💰 Définir un prix'
      : '🔧 Modifier un prix';

  const emb = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`${title} — ${agency.name}`)
    .setDescription(
      'Choisis d’abord le **bien** auquel tu veux appliquer un prix.\n' +
      'Ensuite, tu choisiras si c’est un **prix de vente** ou un **loyer**.'
    )
    .setFooter({ text: 'OTW • Agence — Prix' });

  const msg = await interaction.reply({
    embeds: [emb],
    components: [buildPropertySelectRowGeneric('agence_price_prop', props, 'Choisissez un bien…')],
    flags: MessageFlags.Ephemeral,
    fetchReply: true,
  });

  let chosenPropertyId = null;
  let chosenType = null; // 'vente' ou 'loyer'

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 120_000,
    filter: i => i.user.id === userId,
  });

  collector.on('collect', async (sel) => {
    if (sel.customId === 'agence_price_prop') {
      chosenPropertyId = sel.values[0];
      const prop = getPropertyById(chosenPropertyId);
      if (!prop) {
        return sel.update({
          embeds: [
            emb.setDescription('❌ Bien introuvable. Relance la commande.'),
          ],
          components: [],
        });
      }

      const emb2 = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`${title} — ${prop.name}`)
        .setDescription(
          'Choisis le **type de prix** que tu veux définir :\n\n' +
          '🟢 Prix de vente\n' +
          '🟡 Loyer mensuel'
        );

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('agence_price_type')
          .setPlaceholder('Choisissez le type de prix…')
          .addOptions(
            { label: 'Prix de vente', value: 'vente', emoji: '🟢', description: 'Montant fixe pour une vente.' },
            { label: 'Loyer mensuel', value: 'loyer', emoji: '🟡', description: 'Montant de loyer récurrent.' },
            { label: 'Annuler', value: 'cancel', emoji: '🟥', description: 'Annule cette opération.' },
          )
      );

      return sel.update({
        embeds: [emb2],
        components: [row],
      });
    }

    if (sel.customId === 'agence_price_type') {
      const val = sel.values[0];
      if (val === 'cancel') {
        collector.stop('cancel');
        return sel.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x95a5a6)
              .setTitle('❌ Opération annulée')
              .setDescription('Aucun prix modifié.')
          ],
          components: [],
        });
      }

      chosenType = val; // vente / loyer
      const prop = getPropertyById(chosenPropertyId);
      if (!prop) {
        collector.stop('error');
        return sel.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('❌ Erreur')
              .setDescription('Le bien a disparu entre temps.'),
          ],
          components: [],
        });
      }

      let currentInfo = '';
      if (chosenType === 'vente' && prop.currentPriceSale != null) {
        currentInfo = `Prix de vente actuel : **${fmtMoney(prop.currentPriceSale)}**\n`;
      }
      if (chosenType === 'loyer' && prop.currentPriceRent != null) {
        currentInfo = `Loyer actuel : **${fmtMoney(prop.currentPriceRent)}**\n`;
      }

      const emb3 = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`${title} — ${prop.name}`)
        .setDescription(
          (currentInfo ? currentInfo + '\n' : '') +
          '✏️ Envoie maintenant un **montant** dans le chat (exemple : `1500`).\n' +
          'Le montant doit être un nombre positif.'
        );

      await sel.update({
        embeds: [emb3],
        components: [],
      });

      // Collector de message pour le montant
      const msgCollector = msg.channel.createMessageCollector({
        time: 60_000,
        max: 1,
        filter: m => m.author.id === userId,
      });

      msgCollector.on('collect', async (m) => {
        const raw = m.content.replace(',', '.').trim();
        const amount = Number(raw);
        if (!Number.isFinite(amount) || amount <= 0) {
          await msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Montant invalide')
                .setDescription('Opération annulée. Utilise un nombre positif.'),
            ],
            components: [],
          }).catch(() => {});
          return;
        }

        const p2 = getPropertyById(chosenPropertyId);
        if (!p2) {
          await msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Bien introuvable')
                .setDescription('Le bien a disparu entre temps.'),
            ],
            components: [],
          }).catch(() => {});
          return;
        }

        let res;
        if (chosenType === 'vente') {
          res = setPropertySalePrice(p2.id, amount);
        } else {
          res = setPropertyRentPrice(p2.id, amount);
        }

        if (!res.ok) {
          await msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Erreur')
                .setDescription('Impossible de définir le prix pour ce bien.'),
            ],
            components: [],
          }).catch(() => {});
          return;
        }

        const final = res.property;
        const embFinal = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('✅ Prix mis à jour')
          .setDescription(
            `Bien : **${final.name}**\n` +
            `Type : ${chosenType === 'vente' ? 'Prix de vente' : 'Loyer mensuel'}\n` +
            `Nouveau montant : **${fmtMoney(amount)}**`
          );

        await msg.edit({
          embeds: [embFinal],
          components: [],
        }).catch(() => {});

        setTimeout(() => m.delete().catch(() => {}), 2000);
      });

      msgCollector.on('end', (collected, reason) => {
        if (reason === 'time') {
          msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('⌛ Temps écoulé')
                .setDescription('Aucun montant reçu. Recommence la commande si besoin.'),
            ],
            components: [],
          }).catch(() => {});
        }
      });

      collector.stop('done');
    }
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time' && msg.editable) {
      msg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0x95a5a6)
            .setTitle('⌛ Temps écoulé')
            .setDescription('La sélection a expiré. Relance la commande si besoin.'),
        ],
        components: [],
      }).catch(() => {});
    }
  });
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
    )

    // 7) definirprix
    .addSubcommand(sc =>
      sc
        .setName('definirprix')
        .setDescription("Définir un prix de vente ou un loyer pour un bien de l’agence.")
    )

    // 8) modifierprix
    .addSubcommand(sc =>
      sc
        .setName('modifierprix')
        .setDescription("Modifier un prix de vente ou un loyer existant.")
    )

    // 9) vendre
    .addSubcommand(sc =>
      sc
        .setName('vendre')
        .setDescription("Vendre un bien en vente à un client.")
    )

    // 10) louer
    .addSubcommand(sc =>
      sc
        .setName('louer')
        .setDescription("Mettre en location un bien à un locataire.")
    )

    // 11) supprimer
    .addSubcommand(sc =>
      sc
        .setName('supprimer')
        .setDescription("Supprimer une agence (STAFF uniquement).")
    )

    // 12) expulser
    .addSubcommand(sc =>
      sc
        .setName('expulser')
        .setDescription("Expulser un locataire d’un bien loué.")
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

    // 11) /agence supprimer (STAFF, avant de chercher l'agence de l'utilisateur)
    if (sub === 'supprimer') {
      if (!hasStaff(interaction)) {
        return interaction.reply({
          content: '⛔ Cette commande est réservée au STAFF.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const agencies = listAgencies();
      if (!agencies.length) {
        return interaction.reply({
          content: '⚠ Aucune agence à supprimer.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const emb = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('🗑️ Supprimer une agence')
        .setDescription('Sélectionne l’agence à supprimer. Cette action est **définitive**.');

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('agence_delete_select')
          .setPlaceholder('Choisissez une agence à supprimer…')
          .addOptions(
            agencies.slice(0, 25).map(a => ({
              label: a.name.length > 95 ? a.name.slice(0, 92) + '…' : a.name,
              value: a.id,
              description: `Patron: ${a.ownerId}`,
              emoji: '🏢',
            }))
          )
      );

      const msg = await interaction.reply({
        embeds: [emb],
        components: [row],
        flags: MessageFlags.Ephemeral,
        fetchReply: true,
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60_000,
        filter: i => i.user.id === interaction.user.id,
      });

      collector.on('collect', async (sel) => {
        const agencyId = sel.values[0];
        const confirmEmbed = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('❓ Confirmation')
          .setDescription(
            `Voulez-vous vraiment **supprimer** l’agence \`${agencyId}\` ?\n` +
            'Cette action est définitive.'
          );

        const btnRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`agence_delete_confirm_${agencyId}`)
            .setLabel('Confirmer')
            .setEmoji('🟩')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('agence_delete_cancel')
            .setLabel('Annuler')
            .setEmoji('🟥')
            .setStyle(ButtonStyle.Danger),
        );

        await sel.update({
          embeds: [confirmEmbed],
          components: [btnRow],
        });

        const btnCollector = msg.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 30_000,
          filter: b => b.user.id === interaction.user.id,
        });

        btnCollector.on('collect', async (btn) => {
          if (btn.customId === 'agence_delete_cancel') {
            btnCollector.stop('cancel');
            collector.stop('done');
            return btn.update({
              embeds: [confirmEmbed.setDescription('❌ Suppression annulée.')],
              components: [],
            });
          }

          if (btn.customId === `agence_delete_confirm_${agencyId}`) {
            const res = deleteAgency(agencyId);
            btnCollector.stop('done');
            collector.stop('done');
            if (!res.ok) {
              return btn.update({
                embeds: [confirmEmbed.setDescription('❌ Impossible de supprimer cette agence (introuvable).')],
                components: [],
              });
            }
            return btn.update({
              embeds: [confirmEmbed.setDescription('✅ Agence supprimée avec succès.')],
              components: [],
            });
          }
        });

        btnCollector.on('end', (collected, reason) => {
          if (reason === 'time' && msg.editable) {
            msg.edit({
              embeds: [confirmEmbed.setDescription('⌛ Temps écoulé. Relance la commande si besoin.')],
              components: [],
            }).catch(() => {});
          }
        });
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time' && msg.editable) {
          msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('⌛ Temps écoulé')
                .setDescription('La sélection a expiré. Relance `/agence supprimer` si besoin.'),
            ],
            components: [],
          }).catch(() => {});
        }
      });

      return;
    }

    // Pour toutes les autres commandes, il faut l'agence de l'utilisateur
    const userId = interaction.user.id;
    const agency = getAgencyForUser(userId);

    if (!agency && sub !== 'creer' && sub !== 'supprimer') {
      return interaction.reply({
        content: '❌ Tu n’appartiens à aucune agence immobilière.',
        flags: MessageFlags.Ephemeral,
      });
    }

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
        filter: i => i.user.id === userId,
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
        filter: i => i.user.id === userId,
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
              components: [buildPropertySelectRowForCategory(chosenCategory, available)],
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

            patronAcc2.entreprise = patronAcc2.entreprise || { liquide: 0, banque: 0 };
            patronAcc2.entreprise.banque -= prop.basePrice;
            updateAccount(agency.ownerId, patronAcc2);

            if (GOVERNMENT_USER_ID) {
              const govAcc = getOrCreateAccount(GOVERNMENT_USER_ID);
              govAcc.entreprise = govAcc.entreprise || { liquide: 0, banque: 0 };
              govAcc.entreprise.banque = (govAcc.entreprise.banque || 0) + prop.basePrice;
              updateAccount(GOVERNMENT_USER_ID, govAcc);
            }

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

    // 7) /agence definirprix
    if (sub === 'definirprix') {
      if (!(agency.ownerId === userId || agency.agents.includes(userId))) {
        return interaction.reply({
          content: '⛔ Tu dois être patron ou agent pour définir un prix.',
          flags: MessageFlags.Ephemeral,
        });
      }
      return startPriceFlow(interaction, agency, 'definir');
    }

    // 8) /agence modifierprix
    if (sub === 'modifierprix') {
      if (!(agency.ownerId === userId || agency.agents.includes(userId))) {
        return interaction.reply({
          content: '⛔ Tu dois être patron ou agent pour modifier un prix.',
          flags: MessageFlags.Ephemeral,
        });
      }
      return startPriceFlow(interaction, agency, 'modifier');
    }

    // 9) /agence vendre
    if (sub === 'vendre') {
      if (!(agency.ownerId === userId || agency.agents.includes(userId))) {
        return interaction.reply({
          content: '⛔ Tu dois être patron ou agent pour vendre un bien.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const props = listAgencyProperties(agency.id).filter(
        p => p.status === 'en_vente' && p.currentPriceSale != null
      );

      if (!props.length) {
        return interaction.reply({
          content: '⚠ Aucun bien en vente actuellement dans ton agence.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const emb = new EmbedBuilder()
        .setColor(0x27ae60)
        .setTitle(`💸 Vente — ${agency.name}`)
        .setDescription(
          'Choisis le bien que tu veux vendre.\n' +
          'Ensuite, tu devras **mentionner le client** dans le salon.'
        );

      const msg = await interaction.reply({
        embeds: [emb],
        components: [buildPropertySelectRowGeneric('agence_sell_prop', props, 'Choisissez un bien à vendre…')],
        fetchReply: true,
      });

      let selectedPropId = null;

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 120_000,
        filter: i => i.user.id === userId,
      });

      collector.on('collect', async (sel) => {
        if (sel.customId !== 'agence_sell_prop') return;

        selectedPropId = sel.values[0];
        const prop = getPropertyById(selectedPropId);
        if (!prop || prop.status !== 'en_vente' || prop.currentPriceSale == null) {
          collector.stop('invalid');
          return sel.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Bien indisponible')
                .setDescription('Ce bien n’est plus en vente.'),
            ],
            components: [],
          });
        }

        const emb2 = new EmbedBuilder()
          .setColor(0x27ae60)
          .setTitle(`💸 Vente — ${prop.name}`)
          .setDescription(
            `Prix de vente : **${fmtMoney(prop.currentPriceSale)}**\n\n` +
            'Mentionne maintenant le **client acheteur** dans le salon (ex: `@Nom`).'
          );

        await sel.update({
          embeds: [emb2],
          components: [],
        });

        const msgCollector = msg.channel.createMessageCollector({
          time: 60_000,
          max: 1,
          filter: m => m.author.id === userId,
        });

        msgCollector.on('collect', async (m) => {
          const target = m.mentions.users.first();
          if (!target || target.bot) {
            await msg.edit({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xe74c3c)
                  .setTitle('❌ Mention invalide')
                  .setDescription('Mentionne un joueur valide (pas un bot).'),
              ],
              components: [],
            }).catch(() => {});
            return;
          }

          const prop2 = getPropertyById(selectedPropId);
          if (!prop2 || prop2.status !== 'en_vente' || prop2.currentPriceSale == null) {
            await msg.edit({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xe74c3c)
                  .setTitle('❌ Bien indisponible')
                  .setDescription('Ce bien n’est plus en vente.'),
              ],
              components: [],
            }).catch(() => {});
            return;
          }

          const price = prop2.currentPriceSale;
          const confirmEmbed = new EmbedBuilder()
            .setColor(0x27ae60)
            .setTitle('💸 Confirmation de vente')
            .setDescription(
              `${target}, acceptes-tu d’acheter **${prop2.name}** à l’agence **${agency.name}** pour **${fmtMoney(price)}** ?`
            );

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`agence_sell_accept_${prop2.id}_${target.id}`)
              .setLabel('Accepter')
              .setEmoji('✅')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`agence_sell_decline_${prop2.id}_${target.id}`)
              .setLabel('Refuser')
              .setEmoji('❌')
              .setStyle(ButtonStyle.Danger),
          );

          const confMsg = await msg.channel.send({
            content: `${target}`,
            embeds: [confirmEmbed],
            components: [row],
          });

          const btnCollector = confMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60_000,
            filter: i => i.user.id === target.id,
          });

          btnCollector.on('collect', async (btn) => {
            if (btn.customId.endsWith('_decline_' + target.id)) {
              btnCollector.stop('declined');
              return btn.update({
                embeds: [confirmEmbed.setDescription('❌ Le client a refusé la vente.')],
                components: [],
              });
            }

            if (btn.customId.endsWith('_accept_' + target.id)) {
              const buyerAcc = getOrCreateAccount(target.id);
              const soldeBuyer = buyerAcc.courant?.banque || 0;

              if (soldeBuyer < price) {
                btnCollector.stop('nofunds');
                return btn.update({
                  embeds: [
                    confirmEmbed.setDescription(
                      `⚠ Fonds insuffisants.\nSolde disponible sur ton compte courant (banque) : ${fmtMoney(soldeBuyer)}.`
                    ),
                  ],
                  components: [],
                });
              }

              // Débiter le client (compte courant banque)
              buyerAcc.courant = buyerAcc.courant || { liquide: 0, banque: 0 };
              buyerAcc.courant.banque -= price;
              updateAccount(target.id, buyerAcc);

              // Créditer l’agence (compte entreprise banque du patron)
              const patronAcc3 = getOrCreateAccount(agency.ownerId);
              patronAcc3.entreprise = patronAcc3.entreprise || { liquide: 0, banque: 0 };
              patronAcc3.entreprise.banque = (patronAcc3.entreprise.banque || 0) + price;
              updateAccount(agency.ownerId, patronAcc3);

              const res = markPropertySold(prop2.id, target.id, price);
              if (!res.ok) {
                btnCollector.stop('error');
                return btn.update({
                  embeds: [
                    confirmEmbed.setDescription('❌ Erreur lors du transfert de propriété.'),
                  ],
                  components: [],
                });
              }

              btnCollector.stop('done');

              await btn.update({
                embeds: [
                  confirmEmbed.setDescription(
                    `✅ Vente confirmée.\n\n` +
                    `Acheteur : ${target}\n` +
                    `Bien : **${prop2.name}**\n` +
                    `Prix : **${fmtMoney(price)}**`
                  ),
                ],
                components: [],
              });

              await msg.channel.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('✅ Vente immobilière')
                    .setDescription(
                      `👤 Agent : ${interaction.user}\n` +
                      `🏢 Agence : **${agency.name}**\n` +
                      `🧍 Client : ${target}\n` +
                      `🏠 Bien : **${prop2.name}**\n` +
                      `💰 Prix : **${fmtMoney(price)}**`
                    ),
                ],
              });

              return;
            }
          });

          btnCollector.on('end', (collected, reason) => {
            if (reason === 'time' && confMsg.editable) {
              confMsg.edit({
                embeds: [
                  confirmEmbed.setDescription('⌛ Temps écoulé. La vente a été annulée.'),
                ],
                components: [],
              }).catch(() => {});
            }
          });

          setTimeout(() => m.delete().catch(() => {}), 2000);
        });

        msgCollector.on('end', (collected, reason) => {
          if (reason === 'time' && msg.editable) {
            msg.edit({
              embeds: [
                new EmbedBuilder()
                  .setColor(0x95a5a6)
                  .setTitle('⌛ Temps écoulé')
                  .setDescription('Aucun client mentionné. Relance `/agence vendre` si besoin.'),
              ],
              components: [],
            }).catch(() => {});
          }
        });

        collector.stop('done');
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time' && msg.editable) {
          msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('⌛ Temps écoulé')
                .setDescription('La sélection de bien a expiré. Relance `/agence vendre` si besoin.'),
            ],
            components: [],
          }).catch(() => {});
        }
      });

      return;
    }

    // 10) /agence louer
    if (sub === 'louer') {
      if (!(agency.ownerId === userId || agency.agents.includes(userId))) {
        return interaction.reply({
          content: '⛔ Tu dois être patron ou agent pour louer un bien.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const props = listAgencyProperties(agency.id).filter(
        p => p.status === 'en_location' && p.currentPriceRent != null
      );

      if (!props.length) {
        return interaction.reply({
          content: '⚠ Aucun bien disponible à la location actuellement dans ton agence.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const emb = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`📑 Location — ${agency.name}`)
        .setDescription(
          'Choisis le bien que tu veux mettre en location.\n' +
          'Ensuite, tu devras **mentionner le locataire** dans le salon.'
        );

      const msg = await interaction.reply({
        embeds: [emb],
        components: [buildPropertySelectRowGeneric('agence_rent_prop', props, 'Choisissez un bien à louer…')],
        fetchReply: true,
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 120_000,
        filter: i => i.user.id === userId,
      });

      let selectedPropId = null;

      collector.on('collect', async (sel) => {
        if (sel.customId !== 'agence_rent_prop') return;
        selectedPropId = sel.values[0];

        const prop = getPropertyById(selectedPropId);
        if (!prop || prop.status !== 'en_location' || prop.currentPriceRent == null) {
          collector.stop('invalid');
          return sel.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Bien indisponible')
                .setDescription('Ce bien n’est plus disponible à la location.'),
            ],
            components: [],
          });
        }

        const emb2 = new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle(`📑 Location — ${prop.name}`)
          .setDescription(
            `Loyer : **${fmtMoney(prop.currentPriceRent)}** (sera prélevé périodiquement via /propriété payerloyer)\n\n` +
            'Mentionne maintenant le **locataire** dans le salon (ex: `@Nom`).'
          );

        await sel.update({
          embeds: [emb2],
          components: [],
        });

        const msgCollector = msg.channel.createMessageCollector({
          time: 60_000,
          max: 1,
          filter: m => m.author.id === userId,
        });

        msgCollector.on('collect', async (m) => {
          const target = m.mentions.users.first();
          if (!target || target.bot) {
            await msg.edit({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xe74c3c)
                  .setTitle('❌ Mention invalide')
                  .setDescription('Mentionne un joueur valide (pas un bot).'),
              ],
              components: [],
            }).catch(() => {});
            return;
          }

          const prop2 = getPropertyById(selectedPropId);
          if (!prop2 || prop2.status !== 'en_location' || prop2.currentPriceRent == null) {
            await msg.edit({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xe74c3c)
                  .setTitle('❌ Bien indisponible')
                  .setDescription('Ce bien n’est plus disponible à la location.'),
              ],
              components: [],
            }).catch(() => {});
            return;
          }

          const price = prop2.currentPriceRent;
          const confirmEmbed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle('📑 Confirmation de location')
            .setDescription(
              `${target}, acceptes-tu de louer **${prop2.name}** auprès de l’agence **${agency.name}** pour **${fmtMoney(price)}** par période ?\n\n` +
              'Le premier loyer sera payé maintenant, puis les suivants via `/propriété payerloyer`.'
            );

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`agence_rent_accept_${prop2.id}_${target.id}`)
              .setLabel('Accepter')
              .setEmoji('✅')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`agence_rent_decline_${prop2.id}_${target.id}`)
              .setLabel('Refuser')
              .setEmoji('❌')
              .setStyle(ButtonStyle.Danger),
          );

          const confMsg = await msg.channel.send({
            content: `${target}`,
            embeds: [confirmEmbed],
            components: [row],
          });

          const btnCollector = confMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60_000,
            filter: i => i.user.id === target.id,
          });

          btnCollector.on('collect', async (btn) => {
            if (btn.customId.endsWith('_decline_' + target.id)) {
              btnCollector.stop('declined');
              return btn.update({
                embeds: [confirmEmbed.setDescription('❌ Le locataire a refusé la location.')],
                components: [],
              });
            }

            if (btn.customId.endsWith('_accept_' + target.id)) {
              const tenantAcc = getOrCreateAccount(target.id);
              const solde = tenantAcc.courant?.banque || 0;

              if (solde < price) {
                btnCollector.stop('nofunds');
                return btn.update({
                  embeds: [
                    confirmEmbed.setDescription(
                      `⚠ Fonds insuffisants.\nSolde disponible sur ton compte courant (banque) : ${fmtMoney(solde)}.`
                    ),
                  ],
                  components: [],
                });
              }

              tenantAcc.courant = tenantAcc.courant || { liquide: 0, banque: 0 };
              tenantAcc.courant.banque -= price;
              updateAccount(target.id, tenantAcc);

              const patronAcc4 = getOrCreateAccount(agency.ownerId);
              patronAcc4.entreprise = patronAcc4.entreprise || { liquide: 0, banque: 0 };
              patronAcc4.entreprise.banque = (patronAcc4.entreprise.banque || 0) + price;
              updateAccount(agency.ownerId, patronAcc4);

              const nextDueAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // prochaine échéance (ex: 1 semaine)
              const res = markPropertyRented(prop2.id, target.id, price, nextDueAt);
              if (!res.ok) {
                btnCollector.stop('error');
                return btn.update({
                  embeds: [
                    confirmEmbed.setDescription('❌ Erreur lors de la création de la location.'),
                  ],
                  components: [],
                });
              }

              btnCollector.stop('done');

              await btn.update({
                embeds: [
                  confirmEmbed.setDescription(
                    `✅ Location confirmée.\n\n` +
                    `Locataire : ${target}\n` +
                    `Bien : **${prop2.name}**\n` +
                    `Loyer payé maintenant : **${fmtMoney(price)}**\n` +
                    `Les prochains loyers seront gérés via \`/propriété payerloyer\`.`
                  ),
                ],
                components: [],
              });

              await msg.channel.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('✅ Location immobilière')
                    .setDescription(
                      `👤 Agent : ${interaction.user}\n` +
                      `🏢 Agence : **${agency.name}**\n` +
                      `🧍 Locataire : ${target}\n` +
                      `🏠 Bien : **${prop2.name}**\n` +
                      `💰 Loyer initial : **${fmtMoney(price)}**`
                    ),
                ],
              });

              return;
            }
          });

          btnCollector.on('end', (collected, reason) => {
            if (reason === 'time' && confMsg.editable) {
              confMsg.edit({
                embeds: [
                  confirmEmbed.setDescription('⌛ Temps écoulé. La location a été annulée.'),
                ],
                components: [],
              }).catch(() => {});
            }
          });

          setTimeout(() => m.delete().catch(() => {}), 2000);
        });

        msgCollector.on('end', (collected, reason) => {
          if (reason === 'time' && msg.editable) {
            msg.edit({
              embeds: [
                new EmbedBuilder()
                  .setColor(0x95a5a6)
                  .setTitle('⌛ Temps écoulé')
                  .setDescription('Aucun locataire mentionné. Relance `/agence louer` si besoin.'),
              ],
              components: [],
            }).catch(() => {});
          }
        });

        collector.stop('done');
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time' && msg.editable) {
          msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('⌛ Temps écoulé')
                .setDescription('La sélection de bien a expiré. Relance `/agence louer` si besoin.'),
            ],
            components: [],
          }).catch(() => {});
        }
      });

      return;
    }

    // 12) /agence expulser
    if (sub === 'expulser') {
      if (!(agency.ownerId === userId || agency.agents.includes(userId))) {
        return interaction.reply({
          content: '⛔ Tu dois être patron ou agent pour expulser un locataire.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const props = listAgencyProperties(agency.id).filter(
        p => p.status === 'loue' && p.tenantUserId
      );

      if (!props.length) {
        return interaction.reply({
          content: '⚠ Aucun bien actuellement loué par ton agence.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const emb = new EmbedBuilder()
        .setColor(0xc0392b)
        .setTitle(`🚫 Expulsion — ${agency.name}`)
        .setDescription(
          'Choisis le bien pour lequel tu veux expulser le locataire.\n' +
          'Les coffres liés à la propriété seront gérés côté `/propriété`.'
        );

      const msg = await interaction.reply({
        embeds: [emb],
        components: [buildPropertySelectRowGeneric('agence_expel_prop', props, 'Choisissez un bien à expulser…')],
        flags: MessageFlags.Ephemeral,
        fetchReply: true,
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 120_000,
        filter: i => i.user.id === userId,
      });

      collector.on('collect', async (sel) => {
        if (sel.customId !== 'agence_expel_prop') return;
        const propId = sel.values[0];
        const prop = getPropertyById(propId);
        if (!prop || prop.status !== 'loue' || !prop.tenantUserId) {
          collector.stop('invalid');
          return sel.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Bien non loué')
                .setDescription('Ce bien n’est plus loué ou le locataire a déjà été retiré.'),
            ],
            components: [],
          });
        }

        const tenantMention = `<@${prop.tenantUserId}>`;

        const confirmEmbed = new EmbedBuilder()
          .setColor(0xc0392b)
          .setTitle('❓ Confirmation d’expulsion')
          .setDescription(
            `Voulez-vous vraiment expulser ${tenantMention} de **${prop.name}** ?\n` +
            'Les accès et le stockage liés à cette propriété seront réinitialisés côté `/propriété`.'
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`agence_expel_confirm_${prop.id}`)
            .setLabel('Confirmer')
            .setEmoji('🟩')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('agence_expel_cancel')
            .setLabel('Annuler')
            .setEmoji('🟥')
            .setStyle(ButtonStyle.Danger),
        );

        await sel.update({
          embeds: [confirmEmbed],
          components: [row],
        });

        const btnCollector = msg.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 30_000,
          filter: i => i.user.id === userId,
        });

        btnCollector.on('collect', async (btn) => {
          if (btn.customId === 'agence_expel_cancel') {
            btnCollector.stop('cancel');
            collector.stop('done');
            return btn.update({
              embeds: [confirmEmbed.setDescription('❌ Expulsion annulée.')],
              components: [],
            });
          }

          if (btn.customId === `agence_expel_confirm_${prop.id}`) {
            const res = expelTenant(prop.id);
            btnCollector.stop('done');
            collector.stop('done');
            if (!res.ok) {
              return btn.update({
                embeds: [confirmEmbed.setDescription('❌ Impossible d’expulser ce locataire.')],
                components: [],
              });
            }

            await btn.update({
              embeds: [
                confirmEmbed.setDescription(
                  `✅ ${tenantMention} a été expulsé de **${prop.name}**.\n` +
                  'Le stockage et les clés seront gérés par les commandes `/propriété`.'
                ),
              ],
              components: [],
            });

            await interaction.channel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xe74c3c)
                  .setTitle('🚫 Expulsion immobilière')
                  .setDescription(
                    `👤 Agent : ${interaction.user}\n` +
                    `🏢 Agence : **${agency.name}**\n` +
                    `🧍 Locataire expulsé : ${tenantMention}\n` +
                    `🏠 Bien : **${prop.name}**`
                  ),
              ],
            });

            return;
          }
        });

        btnCollector.on('end', (collected, reason) => {
          if (reason === 'time' && msg.editable) {
            msg.edit({
              embeds: [confirmEmbed.setDescription('⌛ Temps écoulé. Aucune expulsion effectuée.')],
              components: [],
            }).catch(() => {});
          }
        });
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time' && msg.editable) {
          msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('⌛ Temps écoulé')
                .setDescription('La sélection a expiré. Relance `/agence expulser` si besoin.'),
            ],
            components: [],
          }).catch(() => {});
        }
      });

      return;
    }
  },
};
