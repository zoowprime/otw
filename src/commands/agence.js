// src/commands/agence.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
} = require('discord.js');

const {
  getAgency,
  setAgency,
  listAgencies,
  createAgency,
  getAgencyByUser,
} = require('../data/agencyStore');

const {
  getProperty,
  setProperty,
  getAllProperties,
  wipeStorage,
} = require('../data/propertyStore');

const { getOrCreateAccount, updateAccount } = require('../economyData');

const STAFF_ROLE_ID      = process.env.STAFF_ROLE_ID;
const GOUVERNEMENT_USER  = process.env.GOUVERNEMENT_USER; // userId du gouvernement
const footer = { text: 'OTW — Agence Immobilière' };

// ──────────────────────────────────────────────
// Utils économie (banque entreprise du patron)

function getBalanceRef(acc, choice) {
  switch (choice) {
    case 'entreprise_banque':
      return acc.entreprise?.banque ?? 0;
    case 'courant_banque':
      return acc.courant?.banque ?? 0;
    default:
      return null;
  }
}

function setBalanceRef(acc, choice, val) {
  switch (choice) {
    case 'entreprise_banque':
      if (!acc.entreprise) acc.entreprise = { liquide: 0, banque: 0 };
      acc.entreprise.banque = val;
      break;
    case 'courant_banque':
      if (!acc.courant) acc.courant = { liquide: 0, banque: 0 };
      acc.courant.banque = val;
      break;
  }
}

const fmt = (n) => `${(Number(n) || 0).toLocaleString('fr-FR')} $`;

// ──────────────────────────────────────────────
// Catalogue des biens de l’État achetables par les agences

