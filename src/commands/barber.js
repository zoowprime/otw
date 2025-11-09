// src/commands/barber.js
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

const { getOrCreateAccount, updateAccount } = require('../economyData');
const { addItem, setBag } = require('../data/inventoryData');

// ========= Config / ENV =========
const STAFF_ROLE_ID     = process.env.STAFF_ROLE_ID || null;
const BARBER_ROLE_ID    = process.env.BARBER_ROLE_ID || null;
const BARBER_USER_ID    = process.env.BARBER_USER_ID || null;
// Image par défaut (remplaçable par ENV)
const BARBER_IMAGE_URL  = process.env.BARBER_IMAGE_URL
  || 'https://raw.githubusercontent.com/zoowprime/otw/main/src/assets/enflure.jpg';

// ========= Catalogues =========
const CATALOG = {
  cheveux: [
    ['Chauve', 5],
    ['Rasé de près', 5],
    ['Raie nette à gauche', 7],
    ['Balayés en arrière', 10],
    ['Clairsemés', 10],
    ['Épais, raie au milieu', 13],
    ['Longs, raie à droite', 13.50],
    ['Dégradés, raie au milieu', 14],
    ['Petites Piques', 12],
    ['Mal attachés', 15],
    ['Raie floue à droite', 10],
    ['Chute inégale', 8.50],
    ['Longs, lissés en arrière', 16],
    ['Ébouriffés', 20],
    ['Mal coupés', 6],
    ['Banane dégradée', 17.50],
    ['Afro bouclée courte', 16],
    ['Afro bouclée', 20],
    ['Afro bouclée longue', 20],
    ['Dégradés, lissés en arrière', 14],
    ['Bandana noué', 15],
    ['Ondulés aux épaules', 20],
    ['Bouclés, raie à gauche', 13.50],
    ['Emmêlés courts', 14],
    ['Longs, raie au milieu', 20],
    ['Queue de cheval longue', 20],
    ['Attachés, côtés rasés', 19.50],
    ['Raie nette au milieu', 17.50],
    ['Dégarni dépeigné', 13],
    ['Coupe rudimentaire', 5],
  ],
  barbe: [
    ['Rasé de près', 5],
    ['Le morse', 10],
    ['Le barman', 10],
    ['Le professeur', 10],
    ['Le collier menton', 15],
    ['Le marin', 15],
    ['Le général', 15],
    ['L’homme des bois', 15],
    ['Le vieux néerlandais', 15],
    ['La haie', 17.50],
    ['Le mouton', 17.50],
    ['Le noble', 17.50],
    ['L’arcadien', 19.50],
    ['Le révérend', 19.50],
    ['Le soldat', 19.50],
    ['La barbichette', 13.50],
    ['Le chevaleresque', 13.50],
    ['Le comte', 13.50],
    ['Le pionnier', 13.50],
    ['La double', 20],
    ['L’arche', 6],
    ['La poignée', 6],
    ['L’éclairé', 20],
    ['Les deux mèches', 20],
    ['L’hirsute', 6],
  ],
  couleur: [
    ['Coloration (tout type)', 30]
  ],
  // NB: Sacoche n’est plus un item ajouté. On toggle la sacoche via setBag().
  autres: [
    ['Pommade pour cheveux (unité)', 10, 'autres'],
    ['Sacoche', 30, 'SACOCHE_SPECIAL']
  ],
};

// ========= Helpers =========
function isAuthorized(member) {
  const byRole   = BARBER_ROLE_ID && member.roles.cache.has(BARBER_ROLE_ID);
  const byStaff  = STAFF_ROLE_ID && member.roles.cache.has(STAFF_ROLE_ID);
  const byUserId = BARBER_USER_ID && (member.id === BARBER_USER_ID);
  return Boolean(byRole || byStaff || byUserId);
}

