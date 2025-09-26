
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;
        
        // Import help command functions
        const { getCategoryEmoji, getCommandsByCategory, createCommandPages, showMainHelpMenu } = require('../commands/help.js');
        
        // Handle category selection
        if (interaction.customId === 'help_category_select') {
            const selectedCategory = interaction.values[0];
            const categories = getCommandsByCategory(interaction.client);
            const commandsInCategory = categories[selectedCategory];
            
            if (!commandsInCategory) {
                return await interaction.reply({ 
                    content: 'Category not found', 
                    ephemeral: true 
                });
            }
            
            const pages = createCommandPages(commandsInCategory, 8);
            await showCategoryCommands(interaction, selectedCategory, commandsInCategory, pages, 0);
        }
        
        // Handle page navigation
        if (interaction.customId.startsWith('help_page_')) {
            const parts = interaction.customId.split('_');
            const direction = parts[2]; // 'next' or 'prev'
            const category = parts[3];
            let page = parseInt(parts[4]);
            
            const categories = getCommandsByCategory(interaction.client);
            const commandsInCategory = categories[category];
            const pages = createCommandPages(commandsInCategory, 8);
            
            if (direction === 'next') page++;
            else if (direction === 'prev') page--;
            
            if (page < 0) page = 0;
            if (page >= pages.length) page = pages.length - 1;
            
            await showCategoryCommands(interaction, category, commandsInCategory, pages, page);
        }
        
        // Handle back to main menu
        if (interaction.customId === 'help_back') {
            await showMainHelpMenu(interaction);
        }
    },
};

async function showCategoryCommands(interaction, category, commandsInCategory, pages, currentPage) {
    const { buildContainerFromEmbedShape } = require('../utils/container');
    const { updateV2 } = require('../utils/sendV2');
    
    const { getCategoryEmoji } = require('../commands/help.js');
    
    // Build fields array for the embed shape
    const fields = [];
    
    pages[currentPage].forEach(cmd => {
        let commandInfo = `> ${cmd.description}`;
        
        if (cmd.subcommands && cmd.subcommands.length > 0) {
            commandInfo += '\n\n**Subcommands:**';
            cmd.subcommands.forEach(sub => {
                commandInfo += `\n> \`/${cmd.name} ${sub.name}\` - ${sub.description}`;
            });
        }
        
        fields.push({
            name: `/${cmd.name}`,
            value: commandInfo,
            inline: false
        });
    });

    const embed = buildContainerFromEmbedShape({
        title: `${getCategoryEmoji(category)} ${category} Commands`,
        description: `Here are all the ${category.toLowerCase()} commands:`,
        color: getEmbedColor(interaction.client),
        fields: fields,
        footer: {
            text: `${interaction.client.user.username} Help • ${category} • Page ${currentPage + 1}/${pages.length}`,
            iconURL: interaction.client.user.displayAvatarURL()
        },
        timestamp: new Date()
    });
    
    const navigationRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('help_back')
                .setLabel('Back to Help Menu')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🏠'),
            new ButtonBuilder()
                .setCustomId(`help_page_prev_${category}_${currentPage}`)
                .setLabel('◀')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage <= 0),
            new ButtonBuilder()
                .setCustomId(`help_page_next_${category}_${currentPage}`)
                .setLabel('▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage >= pages.length - 1)
        );
    
    embed.addActionRowComponents(navigationRow);
    
    if (interaction.replied || interaction.deferred) {
        await updateV2(interaction, { embed: embed });
    } else {
        const { replyV2 } = require('../utils/sendV2');
        await replyV2(interaction, { embed: embed, ephemeral: true });
    }
}
