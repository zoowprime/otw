// src/commands/ecurie.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags
} = require('discord.js');

const {
  getHorse, setHorse, removeHorse,
  getCart, setCart, removeCart,
  bagWeight, pushToBag,
  SACOCHE_CHEVAL_MAX_KG, SACOCHE_CHARRETTE_MAX_KG,
} = require('../data/vehicleData');

const catalog = require('../data/itemCatalog');
const { getUser, removeItem } = require('../data/inventoryStore');
const THEME = 0x145a32;

function meta(id) { return catalog[id] || { id, label: id.replace(/_/g,' '), weight: 0 }; }
function nice(id) { return meta(id).label; }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('écurie')
    .setDescription('Carte grise & gestion cheval/charrette'),

  async execute(interaction) {
    const uid = interaction.user.id;
    const h = getHorse(uid);
    const c = getCart(uid);

    if (!h && !c) {
      return interaction.reply({ embeds:[new EmbedBuilder().setColor(THEME).setDescription('🚫 Aucun cheval/charrette enregistré.')], flags: MessageFlags.Ephemeral });
    }

    const emb = new EmbedBuilder().setColor(THEME).setTitle('Écurie — Carte grise');
    if (h) {
      const w = bagWeight(h.bag);
      emb.addFields({
        name: `🐎 ${h.name || 'Cheval'} — ${h.breed || ''}`,
        value: `• Propriétaire: ${interaction.user}\n• Sacoche: **${w.toFixed(2)}kg** / ${SACOCHE_CHEVAL_MAX_KG}kg`,
      });
    }
    if (c) {
      const w = bagWeight(c.bag);
      emb.addFields({
        name: `🚚 ${c.name || 'Charrette'}`,
        value: `• Propriétaire: ${interaction.user}\n• Sacoche: **${w.toFixed(2)}kg** / ${SACOCHE_CHARRETTE_MAX_KG}kg`,
      });
    }

    const actions = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ecurie_action')
        .setPlaceholder('Choisir une action…')
        .addOptions([
          ...(h ? [
            { label: 'Relâcher le cheval', value: 'horse_release', emoji: '🐎', description: 'Libérer définitivement' },
            { label: 'Donner un item au cheval', value: 'horse_give', emoji: '🎒', description: 'Transférer depuis inventaire' },
            { label: 'Voir sacoche cheval', value: 'horse_bag', emoji: '📦', description: 'Contenu de la sacoche' },
          ] : []),
          ...(c ? [
            { label: 'Détruire la charrette', value: 'cart_destroy', emoji: '🪓', description: 'Suppression définitive' },
            { label: 'Donner un item à la charrette', value: 'cart_give', emoji: '🎒', description: 'Transférer depuis inventaire' },
            { label: 'Voir sacoche charrette', value: 'cart_bag', emoji: '📦', description: 'Contenu de la sacoche' },
          ] : [])
        ])
    );

    await interaction.reply({ embeds:[emb], components:[actions], flags: MessageFlags.Ephemeral });
    const msg = await interaction.fetchReply();

    const sel = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 180_000 }).catch(()=>null);
    if (!sel) return msg.edit({ components:[], embeds:[new EmbedBuilder().setColor(THEME).setDescription('⌛ Fermé.')] });

    const act = sel.values[0];

    // Sacoche rendering helper
    const renderBag = (arr) => {
      if (!arr?.length) return '_Sacoche vide_';
      return arr.map(x => `• ${nice(x.id)} x${x.qty} (${(x.weight||0)}kg)`).join('\n');
    };

    if (act === 'horse_bag') {
      const fresh = getHorse(uid);
      return sel.update({ components:[], embeds:[
        new EmbedBuilder().setColor(THEME).setTitle('🎒 Sacoche — Cheval').setDescription(renderBag(fresh?.bag || []))
      ]});
    }
    if (act === 'cart_bag') {
      const fresh = getCart(uid);
      return sel.update({ components:[], embeds:[
        new EmbedBuilder().setColor(THEME).setTitle('🎒 Sacoche — Charrette').setDescription(renderBag(fresh?.bag || []))
      ]});
    }

    if (act === 'horse_release') {
      removeHorse(uid);
      return sel.update({ components:[], embeds:[new EmbedBuilder().setColor(THEME).setDescription('✅ Cheval relâché.')] });
    }
    if (act === 'cart_destroy') {
      removeCart(uid);
      return sel.update({ components:[], embeds:[new EmbedBuilder().setColor(THEME).setDescription('✅ Charrette détruite.')] });
    }

    // Donner un item…
    const userInv = getUser(uid);
    const invItems = (userInv.items || []).map(x => ({ id: x.name || x.id, qty: x.quantity || 1, w: (catalog[x.name || x.id]?.weight || 0) }))
      .filter(x => x.qty > 0);

    if (!invItems.length) return sel.update({ components:[], embeds:[new EmbedBuilder().setColor(THEME).setDescription('📦 Inventaire vide.')] });

    const pick = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ecurie_pick_item')
        .setPlaceholder('Sélectionne l’objet à transférer…')
        .addOptions(invItems.slice(0,25).map(it => ({
          label: nice(it.id), value: it.id, description: `x${it.qty} — ${it.w}kg`, emoji: '📦'
        })))
    );

    await sel.update({
      components: [pick],
      embeds: [new EmbedBuilder().setColor(THEME).setDescription('Choisis l’objet à donner.')]
    });

    const sel2 = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 90_000 }).catch(()=>null);
    if (!sel2) return msg.edit({ components:[], embeds:[new EmbedBuilder().setColor(THEME).setDescription('⌛ Expiré.')] });

    const itemId = sel2.values[0];
    const m = meta(itemId);
    const qty = 1; // simple et safe

    if (act === 'horse_give') {
      const fresh = getHorse(uid) || setHorse(uid, { id:'horse', name:'Cheval' });
      const newW = bagWeight(fresh.bag) + (m.weight || 0) * qty;
      if (newW > SACOCHE_CHEVAL_MAX_KG) {
        return sel2.update({ components:[], embeds:[new EmbedBuilder().setColor(THEME).setDescription('❌ Poids max cheval atteint.')] });
      }
      try {
        removeItem(uid, itemId, qty);
        pushToBag(fresh, m, qty);
        setHorse(uid, fresh);
      } catch {
        return sel2.update({ components:[], embeds:[new EmbedBuilder().setColor(THEME).setDescription('❌ Transfert impossible.')] });
      }
      return sel2.update({ components:[], embeds:[new EmbedBuilder().setColor(THEME).setDescription(`✅ Transféré **${nice(itemId)}** au cheval.`)] });
    }

    if (act === 'cart_give') {
      const fresh = getCart(uid) || setCart(uid, { id:'cart', name:'Charrette' });
      const newW = bagWeight(fresh.bag) + (m.weight || 0) * qty;
      if (newW > SACOCHE_CHARRETTE_MAX_KG) {
        return sel2.update({ components:[], embeds:[new EmbedBuilder().setColor(THEME).setDescription('❌ Poids max charrette atteint.')] });
      }
      try {
        removeItem(uid, itemId, qty);
        pushToBag(fresh, m, qty);
        setCart(uid, fresh);
      } catch {
        return sel2.update({ components:[], embeds:[new EmbedBuilder().setColor(THEME).setDescription('❌ Transfert impossible.')] });
      }
      return sel2.update({ components:[], embeds:[new EmbedBuilder().setColor(THEME).setDescription(`✅ Transféré **${nice(itemId)}** à la charrette.`)] });
    }
  }
};