function debitLiquide(userId, amount) {
  const acc = getOrCreateAccount(userId);
  acc.courant ||= { liquide: 0, banque: 0 };
  if ((acc.courant.liquide || 0) < amount) return { ok: false };
  acc.courant.liquide -= amount;
  updateAccount(userId, acc);
  return { ok: true };
}

function creditEntrepriseLiquide(userId, amount) {
  const acc = getOrCreateAccount(userId);
  acc.entreprise ||= { liquide: 0, banque: 0 };
  acc.entreprise.liquide = (acc.entreprise.liquide || 0) + amount;
  updateAccount(userId, acc);
}

function fmtPrice(x) { return `${Number(x).toFixed(2)}$`; }

function buildMainEmbed(interaction, target) {
  return new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle('💈 Salon de Barber')
    .setDescription(
      `Bienvenue **${interaction.user.username}** !\n` +
      `Client : **${target.username}**\n\n` +
      `Choisis une catégorie ci-dessous :`
    )
    .setTimestamp();
}

function buildCategoryButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('barber_cat_cheveux').setLabel('💇 Coupe de cheveux').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('barber_cat_barbe').setLabel('🧔 Barbe').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('barber_cat_couleur').setLabel('🎨 Couleur').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('barber_cat_autres').setLabel('🧰 Autres').setStyle(ButtonStyle.Secondary),
  );
}

function buildSelectCategoryEmbed(title, subtitle) {
  return new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle(title)
    .setDescription(subtitle);
}

function buildBackOrSelectRow(catKey) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`barber_${catKey}_first`)
      .setPlaceholder('Choisis une action…')
      .addOptions([
        { label: 'Sélectionner', value: 'select', emoji: '✅', description: 'Choisir un style / item' },
        { label: 'Retourner en arrière', value: 'back', emoji: '↩️', description: 'Revenir au menu précédent' },
      ])
  );
}

function buildItemsSelect(catKey) {
  const list = CATALOG[catKey] || [];
  const opts = list.slice(0,25).map(([name, price]) => ({
    label: name,
    value: JSON.stringify({ n: name, p: price }),
    description: `Prix : ${fmtPrice(price)}`,
  }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`barber_${catKey}_items`)
      .setPlaceholder('Choisis un style / item…')
      .addOptions(opts)
  );
}

function progressBar(pct) {
  const blocks = 20;
  const filled = Math.max(0, Math.min(blocks, Math.round((pct / 100) * blocks)));
  return `**[${'█'.repeat(filled)}${'░'.repeat(blocks - filled)}] ${pct}%**`;
}

async function runProgress(message, title, totalSec) {
  const start = Date.now();
  const end = start + totalSec * 1000;
  let lastPct = -1;

  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      const now = Date.now();
      const pct = Math.min(100, Math.floor(((now - start) / (end - start)) * 100));
      if (pct !== lastPct) {
        lastPct = pct;
        const emb = new EmbedBuilder()
          .setColor(0x9B59B6)
          .setTitle(title)
          .setDescription(progressBar(pct))
          .setImage(BARBER_IMAGE_URL);

        await message.edit({ embeds: [emb], components: [] }).catch(() => {});
      }
      if (now >= end) {
        clearInterval(interval);
        resolve();
      }
    }, 1000);
  });
}

