// src/events/trainMerch.js
require('dotenv').config({ path: './id.env' });
const {
  EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder, MessageFlags
} = require('discord.js');
const { getOrCreateAccount, updateAccount } = require('../economyData');
const { addItem, getSummaryLines } = require('../interaction/trainStock');

const CHEVAL_MARCHANDISE_CHANNEL = process.env.CHEVAL_MARCHANDISE_CHANNEL;
const ARME_MARCHANDISE_CHANNEL   = process.env.ARME_MARCHANDISE_CHANNEL;
const COMMANDE_CHANNEL           = process.env.COMMANDE_CHANNEL;

// ------- Catalogues & prix (valeur = affichage + prix $) -------

const HORSES = [
  // American Paint (Achat en ranch)
  ['American Paint — Tobiano', 35],
  ['American Paint — Overo', 35],
  ['American Paint — Balzane', 40],
  ['American Paint — Overo Gris', 45],
  // Appaloosa (Achat en ranch)
  ['Appaloosa — Capé Léopard', 35],
  ['Appaloosa — Capée', 35],
  ['Appaloosa — Léopard', 45],
  ['Appaloosa — Léopard Brun', 45],
  // Hollandais à Sang Chaud (Importation)
  ['Hollandais SC — Isabelle Sooty', 60],
  ['Hollandais SC — Noir Pangaré', 60],
  ['Hollandais SC — Rouan Chocolat', 65],
  // Chevaux de Guerre — Ardennais (Achat en ranch)
  ['Ardennais — Bai Rouanné', 50],
  ['Ardennais — Rouan Fraise', 50],
  // Chevaux de Guerre — Andalou (Élevage)
  ['Andalou — Bai Brun', 55],
  ['Andalou — Alezan Grisonnant', 55],
  ['Andalou — Perlino', 55],
  // Demi-Sang Hongrois (Achat en ranch)
  ['Demi-Sang Hongrois — Alezan Crins Lavés', 45],
  ['Demi-Sang Hongrois — Pie Tobiano', 45],
  // Mustang (Achat en ranch)
  ['Mustang — Bai Sauvage', 20],
  ['Mustang — Grullo', 20],
  ['Mustang — Bai Tigré', 25],
  ['Mustang — Isabelle', 80],
  ['Mustang — Tovero Alezan', 80],
  ['Mustang — Overo Alezan Dun', 85],
  ['Mustang — Overo Noir', 90],
  // Chevaux Polyvalents (Importation)
  ['Polyvalent — Pinto Pommelé Silver', 150],
  ['Polyvalent — Champagne Ambre', 150],
  ['Polyvalent — Tovero Noir', 200],
  ['Polyvalent — Gris Pommelé', 220],
  ['Polyvalent — Isabelle Isabelle Bringé', 220],
  ['Polyvalent — Noir Rouanné', 220],
  // Breton (Achat en ranch)
  ['Breton — Oseille', 25],
  ['Breton — Rubican', 25],
  ['Breton — Grullo', 80],
  ['Breton — Pangaré', 80],
  ['Breton — Bai Pommelé Pangaré', 220],
  ['Breton — Gris Fer', 220],
  // Turkoman (Importation)
  ['Turkoman — Bai Brun', 200],
  ['Turkoman — Argenté', 220],
  ['Turkoman — Doré', 220],
  ['Turkoman — Alzane', 250],
  ['Turkoman — Gris', 250],
  ['Turkoman — Noir', 270],
  ['Turkoman — Perlino', 250],
  // Criollo (Élevage)
  ['Criollo — Dun', 20],
  ['Criollo — Noir Rouanné', 20],
  ['Criollo — Bai Bringé', 80],
  ['Criollo — Overo Oseille', 80],
  ['Criollo — Frame Overo', 220],
  ['Criollo — Sabino Marmoré', 220],
  // Cob Gypsy Pie (Achat en ranch)
  ['Cob Gypsy Pie — Cheval du Kentucky', 30],
  ['Cob Gypsy Pie — Cheval Morgan', 30],
  ['Cob Gypsy Pie — Cheval Tennessee Walker', 25],
  // Chevaux de Trait (Élevage)
  ['Trait — Cheval Belge', 55],
  ['Trait — Cheval Shire', 55],
  ['Trait — Cheval Suffolk Punch', 50],
  ['Trait — Pie', 25],
  ['Trait — Blagdon Blanc', 25],
  ['Trait — Skewbald', 80],
  ['Trait — Blagdon Palomino', 80],
  ['Trait — Bai Balzan', 220],
  ['Trait — Pie Balzan', 220],
  // Chevaux de Course (Importation)
  ['Course — Noir Rouanné', 65],
  ['Course — Rouan Blanc', 65],
  ['Course — Rouan Pommelé Inversé', 65],
  // Pur-Sang
  ['Pur-Sang — Bai Acajou', 90],
  ['Pur-Sang — Bringée', 90],
  ['Pur-Sang — Gris Pommelé', 90],
  // Trotteur Américain
  ['Trotteur Américain — Isabelle', 90],
  ['Trotteur Américain — Noir', 90],
  ['Trotteur Américain — Palomino Pommelé', 90],
  ['Trotteur Américain — Isabelle Queue Argentée', 90],
  ['Trotteur Américain — Gris Pommelé Foncé', 55],
  // Pur-Sang Arabe (Importation)
  ['Pur-Sang Arabe — Noir', 300],
  ['Pur-Sang Arabe — Blanc', 280],
  ['Pur-Sang Arabe — Rouge', 250],
  // Charettes (Importation)
  ['Charette — Chasseur de prime', 300],
  ['Charette — Charette de commerce', 180],
];