const STATE_PROPERTIES = [
  // 🏠 Maisons
  { id: 'bronx_manor',                 name: 'Bronx Manor',                                 category: 'Maison',            basePrice: 15000, location: 'Bronx' },
  { id: 'bellerive_manor',             name: 'Bellerive Manor',                             category: 'Maison',            basePrice: 20000, location: 'Bellerive' },
  { id: 'maison_ouest_saint_denis',    name: 'Maison ouest de Saint-Denis - Bayou',         category: 'Maison',            basePrice: 3000,  location: 'Bayou, Lemoyne' },
  { id: 'winchester_manor',            name: 'Winchester Manor',                            category: 'Maison',            basePrice: 10000, location: 'Saint-Denis' },
  { id: 'vieille_maison_bayou',        name: 'Vieille maison dans le Bayou',                category: 'Maison',            basePrice: 350,   location: 'Bayou, Lemoyne' },
  { id: 'roulotte_nord_rhodes',        name: 'Roulotte de voyageur - nord de Rhodes',       category: 'Maison',            basePrice: 350,   location: 'Nord de Rhodes' },
  { id: 'maison_sud_rhodes',           name: 'Maison sud de Rhodes',                        category: 'Maison',            basePrice: 950,   location: 'Sud de Rhodes' },
  { id: 'cabane_peche_bayou',          name: 'Cabane de pêche - Bayou',                     category: 'Maison',            basePrice: 400,   location: 'Bayou, Lemoyne' },
  { id: 'petit_bateau_lemoyne',        name: 'Petit bateau - Lemoyne',                      category: 'Maison',            basePrice: 600,   location: 'Lemoyne' },
  { id: 'cabane_bayou',                name: 'Cabane du bayou',                             category: 'Maison',            basePrice: 350,   location: 'Bayou, Lemoyne' },
  { id: 'cabane_artistique_bayou',     name: 'Cabane artistique du Bayou',                  category: 'Maison',            basePrice: 500,   location: 'Bayou, Lemoyne' },
  { id: 'maison_bayou',                name: 'Maison du bayou',                             category: 'Maison',            basePrice: 950,   location: 'Bayou, Lemoyne' },

  // 🌾 Terrains
  { id: 'ferme_ouest_emerald',         name: 'Ferme Ouest d’Emerald Ranch - New Hanover',   category: 'Terrain',           basePrice: 1500,  location: 'New Hanover' },
  { id: 'maison_hermite_newhanover',   name: 'Maison d’hermite dans New Hanover',           category: 'Terrain',           basePrice: 350,   location: 'New Hanover' },
  { id: 'grande_ferme_ouest_valentine',name: 'Grande ferme Ouest de Valentine',             category: 'Terrain',           basePrice: 3000,  location: 'Valentine' },
  { id: 'vieille_ferme_cumberland',    name: 'Vieille ferme Cumberland Forest',             category: 'Terrain',           basePrice: 750,   location: 'Cumberland Forest' },
  { id: 'ferme_southfield',            name: 'Ferme Southfield Flats - Lemoyne',            category: 'Terrain',           basePrice: 1000,  location: 'Lemoyne' },
  { id: 'hill_haven_ranch',            name: 'Hill Haven Ranch - Lemoyne',                  category: 'Terrain',           basePrice: 4500,  location: 'Lemoyne' },
  { id: 'ferme_van_horn',              name: 'Ferme Van Horn',                              category: 'Terrain',           basePrice: 1000,  location: 'Van Horn' },
  { id: 'emerald_ranch',               name: 'Emerald Ranch',                               category: 'Terrain',           basePrice: 8000,  location: 'New Hanover' },

  // 🏚 Locaux commerciaux
  { id: 'armurerie_saint_denis',       name: 'Armurerie – Saint-Denis',                     category: 'Local',             basePrice: 6500,  location: 'Saint-Denis' },
  { id: 'medecin_saint_denis',         name: 'Cabinet de médecin – Saint-Denis',            category: 'Local',             basePrice: 5000,  location: 'Saint-Denis' },
  { id: 'ecurie_saint_denis',          name: 'Écurie – Saint-Denis',                        category: 'Local',             basePrice: 9000,  location: 'Saint-Denis' },
  { id: 'opera_saint_denis',           name: 'Opéra de Saint-Denis',                        category: 'Local',             basePrice: 25000, location: 'Saint-Denis' },
  { id: 'banque_winchester_sd',        name: 'Banque Winchester – Saint-Denis',             category: 'Local',             basePrice: 18000, location: 'Saint-Denis' },
  { id: 'bastille_saloon_sd',          name: 'Bastille Saloon – Saint-Denis',               category: 'Local',             basePrice: 7500,  location: 'Saint-Denis' },
  { id: 'ales_wines_cigars',           name: 'Ales Wines Cigars Saloon – Saint-Denis',      category: 'Local',             basePrice: 6000,  location: 'Saint-Denis' },
  { id: 'banque_rhodes',               name: 'Banque de Rhodes',                            category: 'Local',             basePrice: 8500,  location: 'Rhodes' },
  { id: 'ecurie_rhodes',               name: 'Écurie (Lemoyne) – Rhodes',                   category: 'Local',             basePrice: 4000,  location: 'Rhodes' },
  { id: 'armurerie_rhodes',            name: 'Armurerie de Rhodes',                         category: 'Local',             basePrice: 2000,  location: 'Rhodes' },
  { id: 'saloon_rhodes',               name: 'Saloon de Rhodes',                            category: 'Local',             basePrice: 2500,  location: 'Rhodes' },
  { id: 'saints_hotel_valentine',      name: 'Saints Hotel – Valentine',                    category: 'Local',             basePrice: 3750,  location: 'Valentine' },
  { id: 'saloon_valentine',            name: 'Saloon de Valentine',                         category: 'Local',             basePrice: 3500,  location: 'Valentine' },
  { id: 'bar_valentine',               name: 'Le Bar de Valentine',                         category: 'Local',             basePrice: 2000,  location: 'Valentine' },
  { id: 'ecurie_valentine',            name: 'Écurie de Valentine',                         category: 'Local',             basePrice: 3750,  location: 'Valentine' },
  { id: 'medecin_valentine',           name: 'Cabinet de médecin – Valentine',              category: 'Local',             basePrice: 2500,  location: 'Valentine' },
  { id: 'ecurie_van_horn',             name: 'Écurie de Van Horn',                          category: 'Local',             basePrice: 1100,  location: 'Van Horn' },
  { id: 'saloon_van_horn',             name: 'Saloon Van Horn',                             category: 'Local',             basePrice: 900,   location: 'Van Horn' },
  { id: 'distillerie_bayou',           name: 'Ancienne distillerie inexploitable – Bayou',  category: 'Local',             basePrice: 850,   location: 'Bayou, Lemoyne' },

  // 🏢 Immeubles / gros sites
  { id: 'mines_annesburg',             name: 'Mines d’Annesburg',                           category: 'Immeuble',          basePrice: 35000, location: 'Annesburg' },
  { id: 'sites_petrole_belleshore',    name: 'Sites d’exploitation pétrolière de Belleshore',category: 'Immeuble',         basePrice: 30000, location: 'Belleshore' },
  { id: 'usines_sud_est_sd',           name: 'Usines sud-est de Saint-Denis',               category: 'Immeuble',          basePrice: 15000, location: 'Saint-Denis' },
  { id: 'scierie_sd',                  name: 'Scierie de Saint-Denis',                      category: 'Immeuble',          basePrice: 10500, location: 'Saint-Denis' },
  { id: 'usine_agro_sd',               name: 'Usine agroalimentaire de Saint-Denis',        category: 'Immeuble',          basePrice: 12000, location: 'Saint-Denis' },
  { id: 'usines_ferro_sd',             name: 'Usines de production ferroviaire de Saint-Denis', category: 'Immeuble',      basePrice: 22000, location: 'Saint-Denis' },
  { id: 'usines_agro_rhodes',          name: 'Usines agroalimentaires de Rhodes',           category: 'Immeuble',          basePrice: 6500,  location: 'Rhodes' },
  { id: 'docks_sd',                    name: 'Docks de Saint-Denis (Import/Export)',        category: 'Immeuble',          basePrice: 20000, location: 'Saint-Denis' },
  { id: 'quai_sd',                     name: 'Quai ferroviaire Saint-Denis',                category: 'Immeuble',          basePrice: 7000,  location: 'Saint-Denis' },
  { id: 'quai_emerald',                name: 'Quai ferroviaire Emerald Ranch',              category: 'Immeuble',          basePrice: 4500,  location: 'Emerald Ranch' },
  { id: 'quai_rhodes',                 name: 'Quai ferroviaire Rhodes',                     category: 'Immeuble',          basePrice: 3500,  location: 'Rhodes' },
  { id: 'quai_valentine',              name: 'Quai ferroviaire Valentine',                  category: 'Immeuble',          basePrice: 3000,  location: 'Valentine' },
  { id: 'quai_van_horn',               name: 'Quai ferroviaire Van Horn',                   category: 'Immeuble',          basePrice: 2000,  location: 'Van Horn' },
];

// ──────────────────────────────────────────────
// Helpers propriétés <-> agences

function findStatePropById(id) {
  return STATE_PROPERTIES.find(p => p.id === id) || null;
}

// Une propriété est dispo pour achat si aucune agence ou joueur ne la possède.
function isStatePropAvailable(stateId) {
  const prop = getProperty(stateId);
  if (!prop) return true;
  if (prop.agencyId || prop.ownerPlayerId || prop.tenantId) return false;
  return true;
}

