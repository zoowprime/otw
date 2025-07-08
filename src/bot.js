require('dotenv').config({ path: './id.env' });
const { Client, GatewayIntentBits, Collection, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Modules internes
const ticketModule             = require('./ticket.js');
const { handleEconomyCommand } = require('./economy');
const { transformSessions }    = require('./transformSessions');
const logger                   = require('./logger');
const { getOrCreateAccount, updateAccount } = require('./economyData');

// Pour la boutique légale
const SHOP_OWNER_ID = process.env.SHOP_OWNER_ID;
// Nouveautés : boutique illégale
const ILLEGAL_SHOP_OWNER_ID   = process.env.ILLEGAL_SHOP_OWNER_ID;
const ILLEGAL_CONTACT_ROLE_ID = process.env.ILLEGAL_CONTACT_ROLE_ID;

// Définition des articles de la boutique légale
const items = {
  tente_amelioree: { name: 'Tente améliorée', desc: 'Tente plus grande et plus résistante contre les intempéries', price: 45 },
  tente_luxe:      { name: 'Tente de luxe (voyageur)', desc: 'Confort supérieur pour un repos optimal', price: 80 },
  feu_camp:        { name: 'Feu de camp renforcé', desc: 'Plus grand foyer permettant de cuisiner plus rapidement', price: 18 },
  tapis_sol:       { name: 'Tapis de sol', desc: 'Tapis pour plus de confort et d’esthétique', price: 10 },
  chaises:         { name: 'Chaises et tabourets', desc: 'Permet aux membres du camp de s’asseoir RP', price: 12 },
  table_camp:      { name: 'Table de camp', desc: 'Permet les repas communs ou réunions RP', price: 20 },
  drapeaux:        { name: 'Drapeaux personnalisés', desc: 'Bannières RP indiquant l’identité du groupe', price: 15 },
  eclairage:       { name: 'Éclairage (lanternes)', desc: 'Ajoute des lanternes suspendues et fixes', price: 8 }
};

// Nouveaux articles de la boutique illégale
const itemsIllegal = {
  semi_auto_650:              { name: 'Fusil Semi-Automatique',       price: 650 },
  mauser_750:                 { name: 'Mauser',                        price: 750 },
  double_canon_750:           { name: 'Fusil à Double Canon',          price: 750 },
  pompe_550:                  { name: 'Fusil à Pompe',                 price: 550 },
  canon_scie_550:             { name: 'Fusil à Canon Scié',             price: 550 },
  semi_auto_450:              { name: 'Fusil Semi-Automatique',       price: 450 },
  repetition_350:             { name: 'Fusil à Répétition',           price: 350 },
  carcano_425:                { name: 'Fusil Carcano',                price: 425 },
  dynamites_250:              { name: 'Dynamites',                    price: 250 },
  bouteilles_incendiaires_50: { name: 'Bouteilles Incendiaires',      price: 50  },
  tomahawk_150:               { name: 'Tomahawk',                     price: 150 }
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

// Initialise le logger avec le client
logger.setClient(client);

// Chargement des événements globaux
require('./events/welcome.js')(client);
require('./events/levelSystem')(client);
require('./events/missionSystem')(client);
require('./events/maladies')(client);
require('./events/ferrure')(client);
require('./events/armeAbimee')(client);
require('./events/faimSoifSystem')(client);

// Chargement des commandes slash
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

// Set pour éviter les doublons de messages texte
const processedMessageIds = new Set();

// Événement : démarrage du bot
client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  logger.sendLog(`✅ Connecté en tant que ${client.user.tag}`);

  // Inspecte /data
  try {
    const files = fs.readdirSync('/data');
    console.log('Contenu de /data :', files);
    logger.sendLog(`Contenu de /data : ${files.join(', ')}`);
  } catch (err) {
    console.error('Erreur en listant /data :', err);
    logger.sendError(err);
  }

  // Envoi du panel ticket
  const panelChannelId = process.env.ID_DU_CANAL_POUR_TICKET;
  if (panelChannelId) {
    try {
      const panelChannel = await client.channels.fetch(panelChannelId);
      if (panelChannel && typeof ticketModule.sendTicketPanel === 'function') {
        await ticketModule.sendTicketPanel(panelChannel);
        console.log("🎟️ Panel de ticket envoyé.");
        logger.sendLog("🎟️ Panel de ticket envoyé.");
      }
    } catch (error) {
      console.error("Erreur panel ticket :", error);
      logger.sendError(error);
    }
  }
});