const WEAPONS = [
  // Armes à feu
  ['Cattleman Revolver', 18.50],
  ['Navy Revolver', 18.00],
  ['Double Action Revolver', 19.00],
  ['Schofield Revolver', 20.50],
  ['Lemat Revolver', 25.25],
  ['Volcanic Pistol', 18.50],
  ['Litchfield Rifle', 26.25],
  ['Evans Rifle', 32.25],
  ['Lancaster Rifle', 32.25],
  ['Carabine à Répétition', 32.25],
  ['Fusil à Petit Gibier', 15.25],
  ['Fusil Springfield', 19.75],
  ['Fusil à Verrou', 26.25],
  // Jet & distance
  ['Couteau de Lancer', 2.50],
  ['Lasso', 1.50],
  ['Arc', 4.50],
  ['Arc Amélioré', 7.50],
  // Blanches
  ['Couteau', 3.00],
  ['Cisaille', 2.50],
  ['Couteau de Chasse', 4.50],
  ['Couteau en Os', 3.50],
  ['Marteau', 3.00],
  ['Hachette', 4.00],
  ['Hache', 5.00],
  ['Machette', 4.50],
];

// ---- helpers ----
function chunk(arr, n=25) {
  const out = [];
  for (let i=0;i<arr.length;i+=n) out.push(arr.slice(i, i+n));
  return out;
}
function debitEntrepriseLiquide(userId, amount) {
  const acc = getOrCreateAccount(userId);
  acc.entreprise = acc.entreprise || { liquide: 0, banque: 0 };
  if ((acc.entreprise.liquide ?? 0) < amount) return false;
  acc.entreprise.liquide -= amount;
  updateAccount(userId, acc);
  return true;
}

async function sendOrGetPanel(channel, title, desc, customPrefix, items) {
  // Évite doublons : si un message avec le titre existe déjà, on ne renvoie pas
  const recent = await channel.messages.fetch({ limit: 50 }).catch(()=>null);
  if (recent && Array.from(recent.values()).some(m => m.embeds?.[0]?.title === title)) return;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(0x5865F2);

  const chunks = chunk(items, 25);
  const rows = chunks.map((c, idx) => {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`${customPrefix}:${idx+1}`) // unique par rangée
      .setPlaceholder(`Sélection page ${idx+1}`);
    c.forEach(([label, price]) => {
      menu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(label.slice(0, 100))
          .setValue(label) // valeur = nom
          .setDescription(`$${price}`)
      );
    });
    return new ActionRowBuilder().addComponents(menu);
  });

  await channel.send({ embeds: [embed], components: rows });
}

