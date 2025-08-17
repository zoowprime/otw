require('dotenv').config({ path: './id.env' });
const { Client, GatewayIntentBits, Collection, MessageFlags } = require('discord.js');
const fs   = require('fs');
const path = require('path');

// Modules internes
const ticketModule                 = require('./ticket.js');
const { handleEconomyCommand }     = require('./economy');
const { transformSessions }        = require('./transformSessions');
const logger                       = require('./logger');
const { getOrCreateAccount, updateAccount } = require('./economyData');
// ⬇️ /session
const { handleSessionButtons }     = require('./commands/session');
// ⬇️ Agriculture (récolte / transformation / livraison)
const agriRuntime                  = require('./agri/agriRuntime');

// IDs pour les boutiques
const SHOP_OWNER_ID           = process.env.SHOP_OWNER_ID;
const ILLEGAL_SHOP_OWNER_ID   = process.env.ILLEGAL_SHOP_OWNER_ID;
const ILLEGAL_CONTACT_ROLE_ID = process.env.ILLEGAL_CONTACT_ROLE_ID;

// Articles boutique légale
const legalItems = {
  tente_amelioree: { name: 'Tente améliorée',         desc: 'Plus grande & résistante', price: 45 },
  tente_luxe:      { name: 'Tente de luxe (voyageur)', desc: 'Repos optimal',            price: 80 },
  feu_camp:        { name: 'Feu de camp renforcé',     desc: 'Cuisiner plus rapidement', price: 18 },
  tapis_sol:       { name: 'Tapis de sol',             desc: 'Confort & esthétique',     price: 10 },
  chaises:         { name: 'Chaises et tabourets',     desc: 'S’asseoir RP',             price: 12 },
  table_camp:      { name: 'Table de camp',            desc: 'Repas & réunions RP',      price: 20 },
  drapeaux:        { name: 'Drapeaux personnalisés',   desc: 'Identité du groupe',       price: 15 },
  eclairage:       { name: 'Éclairage (lanternes)',    desc: 'Lanternes suspendues',     price: 8 }
};

// Articles boutique illégale
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

// Événements globaux
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

// Catalogues / panneaux
require('./events/catalogueWeapons')(client);   // armes
require('./events/kinumaStable')(client);       // chevaux

// Chargement des commandes slash
client.commands = new Collection();
const commandsPath  = path.join(__dirname, 'commands');
const commandFiles  = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const cmd = require(path.join(commandsPath, file));
  if (cmd.data && cmd.execute) client.commands.set(cmd.data.name, cmd);
}

// Prévenir les doublons de messages texte
const processedMessageIds = new Set();

// Au démarrage
client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  logger.sendLog(`✅ Connecté en tant que ${client.user.tag}`);

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

// Gestion des interactions
client.on('interactionCreate', async interaction => {
  console.log('Interaction reçue:', interaction.customId || interaction.commandName);
  logger.sendLog(`Interaction: ${interaction.customId || interaction.commandName}`);

  // 1️⃣ Slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error('Erreur slash:', err);
      logger.sendError(err);
      await interaction.reply({
        content: '❗ Une erreur est survenue.',
        flags: MessageFlags.Ephemeral
      });
    }
    return;
  }

  // ✅ Boutons de /session
  try {
    await handleSessionButtons(interaction);
  } catch (e) {
    // noop
  }

  // 2️⃣ Boutique légale
  if (interaction.isStringSelectMenu() && interaction.customId === 'shop_buy') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const key = interaction.values[0], it = legalItems[key];
    if (!it) return interaction.editReply('❌ Article introuvable.');
    const buyerId = interaction.user.id;
    const buyer   = getOrCreateAccount(buyerId);
    if (buyer.courant.banque < it.price) {
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

  // 3️⃣ Boutique illégale (customId corrigé)
  if (interaction.isStringSelectMenu() && interaction.customId === 'shop_illegal_buy') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!interaction.member.roles.cache.has(ILLEGAL_CONTACT_ROLE_ID)) {
      return interaction.editReply('❌ Vous n’êtes pas contact illégal.');
    }
    const key = interaction.values[0], it = illegalItems[key];
    if (!it) return interaction.editReply('❌ Article introuvable.');
    const buyerId = interaction.user.id;
    const buyer   = getOrCreateAccount(buyerId);
    if (buyer.courant.banque < it.price) {
      return interaction.editReply('❌ Fonds insuffisants.');
    }
    buyer.courant.banque -= it.price;
    updateAccount(buyerId, buyer);
    if (ILLEGAL_SHOP_OWNER_ID) {
      const seller = getOrCreateAccount(ILLEGAL_SHOP_OWNER_ID);
      seller.courant.banque += it.price;
      updateAccount(ILLEGAL_SHOP_OWNER_ID, seller);
    }
    // message public
    await interaction.editReply(`🤝 ${interaction.user} a acheté **${it.name}** pour **$${it.price}**.`);
    await interaction.followUp({
      content: `💵 Transféré à <@${ILLEGAL_SHOP_OWNER_ID}>.`,
      allowedMentions: { users: [] }
    });
    return;
  }

  // 4️⃣ Tickets
  if (
    (interaction.isStringSelectMenu() && interaction.customId === 'ticket_reason_select') ||
    (interaction.isButton() && ['close_ticket','reopen_ticket','delete_ticket'].includes(interaction.customId))
  ) {
    try {
      await ticketModule.handleTicketInteraction(interaction);
    } catch (err) {
      console.error('Erreur ticket:', err);
      logger.sendError(err);
      if (!interaction.replied) {
        await interaction.reply({
          content: '❗ Erreur.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
    return;
  }

  // 5️⃣ En ville / Déconnecté
  if (interaction.isButton() && ['en_ville','deconnecte'].includes(interaction.customId)) {
    const role   = interaction.guild.roles.cache.get('1378037596566978561');
    const member = interaction.member;
    if (!role || !member) return;
    try {
      if (interaction.customId === 'en_ville') {
        await member.roles.add(role);
      } else {
        await member.roles.remove(role);
      }
      await interaction.reply({
        content: '✅ Statut mis à jour.',
        flags: MessageFlags.Ephemeral
      });
    } catch (err) {
      console.error('Erreur rôle ville:', err);
      logger.sendError(err);
      if (!interaction.replied) {
        await interaction.reply({
          content: '❗ Erreur.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
    return;
  }

  // 6️⃣ Autres interactions (stocks, etc.)
  {
    // Armes
    const { handleStockInteractions } = require('./interaction/stockInteraction');
    // Chevaux
    const { handleHorseStockInteractions } = require('./interaction/horseStockInteraction');

    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      // Armes
      try {
        await handleStockInteractions(interaction);
      } catch (err) {
        console.error('Erreur stock (armes):', err);
        logger.sendError(err);
        if (!interaction.replied) {
          await interaction.reply({ content: '❗ Erreur.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
      }
      // Chevaux
      try {
        await handleHorseStockInteractions(interaction);
      } catch (err) {
        console.error('Erreur stock (chevaux):', err);
        logger.sendError(err);
        if (!interaction.replied) {
          await interaction.reply({ content: '❗ Erreur.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
      }
    }
  }
});

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

client.login(process.env.BOT_TOKEN);