// Interaction handler
client.on('interactionCreate', async (interaction) => {
  console.log("Interaction reçue:", interaction.customId || interaction.commandName);
  logger.sendLog(`Interaction reçue: ${interaction.customId || interaction.commandName}`);

  // 1️⃣ Slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error("Erreur commande slash :", error);
      logger.sendError(error);
      await interaction.reply({
        content: '❗ Une erreur est survenue.',
        flags: MessageFlags.Ephemeral
      });
    }
    return;
  }

  // 2️⃣ Boutique – menu déroulant d’achat (légale)
  if (interaction.isStringSelectMenu() && interaction.customId === 'shop_buy') {
    await interaction.deferReply({ ephemeral: true });
    const choice = interaction.values[0];
    const it     = items[choice];
    if (!it) return interaction.editReply('❌ Article introuvable.');

    const buyerAcc = getOrCreateAccount(interaction.user.id);
    if (buyerAcc.courant.banque < it.price) {
      return interaction.editReply('❌ Fonds insuffisants.');
    }
    buyerAcc.courant.banque -= it.price;
    updateAccount(interaction.user.id, buyerAcc);

    if (SHOP_OWNER_ID) {
      const sellAcc = getOrCreateAccount(SHOP_OWNER_ID);
      sellAcc.courant.banque += it.price;
      updateAccount(SHOP_OWNER_ID, sellAcc);
    }

    return interaction.editReply(`✅ Vous avez acheté **${it.name}** pour **$${it.price}**.`);
  }

  // 3️⃣ Boutique illégale – menu déroulant d’achat (nouveauté)
  if (interaction.isStringSelectMenu() && interaction.customId === 'shop_illegal_buy') {
    // Vérifie le rôle contact illégal
    if (!interaction.member.roles.cache.has(ILLEGAL_CONTACT_ROLE_ID)) {
      return interaction.reply({
        content: '❌ Vous n’avez pas le rôle **contact illégal**.',
        ephemeral: true
      });
    }
    await interaction.deferReply({ ephemeral: false });
    const choice = interaction.values[0];
    const it     = itemsIllegal[choice];
    if (!it) {
      return interaction.editReply('❌ Article introuvable.');
    }

    const buyerAcc = getOrCreateAccount(interaction.user.id);
    if (buyerAcc.courant.banque < it.price) {
      return interaction.editReply('❌ Fonds insuffisants.');
    }
    buyerAcc.courant.banque -= it.price;
    updateAccount(interaction.user.id, buyerAcc);

    if (ILLEGAL_SHOP_OWNER_ID) {
      const sellAcc = getOrCreateAccount(ILLEGAL_SHOP_OWNER_ID);
      sellAcc.courant.banque += it.price;
      updateAccount(ILLEGAL_SHOP_OWNER_ID, sellAcc);
    }

    // Message PUBLIC pour preuve d’achat
    return interaction.editReply(
      `💰 **${interaction.user.tag}** a acheté **${it.name}** pour **$${it.price}**.`
    );
  }

  // 4️⃣ Interactions Ticket
  if (
    (interaction.isButton() && ["open_ticket","close_ticket","delete_ticket"].includes(interaction.customId)) ||
    (interaction.isSelectMenu() && interaction.customId === "ticket_type_select")
  ) {
    try {
      await ticketModule.handleTicketInteraction(interaction);
    } catch (error) {
      console.error("Erreur ticket :", error);
      logger.sendError(error);
      if (!interaction.replied) {
        await interaction.reply({ content: '❗ Erreur interaction ticket.', flags: MessageFlags.Ephemeral });
      }
    }
    return;
  }

  // 5️⃣ Boutons "en ville" / "déconnecté"
  if (interaction.isButton() && ["en_ville","deconnecte"].includes(interaction.customId)) {
    const role   = interaction.guild.roles.cache.get('1378037596566978561');
    const member = interaction.member;
    if (!role || !member) return;
    try {
      if (interaction.customId === 'en_ville') {
        await member.roles.add(role);
        await interaction.reply({ content: `✅ ${member} est en ville.`, ephemeral: true });
      } else {
        await member.roles.remove(role);
        await interaction.reply({ content: `❌ ${member} est hors ligne.`, ephemeral: true });
      }
    } catch (err) {
      console.error('Erreur rôle ville :', err);
      logger.sendError(err);
      if (!interaction.replied) {
        await interaction.reply({ content: '❗ Erreur.', ephemeral: true });
      }
    }
    return;
  }

  // 6️⃣ Stock / autres interactions
  const { handleStockInteractions } = require('./interaction/stockInteraction');
  if (interaction.isButton() || interaction.isSelectMenu()) {
    if (handleStockInteractions) {
      try {
        await handleStockInteractions(interaction);
      } catch (error) {
        console.error('Erreur stock:', error);
        logger.sendError(error);
        if (!interaction.replied) {
          await interaction.reply({ content: '❗ Erreur.', ephemeral: true });
        }
      }
    }
    return;
  }
});

// Commandes texte (économie avec "!")
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (processedMessageIds.has(message.id)) return;
  processedMessageIds.add(message.id);

  console.log(`📩 Message reçu: ${message.content}`);
  logger.sendLog(`📩 Message reçu: ${message.content}`);

  if (message.content.startsWith('!')) {
    await handleEconomyCommand(message);
  }
});

// Connexion
client.login(process.env.BOT_TOKEN);
