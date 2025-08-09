// src/commands/resetpack.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataDir = process.env.DATA_DIR || '/data';
const CLAIMS_PATH = path.join(dataDir, 'starterClaims.json');

function loadClaims() {
  try {
    if (!fs.existsSync(CLAIMS_PATH)) return {};
    return JSON.parse(fs.readFileSync(CLAIMS_PATH, 'utf8') || '{}');
  } catch { return {}; }
}
function saveClaims(obj) {
  try { fs.writeFileSync(CLAIMS_PATH, JSON.stringify(obj, null, 2), 'utf8'); } catch {}
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetpack')
    .setDescription("Rend l'accès au salon Starter Pack et permet de reprendre le pack (nouveau perso).")
    .addUserOption(opt =>
      opt.setName('joueur')
        .setDescription('Le joueur à réinitialiser')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const member = interaction.options.getUser('joueur', true);
    const chId = process.env.STARTER_PACK_CHANNEL;

    if (!chId) {
      return interaction.reply({ content: '❌ STARTER_PACK_CHANNEL non défini.', flags: MessageFlags.Ephemeral });
    }

    const channel = await interaction.client.channels.fetch(chId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      return interaction.reply({ content: '❌ Salon Starter-Pack introuvable.', flags: MessageFlags.Ephemeral });
    }

    // 1) enlève l’overwrite de masquage (pour qu’il revoie le salon)
    try {
      await channel.permissionOverwrites.delete(member.id).catch(async () => {
        // si pas d’overwrite, on force un allow explicite (optionnel)
        await channel.permissionOverwrites.edit(member.id, { ViewChannel: true });
      });
    } catch (e) {
      // ignore
    }

    // 2) supprime la claim persistée
    const claims = loadClaims();
    if (claims[member.id]) {
      delete claims[member.id];
      saveClaims(claims);
    }

    // 3) DM au joueur
    const dm = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🎒 Starter Pack — Réinitialisé')
      .setDescription(
        `Ton accès au salon **Starter Pack** a été rétabli et ta réclamation a été réinitialisée.\n` +
        `Tu peux à nouveau cliquer le bouton si tu recommences un personnage.`
      );
    try { await member.send({ embeds: [dm] }); } catch {}

    // 4) confirmation admin
    await interaction.reply({
      content: `✅ Starter Pack réinitialisé pour <@${member.id}>. Accès au salon rendu.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