// ========= Commande =========
module.exports = {
  data: new SlashCommandBuilder()
    .setName('barber')
    .setDescription('💈 Prestation de barber pour un client')
    .addUserOption(o => o.setName('target').setDescription('Client').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('target');

    // Permissions
    if (!isAuthorized(interaction.member)) {
      return interaction.reply({
        content: '⛔ Tu n’as pas la permission d’utiliser cette commande.',
        flags: MessageFlags.Ephemeral
      });
    }
    if (!target || target.bot) {
      return interaction.reply({ content: '❌ Client invalide.', flags: MessageFlags.Ephemeral });
    }

    // Embed principal + boutons catégories
    await interaction.reply({
      embeds: [buildMainEmbed(interaction, target)],
      components: [buildCategoryButtons()]
    });

    const msg = await interaction.fetchReply();

    // ===== Boucle de navigation catégories → sélections =====
    const chooseCategory = async () => {
      const catClick = await msg.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 120_000,
        filter: i => i.user.id === interaction.user.id && i.customId.startsWith('barber_cat_')
      }).catch(() => null);
      if (!catClick) {
        return msg.edit({
          embeds: [ new EmbedBuilder().setColor(0x95a5a6).setTitle('⏱️ Temps écoulé') ],
          components: []
        }).catch(()=>{});
      }

      const catKey = catClick.customId.replace('barber_cat_', ''); // cheveux | barbe | couleur | autres
      const titles = {
        cheveux: '💇 Choix — Coupe de cheveux',
        barbe:   '🧔 Choix — Barbe',
        couleur: '🎨 Choix — Couleur',
        autres:  '🧰 Choix — Autres',
      };

      await catClick.update({
        embeds: [buildSelectCategoryEmbed(titles[catKey] || 'Choix', 'Sélectionne **Sélectionner** pour voir les styles/items, ou **Retourner en arrière**.')],
        components: [buildBackOrSelectRow(catKey)]
      });

      const firstSel = await msg.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        time: 120_000,
        filter: i => i.user.id === interaction.user.id && i.customId === `barber_${catKey}_first`
      }).catch(()=>null);

      if (!firstSel) {
        return msg.edit({
          embeds: [ new EmbedBuilder().setColor(0x95a5a6).setTitle('⏱️ Temps écoulé') ],
          components: []
        }).catch(()=>{});
      }

      const choice = firstSel.values[0];
      if (choice === 'back') {
        return firstSel.update({
          embeds: [buildMainEmbed(interaction, target)],
          components: [buildCategoryButtons()]
        }).then(() => chooseCategory());
      }

      // Afficher le sélecteur d'items
      await firstSel.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2980B9)
            .setTitle(titles[catKey] || 'Choix')
            .setDescription('Choisis un **style / item** dans la liste ci-dessous (le prix est indiqué).')
        ],
        components: [buildItemsSelect(catKey)]
      });

      const itemSel = await msg.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        time: 120_000,
        filter: i => i.user.id === interaction.user.id && i.customId === `barber_${catKey}_items`
      }).catch(()=>null);

      if (!itemSel) {
        return msg.edit({
          embeds: [ new EmbedBuilder().setColor(0x95a5a6).setTitle('⏱️ Temps écoulé') ],
          components: []
        }).catch(()=>{});
      }

      const { n:name, p:price } = JSON.parse(itemSel.values[0]);

      // Demande d’acceptation au client (PUBLIC)
      const reqEmb = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('💈 Confirmation de prestation')
        .setDescription(
          `Client: **${target.username}**\n` +
          `Prestataire: **${interaction.user.username}**\n\n` +
          `Service: **${name}** *(catégorie: ${catKey})*\n` +
          `Prix: **${fmtPrice(price)}**\n\n` +
          `👉 **${target.username}**, veuillez **accepter** ou **refuser**.`
        );

      const btnAccept = new ButtonBuilder().setCustomId('barber_accept').setLabel('✅ Accepter').setStyle(ButtonStyle.Success);
      const btnRefuse = new ButtonBuilder().setCustomId('barber_refuse').setLabel('❌ Refuser').setStyle(ButtonStyle.Danger);
      const rowPay = new ActionRowBuilder().addComponents(btnAccept, btnRefuse);

      await itemSel.update({ embeds: [reqEmb], components: [rowPay] });

      const payClick = await msg.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 120_000,
        filter: i => (i.customId === 'barber_accept' || i.customId === 'barber_refuse') && i.user.id === target.id
      }).catch(()=>null);

      if (!payClick) {
        return msg.edit({
          embeds: [ new EmbedBuilder().setColor(0x95a5a6).setTitle('⏱️ Temps écoulé').setDescription('La confirmation du client a expiré.') ],
          components: []
        }).catch(()=>{});
      }

      if (payClick.customId === 'barber_refuse') {
        return payClick.update({
          embeds: [ new EmbedBuilder().setColor(0x95a5a6).setTitle('❌ Prestation refusée par le client') ],
          components: []
        }).catch(()=>{});
      }

      // Paiement (débit client.courant.liquide → crédit barber.entreprise.liquide)
      const debit = debitLiquide(target.id, Number(price));
      if (!debit.ok) {
        return payClick.update({
          embeds: [ new EmbedBuilder().setColor(0xE74C3C).setTitle('⛔ Fonds insuffisants').setDescription(`${target.username} n’a pas assez de **liquide**.`) ],
          components: []
        }).catch(()=>{});
      }

      // Créditer le barber (compte entreprise liquide)
      creditEntrepriseLiquide(interaction.user.id, Number(price));

      // Si "Autres": Pommade (ajout inventaire) / Sacoche (toggle bag)
      if (catKey === 'autres') {
        const found = CATALOG.autres.find(([n]) => n === name);
        const marker = found ? found[2] : 'autres';

        if (marker === 'SACOCHE_SPECIAL') {
          // active la sacoche
          setBag(target.id, true);
        } else {
          try { addItem(target.id, 'autres', name, 1); } catch {}
        }

        return payClick.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x2ECC71)
              .setTitle('✅ Achat confirmé')
              .setDescription(
                `**${target.username}** a acheté **${name}** pour **${fmtPrice(price)}**.\n` +
                (marker === 'SACOCHE_SPECIAL'
                  ? `La **sacoche** est maintenant **Oui** dans son inventaire.`
                  : `L’objet a été ajouté dans son inventaire (catégorie **Autres**).`)
              )
          ],
          components: []
        }).catch(()=>{});
      }

      // Sinon : prestation (25s) + messages éphémères aux deux
      await payClick.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('✂️ Prestation en cours…')
            .setDescription(`Service: **${name}**\n${interaction.user.username} s’occupe de **${target.username}**…`)
            .setImage(BARBER_IMAGE_URL)
        ],
        components: []
      });

      // Éphémères (feedback rapide)
      interaction.followUp({ content: '✂️ Vous êtes en train de coiffer votre client…', flags: MessageFlags.Ephemeral }).catch(()=>{});
      interaction.followUp({ content: `💈 ${target}, votre barber s’occupe de vous…`, allowedMentions: { users: [target.id] }, flags: MessageFlags.Ephemeral }).catch(()=>{});

      // Progression réelle 25s (0→100) AVEC image
      await runProgress(msg, `✂️ Prestation — ${name}`, 25);

      // Preuve publique finale + reçu
      const finalEmbed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Prestation terminée')
        .setDescription(
          `Barber: **${interaction.user.username}**\n` +
          `Client: **${target.username}**\n` +
          `Service: **${name}**\n` +
          `Montant payé: **${fmtPrice(price)}**\n\n` +
          `**Transaction effectuée** (débit liquide du client → crédit entreprise.liquide du barber).`
        );

      await msg.edit({ embeds: [finalEmbed], components: [] }).catch(()=>{});

      // Reçu séparé (message public)
      await msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1ABC9C)
            .setTitle('🧾 Reçu de prestation')
            .setDescription(
              `**${interaction.user.username}** a coiffé **${target.username}**\n` +
              `Prestation: **${name}** — **${fmtPrice(price)}**\n` +
              `Merci pour votre confiance !`
            )
        ]
      }).catch(()=>{});

      // Revenir au menu principal pour enchaîner si besoin
      setTimeout(() => {
        msg.edit({
          embeds: [buildMainEmbed(interaction, target)],
          components: [buildCategoryButtons()]
        }).catch(()=>{});
      }, 1500);

      // Relance boucle
      return chooseCategory();
    };

    // démarre la boucle
    return chooseCategory();
  }
};