module.exports = (client) => {
  client.once('ready', async () => {
    // Panneau CHEVAUX
    if (CHEVAL_MARCHANDISE_CHANNEL) {
      const ch = await client.channels.fetch(CHEVAL_MARCHANDISE_CHANNEL).catch(()=>null);
      if (ch && ch.isTextBased()) {
        await sendOrGetPanel(
          ch,
          '🐎 Commandes — Chevaux (Train Tetsuryu Freight Co.)',
          'Sélectionnez un cheval à commander. Le montant est débité de **votre compte ENTREPRISE (liquide)**, puis ajouté au **stock du train**.',
          'train_order_horse',
          HORSES
        );
      }
    }
    // Panneau ARMES
    if (ARME_MARCHANDISE_CHANNEL) {
      const ch2 = await client.channels.fetch(ARME_MARCHANDISE_CHANNEL).catch(()=>null);
      if (ch2 && ch2.isTextBased()) {
        await sendOrGetPanel(
          ch2,
          '🔫 Commandes — Armes (Train Tetsuryu Freight Co.)',
          'Sélectionnez une arme à commander. Le montant est débité de **votre compte ENTREPRISE (liquide)**, puis ajouté au **stock du train**.',
          'train_order_weapon',
          WEAPONS
        );
      }
    }
  });

  // Sélections
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    const [prefix] = interaction.customId.split(':');
    if (!['train_order_horse','train_order_weapon'].includes(prefix)) return;

    const name = interaction.values?.[0];
    if (!name) {
      return interaction.reply({ content: '❌ Choix invalide.', flags: MessageFlags.Ephemeral });
    }

    // Récup prix
    const list = prefix === 'train_order_horse' ? HORSES : WEAPONS;
    const item = list.find(([n]) => n === name);
    if (!item) {
      return interaction.reply({ content: '❌ Article introuvable.', flags: MessageFlags.Ephemeral });
    }
    const [label, price] = item;

    // Débit entreprise
    const ok = debitEntrepriseLiquide(interaction.user.id, price);
    if (!ok) {
      return interaction.reply({ content: `❌ Fonds entreprise insuffisants (besoin: $${price}).`, flags: MessageFlags.Ephemeral });
    }

    // Ajout stock train
    const cat = prefix === 'train_order_horse' ? 'chevaux' : 'armes';
    addItem(cat, label, 1);

    // Log public non éphémère
    const cmdCh = COMMANDE_CHANNEL ? await interaction.client.channels.fetch(COMMANDE_CHANNEL).catch(()=>null) : null;
    const { chev, arm } = getSummaryLines();

    const log = new EmbedBuilder()
      .setColor(cat === 'chevaux' ? 0x2ecc71 : 0xe67e22)
      .setTitle('🧾 Nouvelle commande (Train)')
      .setDescription(`**${interaction.user}** a commandé **${label}** pour **$${price}**.\nCrédit: **compte ENTREPRISE (liquide)** débité.\nAjouté au **stock du train**.`)
      .addFields(
        { name: '🐎 Stock Chevaux', value: chev, inline: false },
        { name: '🔫 Stock Armes',   value: arm,  inline: false }
      )
      .setTimestamp();

    if (cmdCh) { await cmdCh.send({ embeds: [log] }).catch(()=>{}); }

    // Accusé éphemère court (pour éviter spam dans le salon panneau)
    await interaction.reply({ content: `✅ **${label}** commandé pour **$${price}**.`, flags: MessageFlags.Ephemeral });
  });
};
