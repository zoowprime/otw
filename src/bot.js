// bot.js
require('dotenv').config({ path: './id.env' });
const {
  Client,
  GatewayIntentBits,
  Collection,
  MessageFlags,
  ActivityType,
} = require('discord.js');
const fs   = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────
// Modules internes (conservés)
const ticketModule                           = require('./ticket.js');
const { handleEconomyCommand }               = require('./economy');
const { transformSessions }                  = require('./transformSessions'); // si utilisé ailleurs
const logger                                 = require('./logger');
const { getOrCreateAccount, updateAccount }  = require('./economyData');
// /session (boutons)
const { handleSessionButtons }               = require('./commands/session');
// Agriculture (récolte / transformation / livraison)
const agriRuntime                            = require('./agri/agriRuntime');
// Inventaire (nouveau système : donner/voler via menus)
const { handleInventoryInteractions }        = require('./interaction/inventoryInteraction');

// ─────────────────────────────────────────────────────────────
// IDs pour les boutiques simples (optionnel)
const SHOP_OWNER_ID           = process.env.SHOP_OWNER_ID;
const ILLEGAL_SHOP_OWNER_ID   = process.env.ILLEGAL_SHOP_OWNER_ID;
const ILLEGAL_CONTACT_ROLE_ID = process.env.ILLEGAL_CONTACT_ROLE_ID;

// Articles boutique légale (exemple simple)
const legalItems = {
  tente_amelioree: { name: 'Tente améliorée',          desc: 'Plus grande & résistante', price: 45 },
  tente_luxe:      { name: 'Tente de luxe (voyageur)', desc: 'Repos optimal',            price: 80 },
  feu_camp:        { name: 'Feu de camp renforcé',     desc: 'Cuisiner plus rapidement', price: 18 },
  tapis_sol:       { name: 'Tapis de sol',             desc: 'Confort & esthétique',     price: 10 },
  chaises:         { name: 'Chaises et tabourets',     desc: 'S’asseoir RP',             price: 12 },
  table_camp:      { name: 'Table de camp',            desc: 'Repas & réunions RP',      price: 20 },
  drapeaux:        { name: 'Drapeaux personnalisés',   desc: 'Identité du groupe',       price: 15 },
  eclairage:       { name: 'Éclairage (lanternes)',    desc: 'Lanternes suspendues',     price: 8 }
};

// Articles boutique illégale (exemple simple)
const illegalItems = {
  fusil_semi_auto:     { name: 'Fusil Semi-Automatique',    price: 650 },
  mauser:              { name: 'Mauser',                    price: 750 },
  fusil_double_canon:  { name: 'Fusil à Double Canon',      price: 750 },
  fusil_pompe:         { name: 'Fusil à Pompe',             price: 550 },
  fusil_canon_scie:    { name: 'Fusil à Canon Scié',        price: 550 },
  fusil_semi_auto2:    { name: 'Fusil Semi-Automatique II', price: 450 },
  fusil_repetition:    { name: 'Fusil à Répétition',        price: 350 },
  fusil_carcano:       { name: 'Fusil Carcano',             price: 425 },
  dynamites:           { name: 'Dynamites',                 price: 250 },
  bouteilles_incendie: { name: 'Bouteilles Incendiaires',   price: 50  },
  tomahawk:            { name: 'Tomahawk',                  price: 150 }
};

// ─────────────────────────────────────────────────────────────
// Client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

// Initialise le logger
logger.setClient(client);

// ─────────────────────────────────────────────────────────────
// Événements globaux conservés
require('./events/welcome.js')(client);
require('./events/levelSystem')(client);
require('./events/missionSystem')(client);
require('./events/maladies')(client);
require('./events/ferrure')(client);
require('./events/armeAbimee')(client);
require('./events/faimSoifSystem')(client);
require('./events/raidProtect')(client);
require('./events/qcmNoCmd')(client);
require('./events/heistSessions')(client);
require('./events/candidature')(client);
require('./events/starterPack')(client);
require('./events/passiveRevenue')(client);
require('./events/trainMerch')(client);

// ─────────────────────────────────────────────────────────────
// ❌ Nettoyage : on supprime les anciens systèmes (catalogues Kinuma/Hockley/stockInteraction)
// (donc PAS de require('./events/catalogueWeapons'), './events/kinumaStable', './events/hockleyStable')

// ─────────────────────────────────────────────────────────────
// Chargement des commandes slash
client.commands = new Collection();
const commandsPath  = path.join(__dirname, 'commands');
const commandFiles  = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const cmd = require(path.join(commandsPath, file));
  if (cmd.data && cmd.execute) client.commands.set(cmd.data.name, cmd);
}

// ─────────────────────────────────────────────────────────────
// Prévenir les doublons de messages texte
const processedMessageIds = new Set();