function ensurePropertyForAgencyPurchase(stateInfo, agency) {
  // s’il existe déjà, on le récupère, sinon on le crée
  let p = getProperty(stateInfo.id);
  if (!p) {
    p = {
      id: stateInfo.id,
      name: stateInfo.name,
      type: stateInfo.category,
      location: stateInfo.location,
      status: 'AGENCE_ONLY',
      ownerPlayerId: null,
      tenantId: null,
      landlordId: null,
      rentAmount: null,
      rentEveryDays: 7,
      agencyId: agency.id,
      salePrice: null,
      basePrice: stateInfo.basePrice,
      keyholders: [],
      storage: { items: [], weightMax: 120 },
    };
  } else {
    p.agencyId = agency.id;
    p.status   = 'AGENCE_ONLY';
  }
  return setProperty(p);
}

// ──────────────────────────────────────────────
// Helpers embeds/UI

function agencySummaryEmbed(agency) {
  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`🏢 ${agency.name}`)
    .setDescription(
      `📂 **Type :** ${agency.type}\n` +
      `👑 **Patron :** <@${agency.patronId}>`
    )
    .addFields(
      {
        name: '👥 Équipe',
        value: agency.agents.length
          ? agency.agents.map(id => `<@${id}>`).join(', ')
          : 'Aucun agent pour l’instant.',
      },
      {
        name: '🏘️ Biens gérés',
        value: `${agency.properties.length} bien(s) au catalogue.`,
      },
      {
        name: '📜 Historique',
        value: `🏠 Ventes : **${agency.soldCount}** • 📄 Locations : **${agency.rentedCount}**`,
      },
    )
    .setFooter(footer);
}

function requireStaff(interaction) {
  return interaction.member.roles.cache.has(STAFF_ROLE_ID);
}

function requirePatronOrAgent(interaction) {
  const agency = getAgencyByUser(interaction.user.id);
  if (!agency) return { ok: false, reason: 'NO_AGENCY' };
  return { ok: true, agency };
}

function requirePatron(interaction) {
  const agency = getAgencyByUser(interaction.user.id);
  if (!agency || agency.patronId !== interaction.user.id) {
    return { ok: false, reason: 'NOT_PATRON' };
  }
  return { ok: true, agency };
}

// ──────────────────────────────────────────────
// Commande principale

