// src/commands/inventaire.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreateInventory, updateInventory } = require('../inventoryData');

// Définition des types d’objets disponibles
const typeChoices = [
  { name: 'Cheval', value: 'cheval' },
  { name: 'Arme', value: 'arme' },
  { name: 'Accessoire', value: 'accessoire' }
];

// Listes d'objets par catégorie (exemples – vous pouvez compléter avec la liste complète)
const objectsList = {
  cheval: [
    { name: 'Mustang - Bai Sauvage', value: 'Mustang_Bai_Sauvage' },
    { name: 'American Paint - Tobiano', value: 'American_Paint_Tobiano' }
    // Ajoutez ici le reste des chevaux...
  ],
  arme: [
    { name: 'Cattleman Revolver', value: 'Cattleman_Revolver' },
    { name: 'Navy Revolver', value: 'Navy_Revolver' },
    { name: 'Double Action Revolver', value: 'Double_Action_Revolver' }
    // Ajoutez ici le reste des armes...
  ],
  accessoire: [
    { name: 'Holster simple en cuir', value: 'Holster_simple_cuir' },
    { name: 'Ceinture holster simple', value: 'Ceinture_holster_simple' }
    // Ajoutez ici le reste des accessoires...
  ]
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventaire')
    .setDescription('Gestion d\'inventaire pour votre personnage.')
    
    // Sous-commande: /inventaire afficher [target]
    .addSubcommand(subcommand =>
      subcommand
        .setName('afficher')
        .setDescription('Affiche l\'inventaire d\'un joueur.')
        .addUserOption(option =>
          option.setName('target')
            .setDescription('Joueur cible (facultatif)')
            .setRequired(false)
        )
    )
    
    // Sous-commande: /inventaire ajouter
    .addSubcommand(subcommand =>
      subcommand
        .setName('ajouter')
        .setDescription('Ajoute un objet à l\'inventaire d\'un joueur.')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type d\'objet')
            .setRequired(true)
            .addChoices(...typeChoices)
        )
        .addStringOption(option =>
          option.setName('objet')
            .setDescription('Objet à ajouter')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addUserOption(option =>
          option.setName('target')
            .setDescription('Joueur cible')
            .setRequired(true)
        )
    )
    
    // Sous-commande: /inventaire retirer
    .addSubcommand(subcommand =>
      subcommand
        .setName('retirer')
        .setDescription('Retire un objet de l\'inventaire.')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type d\'objet')
            .setRequired(true)
            .addChoices(...typeChoices)
        )
        .addStringOption(option =>
          option.setName('objet')
            .setDescription('Objet à retirer')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addUserOption(option =>
          option.setName('target')
            .setDescription('Joueur cible (facultatif, défaut : vous)')
            .setRequired(false)
        )
    )
    
    // Sous-commande: /inventaire supprimer
    .addSubcommand(subcommand =>
      subcommand
        .setName('supprimer')
        .setDescription('Supprime tout l\'inventaire d\'un joueur (action irréversible).')
        .addUserOption(option =>
          option.setName('target')
            .setDescription('Joueur cible')
            .setRequired(true)
        )
    ),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const target = interaction.options.getUser('target') || interaction.user;
    const inv = getOrCreateInventory(target.id);

    if (subcommand === 'afficher') {
      let description = `**Inventaire de ${target.username} :**\n\n`;
      for (const type of Object.keys(inv)) {
        description += `**${type.toUpperCase()}**\n`;
        const items = inv[type];
        if (Object.keys(items).length === 0) {
          description += "Aucun objet\n";
        } else {
          for (const [item, quantity] of Object.entries(items)) {
            description += `${item} x${quantity}\n`;
          }
        }
        description += "\n";
      }
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("Inventaire")
        .setDescription(description);
      return interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'ajouter') {
      const type = interaction.options.getString('type');
      const objet = interaction.options.getString('objet');
      const targetForAdd = interaction.options.getUser('target');
      const inventory = getOrCreateInventory(targetForAdd.id);
      if (!inventory[type][objet]) {
        inventory[type][objet] = 0;
      }
      inventory[type][objet] += 1;
      updateInventory(targetForAdd.id, inventory);
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("Inventaire mis à jour")
        .setDescription(`${objet} a été ajouté à l'inventaire de ${targetForAdd.username} (Total: ${inventory[type][objet]}).`);
      return interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'retirer') {
      const type = interaction.options.getString('type');
      const objet = interaction.options.getString('objet');
      const targetForRet = interaction.options.getUser('target') || interaction.user;
      const inventory = getOrCreateInventory(targetForRet.id);
      if (!inventory[type][objet] || inventory[type][objet] <= 0) {
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("Erreur")
          .setDescription(`${targetForRet.username} ne possède pas ${objet} dans son inventaire.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      inventory[type][objet] -= 1;
      if (inventory[type][objet] === 0) delete inventory[type][objet];
      updateInventory(targetForRet.id, inventory);
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("Inventaire mis à jour")
        .setDescription(`${objet} a été retiré de l'inventaire de ${targetForRet.username} (Restant: ${inventory[type][objet] || 0}).`);
      return interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'supprimer') {
      const targetForSuppr = interaction.options.getUser('target');
      updateInventory(targetForSuppr.id, { cheval: {}, arme: {}, accessoire: {} });
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Inventaire supprimé")
        .setDescription(`L'inventaire de ${targetForSuppr.username} a été supprimé.`);
      return interaction.reply({ embeds: [embed] });
    }
  },

  // Gestion de l'autocomplétion pour l'option 'objet'
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    let choices = [];
    // Si le champ objet est en autocompletion, on peut récupérer le type s'il a été renseigné
    const type = interaction.options.getString('type');
    if (focusedOption.name === 'objet') {
      if (type && objectsList[type]) {
        choices = objectsList[type];
      } else {
        // Sinon, on fusionne les choix de toutes les catégories (attention au nombre max de 25)
        choices = [].concat(...Object.values(objectsList));
      }
    }
    const filtered = choices.filter(choice =>
      choice.name.toLowerCase().includes(focusedOption.value.toLowerCase())
    ).slice(0, 25);
    return interaction.respond(filtered);
  }
};
