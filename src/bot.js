require('dotenv').config({ path: './id.env' });
const { Client, GatewayIntentBits, Collection, MessageFlags } = require('discord.js');
const fs   = require('fs');
const path = require('path');

// Modules internes
const ticketModule          = require('./ticket.js');
const { handleEconomyCommand } = require('./economy');
const { transformSessions } = require('./transformSessions');
const logger                = require('./logger');
const { getOrCreateAccount, updateAccount } = require('./economyData');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

// IDs depuis .env
const SHOP_OWNER_ID            = process.env.SHOP_OWNER_ID;
const ILLEGAL_SHOP_OWNER_ID    = process.env.ILLEGAL_SHOP_OWNER_ID;
const ILLEGAL_CONTACT_ROLE_ID  = process.env.ILLEGAL_CONTACT_ROLE_ID;

// Boutique légale
const items = {
  tente_amelioree: { name: 'Tente améliorée', price: 45 },
  tente_luxe:      { name: 'Tente de luxe (voyageur)', price: 80 },
  feu_camp:        { name: 'Feu de camp renforcé', price: 18 },
  tapis_sol:       { name: 'Tapis de sol', price: 10 },
  chaises:         { name: 'Chaises et tabourets', price: 12 },
  table_camp:      { name: 'Table de camp', price: 20 },
  drapeaux:        { name: 'Drapeaux personnalisés', price: 15 },
  eclairage:       { name: 'Éclairage (lanternes)', price: 8 }
};

// Boutique illégale
const itemsIllegal = {
  semi_auto_650:               { name: 'Fusil Semi-Automatique', price: 650 },
  mauser_750:                  { name: 'Mauser',               price: 750 },
  double_canon_750:            { name: 'Fusil à Double Canon', price: 750 },
  pompe_550:                   { name: 'Fusil à Pompe',       price: 550 },
  canon_scie_550:              { name: 'Fusil à Canon Scié',   price: 550 },
  semi_auto_450:               { name: 'Fusil Semi-Automatique', price: 450 },
  repetition_350:              { name: 'Fusil à Répétition',  price: 350 },
  carcano_425:                 { name: 'Fusil Carcano',       price: 425 },
  dynamites_250:               { name: 'Dynamites',           price: 250 },
  bouteilles_incendiaires_50:  { name: 'Bouteilles Incendiaires', price: 50 },
  tomahawk_150:                { name: 'Tomahawk',            price: 150 }
};

logger.setClient(client);

// Charge les events
require('./events/welcome.js')(client);
require('./events/levelSystem')(client);
require('./events/missionSystem')(client);
require('./events/maladies')(client);
require('./events/ferrure')(client);
require('./events/armeAbimee')(client);
require('./events/faimSoifSystem')(client);

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const cmd = require(path.join(commandsPath, file));
  client.commands.set(cmd.data.name, cmd);
}

const processedMessageIds = new Set();

client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  // envoi panel ticket
  try {
    const panelChannel = await client.channels.fetch(process.env.ID_DU_CANAL_POUR_TICKET);
    if (panelChannel) await ticketModule.sendTicketPanel(panelChannel);
  } catch {}
});

client.on('interactionCreate', async (interaction) => {
  // 1) Slash commands
  if (interaction.isChatInputCommand()) {
    const cmd = client.commands.get(interaction.commandName);
    if (cmd) {
      try { await cmd.execute(interaction); }
      catch (e) {
        console.error(e);
        if (!interaction.replied)
          await interaction.reply({ content: '❗ Erreur.', flags: MessageFlags.Ephemeral });
      }
    }
    return;
  }

  // 2) Boutique légale
  if (interaction.isStringSelectMenu() && interaction.customId === 'shop_buy') {
    await interaction.deferReply({ ephemeral: true });
    const choice = interaction.values[0], it = items[choice];
    if (!it) return interaction.editReply('❌ Article introuvable.');
    const buyerAcc = getOrCreateAccount(interaction.user.id);
    if (buyerAcc.courant.banque < it.price)
      return interaction.editReply('❌ Fonds insuffisants.');
    // transfert
    buyerAcc.courant.banque -= it.price;
    updateAccount(interaction.user.id, buyerAcc);
    if (SHOP_OWNER_ID) {
      const sellAcc = getOrCreateAccount(SHOP_OWNER_ID);
      sellAcc.courant.banque += it.price;
      updateAccount(SHOP_OWNER_ID, sellAcc);
    }
    return interaction.editReply(`✅ Achat : **${it.name}** pour **$${it.price}**.`);
  }

  // 3) Boutique illégale
  if (interaction.isStringSelectMenu() && interaction.customId === 'shop_illegal_buy') {
    if (!interaction.member.roles.cache.has(ILLEGAL_CONTACT_ROLE_ID)) {
      return interaction.reply({ content: '❌ Rôle contact illégal requis.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: false });
    const choice = interaction.values[0], it = itemsIllegal[choice];
    if (!it) return interaction.editReply('❌ Article introuvable.');
    const buyerAcc = getOrCreateAccount(interaction.user.id);
    if (buyerAcc.courant.banque < it.price)
      return interaction.editReply('❌ Fonds insuffisants.');
    buyerAcc.courant.banque -= it.price;
    updateAccount(interaction.user.id, buyerAcc);
    if (ILLEGAL_SHOP_OWNER_ID) {
      const sellAcc = getOrCreateAccount(ILLEGAL_SHOP_OWNER_ID);
      sellAcc.courant.banque += it.price;
      updateAccount(ILLEGAL_SHOP_OWNER_ID, sellAcc);
    }
    // message PUBLIC
    return interaction.editReply(
      `💰 **${interaction.user.tag}** a acheté **${it.name}** pour **$${it.price}**.`
    );
  }

  // 4) Tickets
  if (
    (interaction.isButton() && ["open_ticket","close_ticket","delete_ticket"].includes(interaction.customId)) ||
    (interaction.isSelectMenu() && interaction.customId === "ticket_type_select")
  ) {
    try { await ticketModule.handleTicketInteraction(interaction); }
    catch (e) {
      console.error(e);
      if (!interaction.replied)
        await interaction.reply({ content: '❗ Erreur ticket.', flags: MessageFlags.Ephemeral });
    }
    return;
  }

  // 5) En ville / déconnecté
  if (interaction.isButton() && ["en_ville","deconnecte"].includes(interaction.customId)) {
    const role = '1378037596566978561', member = interaction.member;
    if (!member.roles.cache.has(role)) {
      try {
        if (interaction.customId==='en_ville') await member.roles.add(role);
        else await member.roles.remove(role);
        await interaction.reply({ content: '✅ Statut mis à jour.', ephemeral: true });
      } catch { /*…*/ }
    }
    return;
  }

  // 6) Stock / autres
  {
    const { handleStockInteractions } = require('./interaction/stockInteraction');
    if (interaction.isButton()||interaction.isSelectMenu()) {
      try { await handleStockInteractions(interaction); }
      catch {
        if (!interaction.replied)
          await interaction.reply({ content: '❗ Erreur.', ephemeral: true });
      }
    }
  }
});

// Commandes texte pour économie
client.on('messageCreate', async (msg) => {
  if (msg.author.bot||!msg.guild) return;
  if (processedMessageIds.has(msg.id)) return;
  processedMessageIds.add(msg.id);
  if (msg.content.startsWith('!')) await handleEconomyCommand(msg);
});

client.login(process.env.BOT_TOKEN);
