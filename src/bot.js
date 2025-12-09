// src/bot.js
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
// Modules internes
const ticketModule                           = require('./ticket.js');
const { handleEconomyCommand }               = require('./economy');
const { transformSessions }                  = require('./transformSessions'); // si utilisé ailleurs
const logger                                 = require('./logger');
const { getOrCreateAccount, updateAccount }  = require('./economyData');
// /session (boutons)
const { handleSessionButtons }               = require('./commands/session');

// Nouveau système d'inventaire (utilisé pour ajouter un objet après un achat légal)
const { addItem }                            = require('./data/inventoryStore');
const { resolveItemId }                      = require('./data/itemNameResolver');

// ─────────────────────────────────────────────────────────────
// IDs pour la boutique LÉGALE (optionnel)
const SHOP_OWNER_ID = process.env.SHOP_OWNER_ID;

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
// Événements globaux
require('./events/welcome.js')(client);
require('./events/levelSystem')(client);
require('./events/missionSystem')(client);
require('./events/ferrure')(client);
require('./events/armeAbimee')(client);
require('./events/raidProtect')(client);
require('./events/qcmNoCmd')(client);
require('./events/heistSessions')(client);
require('./events/candidature')(client);
require('./events/starterPack')(client);
require('./events/passiveRevenue')(client);
require('./events/trainMerch')(client);
require('./events/guildMemberUpdate.js')(client);

// ─────────────────────────────────────────────────────────────
// Chargement des commandes slash
client.commands = new Collection();
const commandsPath  = path.join(__dirname, 'commands');
const commandFiles  = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const full = path.join(commandsPath, file);
  try {
    const cmd = require(full);
    if (cmd?.data && cmd?.execute) {
      client.commands.set(cmd.data.name, cmd);
    }
  } catch (e) {
    console.error(`Erreur au chargement de ${file}:`, e);
    logger.sendError(e);
  }
}

// ─────────────────────────────────────────────────────────────
// Prévenir les doublons de messages texte
const processedMessageIds = new Set();

// ─────────────────────────────────────────────────────────────
// Démarrage
client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  logger.sendLog(`✅ Connecté en tant que ${client.user.tag}`);

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
  if (panelChannelId) {
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
  }
});

// ─────────────────────────────────────────────────────────────
// Gestion des interactions
client.on('interactionCreate', async (interaction) => {
  // 1) Router d’abord le système de tickets (évite l’échec d’interaction)
  try {
    await ticketModule.handleTicketInteraction(interaction);
  } catch (e) {
    // on ignore si ce n’est pas une interaction de ticket
  }

  // 2) Slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error('Erreur slash:', err);
      logger.sendError(err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❗ Une erreur est survenue.', flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
    return;
  }

  // 3) Boutons de /session
  try {
    await handleSessionButtons(interaction);
  } catch {
    // noop
  }

  // 4) Boutique légale (menus)
  if (interaction.isStringSelectMenu() && interaction.customId === 'shop_buy') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const key = interaction.values[0], it = legalItems[key];
    if (!it) return interaction.editReply('❌ Article introuvable.');
    const buyerId = interaction.user.id;
    const buyer   = getOrCreateAccount(buyerId);
    if ((buyer.courant?.banque ?? 0) < it.price) {
      return interaction.editReply('❌ Fonds insuffisants.');
    }
    // paiement
    buyer.courant.banque -= it.price;
    updateAccount(buyerId, buyer);
    if (SHOP_OWNER_ID) {
      const seller = getOrCreateAccount(SHOP_OWNER_ID);
      seller.courant.banque += it.price;
      updateAccount(SHOP_OWNER_ID, seller);
    }
    // ajout inventaire si résolvable
    const maybeId = resolveItemId(it.name);
    const added = addItem(buyerId, maybeId, 1);
    const suffix = added?.ok ? `\n🎒 L’objet a été ajouté à votre sacoche.` : '';
    return interaction.editReply(`✅ Vous avez acheté **${it.name}** pour **$${it.price}**.${suffix}`);
  }
});

// ─────────────────────────────────────────────────────────────
// Commandes texte (économie)
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;
  if (processedMessageIds.has(message.id)) return;
  processedMessageIds.add(message.id);

  try {
    console.log(`📩 Msg reçu: "${message.content}"`);
    logger.sendLog(`📩 Msg reçu: "${message.content}"`);
  } catch {}

  if (message.content.startsWith('!')) {
    await handleEconomyCommand(message);
  }
});

// ─────────────────────────────────────────────────────────────
// Anti-crash doux
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

