// src/events/candidature.js
require('dotenv').config({ path: './id.env' });
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ComponentType,
} = require('discord.js');

const {
  CANDIDATURE_CHANNEL,
  CANDIDATURE_CATEGORY,
  STAFF_ROLE_ID
} = process.env;

module.exports = (client) => {
  // 1️⃣ À l'initialisation, poste le panneau si nécessaire
  client.once('ready', async () => {
    const launchCh = await client.channels.fetch(CANDIDATURE_CHANNEL).catch(() => null);
    if (!launchCh || !launchCh.isText()) return console.error('Salon de candidature introuvable');

    // Ne renvoie pas si le panneau existe déjà
    const recent = await launchCh.messages.fetch({ limit: 50 });
    if (recent.some(m => m.embeds[0]?.title === 'Déposer une candidature')) return;

    const embed = new EmbedBuilder()
      .setTitle('Déposer une candidature')
      .setColor(0xff0000)
      .setDescription(
        'Si vous souhaitez déposer votre candidature, ouvrez le menu ci‑dessous et sélectionnez **Faire ma candidature**.\n' +
        'Le modèle de candidature vous sera directement fourni par le bot !'
      );

    const menu = new StringSelectMenuBuilder()
      .setCustomId('candidature_open')
      .setPlaceholder('Faire ma candidature')
      .addOptions([
        {
          label: 'Faire ma candidature',
          value: 'faire_candidature',
        }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);
    await launchCh.send({ embeds: [embed], components: [row] });
  });

  // 2️⃣ Gestion de l’ouverture de la candidature
  client.on('interactionCreate', async interaction => {
    // ----- Menu déroulant “Faire ma candidature” -----
    if (interaction.isStringSelectMenu() && interaction.customId === 'candidature_open') {
      if (interaction.values[0] !== 'faire_candidature') return;
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Création du salon sous la catégorie de candidature
      let candidateCh;
      try {
        candidateCh = await interaction.guild.channels.create({
          name: `candidature-${interaction.user.username}`,
          type: 0, // GuildText
          parent: CANDIDATURE_CATEGORY,
          permissionOverwrites: [
            { id: interaction.guild.id, deny: ['ViewChannel'] },
            { id: interaction.user.id, allow: ['ViewChannel','SendMessages','ReadMessageHistory'] },
            { id: STAFF_ROLE_ID, allow: ['ViewChannel','ReadMessageHistory'] }
          ]
        });
      } catch (err) {
        console.error('❌ Impossible de créer le salon candidature:', err);
        return interaction.editReply({ content: '❌ Échec de la création du salon.' });
      }

      // Message de confirmation éphémère
      await interaction.editReply({
        content: `✅ Salon de candidature créé : ${candidateCh}`,
      });

      // 3️⃣ Envoyer dans ce salon l’embed + bouton de suppression & modèle
      const headerEmbed = new EmbedBuilder()
        .setTitle('Candidature de ' + interaction.user.tag)
        .setColor(0xff0000)
        .setDescription('Cliquez sur **Supprimer le salon** une fois que vous avez terminé ou si vous souhaitez annuler.')

      const deleteBtn = new ButtonBuilder()
        .setCustomId('candidature_delete')
        .setLabel('Supprimer le salon')
        .setStyle(ButtonStyle.Danger);

      await candidateCh.send({
        embeds: [headerEmbed],
        components: [new ActionRowBuilder().addComponents(deleteBtn)]
      });

      // Modèle de candidature (plain text)
      const template =
`**Prénom :**

**Âge (15 ans min) :**

**Expérience RP (serveur, type de projet) :**

**PSN :**

**Disponibilité :**

**Lundi =**
**Mardi =**
**Mercredi =**
**Jeudi =**
**Vendredi =**
**Samedis =**
**Dimanche =**

**Nom :**
**Prénom :**
**Âge et date de naissance :**
**Sexe :**
**Taille (1m50‑2m) :**
**Origine :**
**Accent (oui/non) :**
**Trait de caractère (3 minimum) :**
**Projet (court, moyen, long…) :**

\`Nous vous demandons un Background réfléchi et bien pensé (pas de RP « Rambo »), cohérent et détaillé.\`

**Background (10 lignes minimum) :**`;

      await candidateCh.send({ content: template });
    }

    // ----- Bouton “Supprimer le salon” -----
    if (interaction.isButton() && interaction.customId === 'candidature_delete') {
      // permissions staff uniquement
      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
        return interaction.reply({
          content: '❌ Vous n’avez pas la permission.',
          flags: MessageFlags.Ephemeral
        });
      }
      await interaction.reply({ content: '🗑️ Suppression du salon…', flags: MessageFlags.Ephemeral });
      setTimeout(() => interaction.channel.delete().catch(console.error), 1500);
    }
  });
};