// ─────────────────────────────────────────────────────────────
// Démarrage
client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  logger.sendLog(`✅ Connecté en tant que ${client.user.tag}`);

  // Statut d’activité configurable (env: BOT_ACTIVITY_TEXT, BOT_ACTIVITY_TYPE)
  const activityText = process.env.BOT_ACTIVITY_TEXT || 'Old Town Western V.3';
  const activityTypeEnv = (process.env.BOT_ACTIVITY_TYPE || 'PLAYING').toUpperCase();
  const activityType =
    activityTypeEnv === 'WATCHING'  ? ActivityType.Watching  :
    activityTypeEnv === 'LISTENING' ? ActivityType.Listening :
    activityTypeEnv === 'COMPETING' ? ActivityType.Competing :
    ActivityType.Playing;

  try {
    client.user.setPresence({
      activities: [{ name: activityText, type: activityType }],
      status: 'online',
    });
    logger.sendLog(`🎮 Activité définie: ${activityTypeEnv} ${activityText}`);
  } catch (e) {
    console.error('Erreur setPresence:', e);
    logger.sendError(e);
  }

  // Branche le runtime agriculture (timers, updates)
  agriRuntime.setClient(client);

  // Debug /data
  try {
    const files = fs.readdirSync('/data');
    console.log('Contenu de /data :', files);
    logger.sendLog(`Contenu de /data : ${files.join(', ')}`);
  } catch (err) {
    console.error('Erreur listing /data :', err);
    logger.sendError(err);
  }

  // Panel de ticket
  const panelChannelId = process.env.ID_DU_CANAL_POUR_TICKET;
  try {
    const panelChannel = await client.channels.fetch(panelChannelId);
    if (panelChannel && typeof ticketModule.sendTicketPanel === 'function') {
      await ticketModule.sendTicketPanel(panelChannel);
      console.log('🎟️ Panel de ticket envoyé.');
      logger.sendLog('🎟️ Panel de ticket envoyé.');
    }
  } catch (err) {
    console.error('Erreur envoi panel ticket :', err);
    logger.sendError(err);
  }
});

// ─────────────────────────────────────────────────────────────
// Gestion des interactions
client.on('interactionCreate', async interaction => {
  console.log('Interaction reçue:', interaction.customId || interaction.commandName);
  logger.sendLog(`Interaction: ${interaction.customId || interaction.commandName}`);

  // Slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error('Erreur slash:', err);
      logger.sendError(err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❗ Une erreur est survenue.',
          flags: MessageFlags.Ephemeral
        }).catch(() => {});
      }
    }
    return;
  }

  // Boutons de /session
  try {
    await handleSessionButtons(interaction);
  } catch {
    // noop
  }

  // Boutique légale (menus)
  if (interaction.isStringSelectMenu() && interaction.customId === 'shop_buy') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const key = interaction.values[0], it = legalItems[key];
    if (!it) return interaction.editReply('❌ Article introuvable.');
    const buyerId = interaction.user.id;
    const buyer   = getOrCreateAccount(buyerId);
    if ((buyer.courant?.banque ?? 0) < it.price) {
      return interaction.editReply('❌ Fonds insuffisants.');
    }
    buyer.courant.banque -= it.price;
    updateAccount(buyerId, buyer);
    if (SHOP_OWNER_ID) {
      const seller = getOrCreateAccount(SHOP_OWNER_ID);
      seller.courant.banque += it.price;
      updateAccount(SHOP_OWNER_ID, seller);
    }
    return interaction.editReply(`✅ Vous avez acheté **${it.name}** pour **$${it.price}**.`);
  }

  // Boutique illégale (menus)
  if (interaction.isStringSelectMenu() && interaction.customId === 'shop_illegal_buy') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!interaction.member.roles.cache.has(ILLEGAL_CONTACT_ROLE_ID)) {
      return interaction.editReply('❌ Vous n’êtes pas contact illégal.');
    }
    const key = interaction.values[0], it = illegalItems[key];
    if (!it) return interaction.editReply('❌ Article introuvable.');
    const buyerId = interaction.user.id;
    const buyer   = getOrCreateAccount(buyerId);
    if ((buyer.courant?.banque ?? 0) < it.price) {
      return interaction.editReply('❌ Fonds insuffisants.');
    }
    buyer.courant.banque -= it.price;
    updateAccount(buyerId, buyer);
    if (ILLEGAL_SHOP_OWNER_ID) {
      const seller = getOrCreateAccount(ILLEGAL_SHOP_OWNER_ID);
      seller.courant.banque += it.price;
      updateAccount(ILLEGAL_SHOP_OWNER_ID, seller);
    }
    await interaction.editReply(`🤝 ${interaction.user} a acheté **${it.name}** pour **$${it.price}**.`);
    await interaction.followUp({
      content: `💵 Transféré à <@${ILLEGAL_SHOP_OWNER_ID}>.`,
      allowedMentions: { users: [] }
    });
    return;
  }

  // Inventaire (nouveau système : donner/voler via menus)
  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    try {
      await handleInventoryInteractions(interaction);
    } catch (err) {
      console.error('Erreur inventaire:', err);
      logger.sendError(err);
      if (!interaction.replied) {
        await interaction.reply({ content: '❗ Erreur.', flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  }
});

// ─────────────────────────────────────────────────────────────
// Commandes texte (économie)
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;
  if (processedMessageIds.has(message.id)) return;
  processedMessageIds.add(message.id);

  console.log(`📩 Msg reçu: "${message.content}"`);
  logger.sendLog(`📩 Msg reçu: "${message.content}"`);

  if (message.content.startsWith('!')) {
    await handleEconomyCommand(message);
  }
});

// ─────────────────────────────────────────────────────────────
// Anti-crash doux (utile sur Render worker)
process.on('unhandledRejection', (err) => {
  console.error('UnhandledRejection:', err);
  logger.sendError(err);
});
process.on('uncaughtException', (err) => {
  console.error('UncaughtException:', err);
  logger.sendError(err);
});

// ─────────────────────────────────────────────────────────────
client.login(process.env.BOT_TOKEN);