module.exports = {
  data: new SlashCommandBuilder()
    .setName('agence')
    .setDescription('Gestion des agences immobilières.')

    // STAFF : créer une agence
    .addSubcommand(sc =>
      sc.setName('creer')
        .setDescription('Créer une agence immobilière (STAFF uniquement).')
        .addUserOption(o =>
          o.setName('patron')
            .setDescription('Patron de l’agence')
            .setRequired(true),
        )
        .addStringOption(o =>
          o.setName('nom')
            .setDescription('Nom de l’agence')
            .setRequired(true),
        ),
    )

    // Patron : recruter / virer
    .addSubcommand(sc =>
      sc.setName('recruter')
        .setDescription('Recruter un agent dans ton agence.')
        .addUserOption(o =>
          o.setName('cible')
            .setDescription('Joueur à recruter')
            .setRequired(true),
        ),
    )
    .addSubcommand(sc =>
      sc.setName('virer')
        .setDescription('Retirer un agent de ton agence.')
        .addUserOption(o =>
          o.setName('cible')
            .setDescription('Joueur à retirer')
            .setRequired(true),
        ),
    )

    // Patron & agents : catalogue + prix + vente/location
    .addSubcommand(sc =>
      sc.setName('catalogue')
        .setDescription('Voir le catalogue des biens de ton agence.'),
    )
    .addSubcommand(sc =>
      sc.setName('voir')
        .setDescription('Voir les infos de ton agence (ou toutes les agences si STAFF).'),
    )

    .addSubcommand(sc =>
      sc.setName('ajouterbien')
        .setDescription('Acheter un bien de l’État pour le catalogue de ton agence.'),
    )

    .addSubcommand(sc =>
      sc.setName('definirprix')
        .setDescription('Définir un prix de vente ou un loyer pour un bien du catalogue.')
        .addStringOption(o =>
          o.setName('propriete')
            .setDescription('ID de la propriété (voir /agence catalogue pour les IDs).')
            .setRequired(true),
        )
        .addStringOption(o =>
          o.setName('type')
            .setDescription('Type de prix à définir.')
            .setRequired(true)
            .addChoices(
              { name: 'Prix de vente',  value: 'vente' },
              { name: 'Loyer',         value: 'loyer' },
            ),
        )
        .addNumberOption(o =>
          o.setName('montant')
            .setDescription('Montant à définir.')
            .setRequired(true),
        ),
    )

    .addSubcommand(sc =>
      sc.setName('vendre')
        .setDescription('Proposer la vente d’un bien à un joueur (avec confirmation du client).')
        .addStringOption(o =>
          o.setName('propriete')
            .setDescription('ID de la propriété à vendre.')
            .setRequired(true),
        )
        .addUserOption(o =>
          o.setName('client')
            .setDescription('Acheteur')
            .setRequired(true),
        ),
    )

    .addSubcommand(sc =>
      sc.setName('louer')
        .setDescription('Proposer une location de bien à un joueur (avec confirmation du locataire).')
        .addStringOption(o =>
          o.setName('propriete')
            .setDescription('ID de la propriété à louer.')
            .setRequired(true),
        )
        .addUserOption(o =>
          o.setName('locataire')
            .setDescription('Locataire')
            .setRequired(true),
        )
        .addNumberOption(o =>
          o.setName('loyer')
            .setDescription('Montant du loyer (si tu veux le modifier).')
            .setRequired(false),
        ),
    )

    .addSubcommand(sc =>
      sc.setName('expulser')
        .setDescription('Expulser un locataire de l’un de tes biens.')
        .addStringOption(o =>
          o.setName('propriete')
            .setDescription('ID de la propriété.')
            .setRequired(true),
        )
        .addUserOption(o =>
          o.setName('locataire')
            .setDescription('Locataire à expulser')
            .setRequired(true),
        ),
    )

    // STAFF : donner une propriété d’État directement à un joueur
    .addSubcommand(sc =>
      sc.setName('givepropriete')
        .setDescription('STAFF : donner une propriété d’État directement à un joueur.')
        .addUserOption(o =>
          o.setName('cible')
            .setDescription('Joueur qui reçoit la propriété')
            .setRequired(true),
        )
        .addStringOption(o =>
          o.setName('etat_id')
            .setDescription('ID de la propriété d’État (voir documentation interne).')
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ─────────────────────────── /agence creer (STAFF)
    if (sub === 'creer') {
      if (!requireStaff(interaction)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('⛔ Accès refusé')
              .setDescription('Seuls les membres STAFF peuvent créer une agence.'),
          ],
          ephemeral: true,
        });
      }

      const patron = interaction.options.getUser('patron');
      const nom    = interaction.options.getString('nom');

      const ag = createAgency(patron.id, nom);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('🏢 Agence créée')
            .setDescription(
              `Nouvelle agence **${ag.name}** créée.\n\n` +
              `👑 Patron : ${patron}\n` +
              `🏷️ Type : **${ag.type}**\n` +
              `🆔 ID interne : \`${ag.id}\``
            )
            .setFooter(footer),
        ],
      });
    }

    // ─────────────────────────── /agence recruter (patron)
    if (sub === 'recruter') {
      const check = requirePatron(interaction);
      if (!check.ok) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('⛔ Accès refusé')
              .setDescription('Seul le patron de l’agence peut recruter des agents.'),
          ],
          ephemeral: true,
        });
      }

      const agency = check.agency;
      const cible  = interaction.options.getUser('cible');

      if (cible.bot) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('❌ Impossible')
              .setDescription('Tu ne peux pas recruter un bot.'),
          ],
          ephemeral: true,
        });
      }
      if (agency.agents.includes(cible.id) || cible.id === agency.patronId) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('ℹ️ Déjà dans l’agence')
              .setDescription(`${cible} fait déjà partie de l’agence.`),
          ],
          ephemeral: true,
        });
      }
      if (agency.agents.length >= 3) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('⚠️ Limite atteinte')
              .setDescription('Ton agence a déjà **3 agents** (hors patron).'),
          ],
          ephemeral: true,
        });
      }

      agency.agents.push(cible.id);
      setAgency(agency);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('✅ Nouvel agent recruté')
            .setDescription(`${cible} rejoint l’équipe de **${agency.name}**.`)
            .setFooter(footer),
        ],
      });
    }

    // ─────────────────────────── /agence virer (patron)
    if (sub === 'virer') {
      const check = requirePatron(interaction);
      if (!check.ok) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('⛔ Accès refusé')
              .setDescription('Seul le patron de l’agence peut retirer un agent.'),
          ],
          ephemeral: true,
        });
      }

      const agency = check.agency;
      const cible  = interaction.options.getUser('cible');

      if (!agency.agents.includes(cible.id)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('👤 Agent introuvable')
              .setDescription(`${cible} n’est pas agent dans ton agence.`),
          ],
          ephemeral: true,
        });
      }

      agency.agents = agency.agents.filter(id => id !== cible.id);
      setAgency(agency);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('👋 Agent retiré')
            .setDescription(`${cible} ne fait plus partie de **${agency.name}**.`)
            .setFooter(footer),
        ],
      });
    }

    // ─────────────────────────── /agence catalogue
    if (sub === 'catalogue') {
      const check = requirePatronOrAgent(interaction);
      if (!check.ok) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('🏢 Aucune agence')
              .setDescription('Tu ne fais partie d’aucune agence immobilière.'),
          ],
          ephemeral: true,
        });
      }
      const agency = check.agency;

      const props = getAllProperties().filter(p => p.agencyId === agency.id);

      const emb = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`📘 Catalogue — ${agency.name}`)
        .setDescription(
          `🏘️ **Biens gérés :** ${props.length}\n` +
          `📈 Ventes : **${agency.soldCount}** • 📄 Locations : **${agency.rentedCount}**\n\n` +
          'ℹ️ Les IDs listés ci-dessous sont à utiliser dans :\n' +
          '`/agence definirprix`, `/agence vendre`, `/agence louer`, etc.'
        )
        .setFooter(footer);

      if (!props.length) {
        emb.addFields({
          name: 'Aucun bien',
          value: 'Ton agence n’a encore acheté **aucun bien** à l’État.',
        });
      } else {
        for (const p of props) {
          const status = p.status || 'AGENCE_ONLY';
          const vente  = typeof p.salePrice === 'number' ? fmt(p.salePrice) : 'Non défini';
          const loyer  = typeof p.rentAmount === 'number' ? fmt(p.rentAmount) : 'Non défini';

          let statusLabel = status;
          if (status === 'AGENCE_ONLY') statusLabel = 'Disponible en agence';
          if (status === 'FOR_SALE')   statusLabel = '🟢 En vente';
          if (status === 'FOR_RENT')   statusLabel = '🟡 À louer';
          if (status === 'RENTED')     statusLabel = '🔵 Loué';
          if (status === 'OWNED')      statusLabel = '🟣 Vendu (client propriétaire)';

          emb.addFields({
            name: `🏠 ${p.name} — ${p.type || 'Bien'}`,
            value:
              (p.location ? `📍 **${p.location}**\n` : '') +
              `• Statut : **${statusLabel}**\n` +
              `• Prix de vente : ${vente}\n` +
              `• Loyer : ${loyer}\n` +
              `• ID : \`${p.id}\``,
          });
        }
      }

      return interaction.reply({ embeds: [emb] });
    }

    // ─────────────────────────── /agence voir
    if (sub === 'voir') {
      if (requireStaff(interaction)) {
        // STAFF : liste de toutes les agences
        const all = listAgencies();
        if (!all.length) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle('Aucune agence')
                .setDescription('Aucune agence immobilière n’a encore été créée.'),
            ],
          });
        }
        const emb = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle('📋 Liste des agences')
          .setFooter(footer);

        for (const a of all) {
          emb.addFields({
            name: `${a.name} — 👑 <@${a.patronId}>`,
            value:
              `🆔 ID : \`${a.id}\`\n` +
              `👥 Agents : ${a.agents.length}\n` +
              `🏘️ Biens gérés : ${a.properties.length}\n` +
              `📈 Ventes : ${a.soldCount} • 📄 Locations : ${a.rentedCount}`,
          });
        }

        return interaction.reply({ embeds: [emb] });
      }

      // Patron ou agent : infos de SA propre agence
      const check = requirePatronOrAgent(interaction);
      if (!check.ok) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('🏢 Aucune agence')
              .setDescription('Tu ne fais partie d’aucune agence immobilière.'),
          ],
          ephemeral: true,
        });
      }
      const emb = agencySummaryEmbed(check.agency);
      return interaction.reply({ embeds: [emb] });
    }

    // ─────────────────────────── /agence ajouterbien
    if (sub === 'ajouterbien') {
      const check = requirePatronOrAgent(interaction);
      if (!check.ok) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('🏢 Aucune agence')
              .setDescription('Tu dois faire partie d’une agence pour acheter un bien.'),
          ],
          ephemeral: true,
        });
      }
      const agency = check.agency;

      // Étape 1 : choisir catégorie
      const categories = ['Maison', 'Terrain', 'Local', 'Immeuble'];
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ag_add_cat')
          .setPlaceholder('🗂️ Choisis une catégorie de propriété')
          .addOptions(
            categories.map(cat => ({
              label: cat,
              value: cat,
              emoji: cat === 'Maison' ? '🏠' :
                     cat === 'Terrain' ? '🌾' :
                     cat === 'Local'   ? '🏚️' : '🏢',
            })),
          ),
      );

      const msg = await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1abc9c)
            .setTitle(`🧾 Ajouter un bien — ${agency.name}`)
            .setDescription(
              'Sélectionne la **catégorie** de propriété à acheter pour ton agence.\n\n' +
              'Les biens déjà possédés par une agence ou un joueur ne seront pas affichés.'
            ),
        ],
        components: [row],
        fetchReply: true,
      });

      const catCollector = msg.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 90_000,
        filter: (i) => i.user.id === interaction.user.id,
      });

      catCollector.on('collect', async (sel) => {
        if (sel.customId !== 'ag_add_cat') return;

        const cat = sel.values[0];

        const avail = STATE_PROPERTIES.filter(p =>
          p.category === cat && isStatePropAvailable(p.id)
        );

        if (!avail.length) {
          return sel.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle('Aucune propriété disponible')
                .setDescription('Plus aucun bien disponible dans cette catégorie pour le moment.'),
            ],
            components: [],
          });
        }

        const rowProps = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('ag_add_prop')
            .setPlaceholder('🏠 Choisis la propriété à acheter')
            .addOptions(
              avail.slice(0, 25).map(p => ({
                label: p.name,
                description: `${fmt(p.basePrice)} • ${p.location}`,
                value: p.id,
              })),
            ),
        );

        await sel.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x1abc9c)
              .setTitle(`🧾 Ajouter un bien — ${agency.name}`)
              .setDescription(
                `Catégorie sélectionnée : **${cat}**\n` +
                'Choisis maintenant la **propriété** à acheter.'
              ),
          ],
          components: [rowProps],
        });
      });

      catCollector.on('end', async () => {
        try { await msg.edit({ components: [] }); } catch {}
      });

      const propCollector = msg.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 90_000,
        filter: (i) => i.user.id === interaction.user.id && i.customId === 'ag_add_prop',
      });

      propCollector.on('collect', async (sel) => {
        const stateId = sel.values[0];
        const info = findStatePropById(stateId);
        if (!info || !isStatePropAvailable(stateId)) {
          return sel.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Erreur')
                .setDescription('Cette propriété n’est plus disponible.'),
            ],
            components: [],
          });
        }

        // Paiement : agence = compte entreprise (banque) du patron
        const patronId = agency.patronId;
        const patronAcc = getOrCreateAccount(patronId);
        const govAcc    = GOUVERNEMENT_USER ? getOrCreateAccount(GOUVERNEMENT_USER) : null;

        const prix = info.basePrice;
        const solde = getBalanceRef(patronAcc, 'entreprise_banque');

        if (solde < prix) {
          return sel.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('💰 Fonds insuffisants')
                .setDescription(
                  `Le compte **entreprise (banque)** du patron n’a pas assez de fonds.\n\n` +
                  `💵 Prix du bien : ${fmt(prix)}\n` +
                  `🏦 Solde actuel : ${fmt(solde)}`
                ),
            ],
            components: [],
          });
        }

        setBalanceRef(patronAcc, 'entreprise_banque', solde - prix);
        updateAccount(patronId, patronAcc);

        if (govAcc && GOUVERNEMENT_USER) {
          const govSolde = getBalanceRef(govAcc, 'entreprise_banque') ?? 0;
          setBalanceRef(govAcc, 'entreprise_banque', govSolde + prix);
          updateAccount(GOUVERNEMENT_USER, govAcc);
        }

        // Création / mise à jour de la propriété
        const prop = ensurePropertyForAgencyPurchase(info, agency);

        if (!agency.properties.includes(prop.id)) {
          agency.properties.push(prop.id);
          setAgency(agency);
        }

        return sel.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle('✅ Bien acheté pour l’agence')
              .setDescription(
                `Ton agence **${agency.name}** a acheté :\n\n` +
                `🏠 **${prop.name}** *(${prop.type})*\n` +
                `📍 Localisation : **${prop.location}**\n` +
                `💵 Prix : ${fmt(info.basePrice)}\n\n` +
                `🏛️ Le gouvernement a été crédité de cette somme.\n` +
                `🆔 ID propriété : \`${prop.id}\``
              )
              .setFooter(footer),
          ],
          components: [],
        });
      });

      return;
    }

    // ─────────────────────────── /agence definirprix
    if (sub === 'definirprix') {
      const check = requirePatronOrAgent(interaction);
      if (!check.ok) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('🏢 Aucune agence')
              .setDescription('Tu dois faire partie d’une agence pour définir un prix.'),
          ],
          ephemeral: true,
        });
      }
      const agency = check.agency;

      const propId = interaction.options.getString('propriete');
      const kind   = interaction.options.getString('type'); // vente / loyer
      const amount = interaction.options.getNumber('montant');

      const prop = getProperty(propId);
      if (!prop || prop.agencyId !== agency.id) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('🏠 Propriété introuvable')
              .setDescription('Cette propriété ne fait pas partie du catalogue de ton agence.'),
          ],
          ephemeral: true,
        });
      }

      if (kind === 'vente') {
        prop.salePrice = amount;
        prop.status    = 'FOR_SALE';
      } else {
        prop.rentAmount    = amount;
        prop.status        = 'FOR_RENT';
        prop.rentEveryDays = prop.rentEveryDays || 7;
      }

      setProperty(prop);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('💰 Prix mis à jour')
            .setDescription(
              `Pour **${prop.name}** :\n\n` +
              (kind === 'vente'
                ? `• Nouveau **prix de vente** : ${fmt(amount)}`
                : `• Nouveau **loyer** : ${fmt(amount)} tous les ${prop.rentEveryDays} jours`)
            )
            .setFooter(footer),
        ],
        ephemeral: true,
      });
    }

    // ─────────────────────────── /agence vendre (avec confirmation client)
    if (sub === 'vendre') {
      const check = requirePatronOrAgent(interaction);
      if (!check.ok) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('🏢 Aucune agence')
              .setDescription('Tu dois faire partie d’une agence pour vendre un bien.'),
          ],
          ephemeral: true,
        });
      }
      let agency = check.agency;

      const propId = interaction.options.getString('propriete');
      const client = interaction.options.getUser('client');

      let prop = getProperty(propId);
      if (!prop || prop.agencyId !== agency.id) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('🏠 Propriété introuvable')
              .setDescription('Ce bien ne fait pas partie du catalogue de ton agence.'),
          ],
          ephemeral: true,
        });
      }

      if (prop.ownerPlayerId) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('⚠ Déjà vendu')
              .setDescription('Ce bien appartient déjà à un joueur.'),
          ],
          ephemeral: true,
        });
      }

      if (typeof prop.salePrice !== 'number' || prop.salePrice <= 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('💰 Prix non défini')
              .setDescription('Aucun **prix de vente** n’est défini pour ce bien. Utilise `/agence definirprix` avant.'),
          ],
          ephemeral: true,
        });
      }

      const salePrice = prop.salePrice;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ag_sell_accept')
          .setLabel('Accepter')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('ag_sell_refuse')
          .setLabel('Refuser')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger),
      );

      const offerEmbed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('💸 Offre d’achat de propriété')
        .setDescription(
          `${client}, tu as reçu une offre d’achat :\n\n` +
          `🏠 **Bien :** ${prop.name}\n` +
          (prop.location ? `📍 **Localisation :** ${prop.location}\n` : '') +
          `🏢 **Agence :** ${agency.name}\n\n` +
          `💵 **Prix :** ${fmt(salePrice)}\n\n` +
          `▫️ L’argent sera débité de ton **compte courant (banque)**.\n` +
          `▫️ L’agence ne gérera plus ce bien une fois la vente effectuée.\n\n` +
          `👉 Clique sur **Accepter** ou **Refuser**.`
        )
        .setFooter(footer);

      const msg = await interaction.reply({
        content: `${client}`,
        embeds: [offerEmbed],
        components: [row],
        fetchReply: true,
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120_000,
      });

      collector.on('collect', async (btn) => {
        if (btn.user.id !== client.id) {
          return btn.reply({
            content: '⛔ Seul le client concerné peut répondre à cette offre.',
            ephemeral: true,
          });
        }

        if (btn.customId === 'ag_sell_refuse') {
          collector.stop('refused');
          return btn.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Vente refusée')
                .setDescription(
                  `${client} a refusé l’achat de **${prop.name}** auprès de l’agence **${agency.name}**.`
                )
                .setFooter(footer),
            ],
            components: [],
          });
        }

        if (btn.customId === 'ag_sell_accept') {
          // Re-check à la dernière seconde
          prop = getProperty(propId);
          agency = getAgency(agency.id) || agency;

          if (!prop || prop.agencyId !== agency.id || prop.ownerPlayerId) {
            collector.stop('invalid');
            return btn.update({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xe74c3c)
                  .setTitle('❌ Vente impossible')
                  .setDescription('Le bien n’est plus disponible à la vente (catalogue modifié).')
                  .setFooter(footer),
              ],
              components: [],
            });
          }

          const price = prop.salePrice;
          const clientAcc = getOrCreateAccount(client.id);
          const patronAcc = getOrCreateAccount(agency.patronId);

          const soldeClient = getBalanceRef(clientAcc, 'courant_banque');
          if (soldeClient < price) {
            collector.stop('nofunds');
            return btn.update({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xe74c3c)
                  .setTitle('💰 Fonds insuffisants')
                  .setDescription(
                    `${client} n’a pas assez d’argent sur son **compte courant (banque)**.\n\n` +
                    `💵 Prix : ${fmt(price)}\n` +
                    `🏦 Solde actuel : ${fmt(soldeClient)}`
                  )
                  .setFooter(footer),
              ],
              components: [],
            });
          }

          const soldeAgence = getBalanceRef(patronAcc, 'entreprise_banque') ?? 0;

          setBalanceRef(clientAcc, 'courant_banque', soldeClient - price);
          setBalanceRef(patronAcc, 'entreprise_banque', soldeAgence + price);
          updateAccount(client.id, clientAcc);
          updateAccount(agency.patronId, patronAcc);

          // Maj propriété -> propriétaire joueur
          prop.ownerPlayerId = client.id;
          prop.agencyId      = null;          // l’agence ne gère plus ce bien
          prop.status        = 'OWNED';
          prop.rentAmount    = null;
          prop.tenantId      = null;
          prop.landlordId    = null;
          prop.nextRentTs    = null;
          prop.keyholders    = [];            // on reset les anciennes clés éventuelles
          setProperty(prop);

          agency.properties = agency.properties.filter(id => id !== prop.id);
          agency.soldCount  = (agency.soldCount || 0) + 1;
          setAgency(agency);

          collector.stop('accepted');

          return btn.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('✅ Vente finalisée')
                .setDescription(
                  `🏠 **${prop.name}** appartient désormais à ${client}.\n\n` +
                  `💵 Montant payé : ${fmt(price)}\n` +
                  `🏢 Agence : **${agency.name}**\n\n` +
                  `L’agence a été créditée sur le compte **entreprise (banque)** du patron.`
                )
                .setFooter(footer),
            ],
            components: [],
          });
        }
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          try {
            await msg.edit({
              embeds: [
                new EmbedBuilder()
                  .setColor(0x95a5a6)
                  .setTitle('⌛ Offre expirée')
                  .setDescription(
                    `L’offre de vente pour **${prop.name}** a expiré.\n` +
                    `L’agent peut relancer la commande \`/agence vendre\` si nécessaire.`
                  )
                  .setFooter(footer),
              ],
              components: [],
            });
          } catch {}
        }
      });

      return;
    }

    // ─────────────────────────── /agence louer (avec confirmation locataire)
    if (sub === 'louer') {
      const check = requirePatronOrAgent(interaction);
      if (!check.ok) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('🏢 Aucune agence')
              .setDescription('Tu dois faire partie d’une agence pour louer un bien.'),
          ],
          ephemeral: true,
        });
      }
      let agency = check.agency;

      const propId    = interaction.options.getString('propriete');
      const locataire = interaction.options.getUser('locataire');
      const newRent   = interaction.options.getNumber('loyer');

      let prop = getProperty(propId);
      if (!prop || prop.agencyId !== agency.id) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('🏠 Propriété introuvable')
              .setDescription('Ce bien ne fait pas partie du catalogue de ton agence.'),
          ],
          ephemeral: true,
        });
      }

      if (prop.status === 'RENTED' && prop.tenantId) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('🔵 Déjà loué')
              .setDescription('Ce bien est déjà loué à un autre joueur. Utilise `/agence expulser` avant.'),
          ],
          ephemeral: true,
        });
      }

      const loyer = newRent ?? prop.rentAmount;
      if (!loyer || loyer <= 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('💰 Loyer non défini')
              .setDescription(
                'Aucun loyer n’est défini pour ce bien.\n\n' +
                'Utilise `/agence definirprix` (type = **Loyer**) ou renseigne `loyer` dans cette commande.'
              ),
          ],
          ephemeral: true,
        });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ag_rent_accept')
          .setLabel('Accepter la location')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('ag_rent_refuse')
          .setLabel('Refuser')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger),
      );

      const offerEmbed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('📜 Proposition de location')
        .setDescription(
          `${locataire}, tu as reçu une proposition de location :\n\n` +
          `🏠 **Bien :** ${prop.name}\n` +
          (prop.location ? `📍 **Localisation :** ${prop.location}\n` : '') +
          `🏢 **Agence :** ${agency.name}\n\n` +
          `💰 **Loyer :** ${fmt(loyer)} tous les ${prop.rentEveryDays || 7} jours\n\n` +
          `▫️ Tu pourras payer ton loyer avec \`/propriete payerloyer\`.\n` +
          `▫️ En cas de non-paiement, l’agence pourra te retirer le bien.\n\n` +
          `👉 Clique sur **Accepter la location** ou **Refuser**.`
        )
        .setFooter(footer);

      const msg = await interaction.reply({
        content: `${locataire}`,
        embeds: [offerEmbed],
        components: [row],
        fetchReply: true,
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120_000,
      });

      collector.on('collect', async (btn) => {
        if (btn.user.id !== locataire.id) {
          return btn.reply({
            content: '⛔ Seul le locataire concerné peut répondre à cette proposition.',
            ephemeral: true,
          });
        }

        if (btn.customId === 'ag_rent_refuse') {
          collector.stop('refused');
          return btn.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Location refusée')
                .setDescription(
                  `${locataire} a refusé la location de **${prop.name}** auprès de l’agence **${agency.name}**.`
                )
                .setFooter(footer),
            ],
            components: [],
          });
        }

        if (btn.customId === 'ag_rent_accept') {
          prop   = getProperty(propId);
          agency = getAgency(agency.id) || agency;

          if (!prop || prop.agencyId !== agency.id) {
            collector.stop('invalid');
            return btn.update({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xe74c3c)
                  .setTitle('❌ Location impossible')
                  .setDescription('Le bien ne fait plus partie du catalogue de ton agence.')
                  .setFooter(footer),
              ],
              components: [],
            });
          }

          if (prop.status === 'RENTED' && prop.tenantId) {
            collector.stop('already_rented');
            return btn.update({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xe67e22)
                  .setTitle('🔵 Déjà loué')
                  .setDescription('Ce bien vient d’être loué à quelqu’un d’autre.')
                  .setFooter(footer),
              ],
              components: [],
            });
          }

          prop.rentAmount    = loyer;
          prop.rentEveryDays = prop.rentEveryDays || 7;
          prop.tenantId      = locataire.id;
          prop.landlordId    = agency.patronId;
          prop.status        = 'RENTED';
          prop.nextRentTs    = Date.now();

          setProperty(prop);

          agency.rentedCount = (agency.rentedCount || 0) + 1;
          setAgency(agency);

          collector.stop('accepted');

          return btn.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('✅ Location créée')
                .setDescription(
                  `📜 **${prop.name}** est maintenant louée à ${locataire}.\n\n` +
                  `💰 Loyer : ${fmt(loyer)} tous les ${prop.rentEveryDays} jours.\n` +
                  `🏢 Agence : **${agency.name}**\n\n` +
                  `Le locataire pourra payer via \`/propriete payerloyer id:${prop.id}\`.`
                )
                .setFooter(footer),
            ],
            components: [],
          });
        }
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          try {
            await msg.edit({
              embeds: [
                new EmbedBuilder()
                  .setColor(0x95a5a6)
                  .setTitle('⌛ Proposition expirée')
                  .setDescription(
                    `La proposition de location pour **${prop.name}** a expiré.\n` +
                    `L’agent peut relancer la commande \`/agence louer\` si nécessaire.`
                  )
                  .setFooter(footer),
              ],
              components: [],
            });
          } catch {}
        }
      });

      return;
    }

    // ─────────────────────────── /agence expulser
    if (sub === 'expulser') {
      const check = requirePatronOrAgent(interaction);
      if (!check.ok) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('🏢 Aucune agence')
              .setDescription('Tu dois faire partie d’une agence pour expulser un locataire.'),
          ],
          ephemeral: true,
        });
      }
      const agency = check.agency;

      const propId    = interaction.options.getString('propriete');
      const locataire = interaction.options.getUser('locataire');

      const prop = getProperty(propId);
      if (!prop || prop.agencyId !== agency.id) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('🏠 Propriété introuvable')
              .setDescription('Ce bien ne fait pas partie du catalogue de ton agence.'),
          ],
          ephemeral: true,
        });
      }

      if (prop.tenantId !== locataire.id) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('👤 Locataire incorrect')
              .setDescription(`${locataire} n’est pas locataire de ce bien.`),
          ],
          ephemeral: true,
        });
      }

      // On rompt la location + on wipe le stockage et les clés
      prop.tenantId   = null;
      prop.status     = 'AGENCE_ONLY';
      prop.nextRentTs = null;
      prop.keyholders = [];
      setProperty(prop);
      wipeStorage(prop.id);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('⚠ Locataire expulsé')
            .setDescription(
              `${locataire} a été expulsé de **${prop.name}**.\n\n` +
              `🔐 Il n’a plus accès au coffre de cette propriété et le stockage a été vidé.`
            )
            .setFooter(footer),
        ],
      });
    }

    // ─────────────────────────── /agence givepropriete (STAFF)
    if (sub === 'givepropriete') {
      if (!requireStaff(interaction)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('⛔ Accès refusé')
              .setDescription('Seuls les membres STAFF peuvent donner une propriété d’État.'),
          ],
          ephemeral: true,
        });
      }

      const cible   = interaction.options.getUser('cible');
      const stateId = interaction.options.getString('etat_id');

      const info = findStatePropById(stateId);
      if (!info) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('🏠 Propriété d’État inconnue')
              .setDescription(
                `Aucune propriété d’État trouvée avec l’ID \`${stateId}\`.\n` +
                'Vérifie l’ID dans la documentation interne.'
              ),
          ],
          ephemeral: true,
        });
      }

      if (!isStatePropAvailable(stateId)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe67e22)
              .setTitle('⚠ Déjà attribuée')
              .setDescription(
                `Cette propriété est déjà possédée par une agence ou un joueur.\n` +
                'Elle ne peut pas être donnée une seconde fois tant qu’elle n’est pas libérée.'
              ),
          ],
          ephemeral: true,
        });
      }

      let prop = getProperty(stateId);
      if (!prop) {
        prop = {
          id: stateId,
          name: info.name,
          type: info.category,
          location: info.location,
          status: 'OWNED',
          ownerPlayerId: cible.id,
          tenantId: null,
          landlordId: null,
          rentAmount: null,
          rentEveryDays: 7,
          agencyId: null,
          basePrice: info.basePrice,
          keyholders: [],
          storage: { items: [], weightMax: 120 },
        };
      } else {
        prop.ownerPlayerId = cible.id;
        prop.tenantId      = null;
        prop.landlordId    = null;
        prop.agencyId      = null;
        prop.status        = 'OWNED';
        prop.rentAmount    = null;
        prop.nextRentTs    = null;
        prop.keyholders    = [];
      }

      setProperty(prop);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('✅ Propriété attribuée (STAFF)')
            .setDescription(
              `🏠 **${prop.name}** a été donnée à ${cible}.\n\n` +
              `📍 Localisation : **${prop.location}**\n` +
              `🗂️ Type : **${prop.type}**\n\n` +
              `Cette propriété est désormais **retirée du catalogue de l’État** pour les agences.`
            )
            .setFooter(footer),
        ],
      });
    }
  },
};
