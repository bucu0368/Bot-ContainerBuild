
const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

function getCategoryEmoji(category) {
    const emojiMap = {
        "Info": "📚",
        "Community": "👥",
        "Moderation": "🛡️",
        "Fun": "🎮",
        "Economy": "💰",
        "Music": "🎵",
        "AI": "🤖",
        "Utility": "🔧",
        "Settings": "⚙️",
        "Games": "🎲",
        "Server": "🔨",
        "Developer": "👨‍💻",
        "Image": "🖼️",
        "Entertainment": "🎪",
        "Web": "🌐",
        "Uncategorized": "❓"
    };
    
    return emojiMap[category] || "📌";
}

function getCommandsByCategory(client) {
    const categories = {};
    
    client.commands.forEach(command => {
        // Determine category based on command name or add a category property to commands
        let category = "Utility";
        
        // Categorize based on command names
        if (['user', 'userinfo', 'server', 'bot', 'membercount'].includes(command.data.name)) {
            category = "Info";
        } else if (['clear', 'moderation'].includes(command.data.name)) {
            category = "Moderation";
        } else if (['meme', 'urban', 'pokemon'].includes(command.data.name)) {
            category = "Fun";
        } else if (['image', 'images'].includes(command.data.name)) {
            category = "Image";
        } else if (['google', 'wikipedia', 'weather', 'github', 'githubrepo'].includes(command.data.name)) {
            category = "Web";
        } else if (['giveaway'].includes(command.data.name)) {
            category = "Community";
        } else if (['test'].includes(command.data.name)) {
            category = "Developer";
        }
        
        if (!categories[category]) {
            categories[category] = [];
        }
        
        let subcommands = [];
        if (command.data && command.data.options) {
            subcommands = command.data.options
                .filter(opt => opt.type === 1) // SUB_COMMAND type
                .map(sub => ({
                    name: sub.name,
                    description: sub.description
                }));
        }
        
        categories[category].push({
            name: command.data.name,
            description: command.data.description,
            subcommands: subcommands
        });
    });
    
    return categories;
}

function createCommandPages(commands, itemsPerPage = 8) {
    const pages = [];
    
    for (let i = 0; i < commands.length; i += itemsPerPage) {
        const pageCommands = commands.slice(i, i + itemsPerPage);
        pages.push(pageCommands);
    }
    
    return pages;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display help information and command list')
        .addStringOption(option =>
            option
                .setName('command')
                .setDescription('Get help for a specific command')
                .setRequired(false)),

    async execute(interaction) {
        // Defer the reply immediately to prevent timeout
        await interaction.deferReply({ ephemeral: true });
        
        const specificCommand = interaction.options.getString('command');
        
        if (specificCommand) {
            // Show help for specific command
            const command = interaction.client.commands.get(specificCommand);
            
            if (!command) {
                const { buildContainerFromEmbedShape } = require('../utils/container');
                const { editReplyV2 } = require('../utils/sendV2');
                
                const errorContainer = buildContainerFromEmbedShape({
                    title: '❌ Command Not Found',
                    description: `No command named **${specificCommand}** was found.`,
                    color: '#ff0000',
                    timestamp: new Date()
                });

                return await editReplyV2(interaction, { embed: errorContainer });
            }
            
            const { buildContainerFromEmbedShape } = require('../utils/container');
            const { editReplyV2 } = require('../utils/sendV2');
            
            let subcommandInfo = '';
            if (command.data.options && command.data.options.length > 0) {
                const subcommands = command.data.options.filter(opt => opt.type === 1);
                if (subcommands.length > 0) {
                    subcommandInfo = '\n\n**Subcommands:**\n';
                    subcommands.forEach(sub => {
                        subcommandInfo += `• \`/${command.data.name} ${sub.name}\` - ${sub.description}\n`;
                    });
                }
            }
            
            const commandContainer = buildContainerFromEmbedShape({
                title: `📖 Command: /${command.data.name}`,
                description: command.data.description + subcommandInfo,
                color: getEmbedColor(interaction.client),
                fields: [
                    {
                        name: 'Usage',
                        value: `\`/${command.data.name}\``
                    }
                ],
                timestamp: new Date()
            });

            return await editReplyV2(interaction, { embed: commandContainer });
        }

        // Show main help menu
        await showMainHelpMenu(interaction);
    },
};

async function showMainHelpMenu(interaction) {
    const { buildContainerFromEmbedShape } = require('../utils/container');
    const { editReplyV2, replyV2 } = require('../utils/sendV2');
    
    const categories = getCommandsByCategory(interaction.client);
    const totalCommands = interaction.client.commands.size;
    
    const categoryList = Object.keys(categories)
        .map(cat => `${getCategoryEmoji(cat)} **${cat}** (${categories[cat].length})`)
        .join('\n');
    
    const mainContainer = buildContainerFromEmbedShape({
        title: `${interaction.client.user.username} Help Center 📚`,
        description: 'Welcome to the help center! Select a category below to view commands.',
        color: getEmbedColor(interaction.client),
        fields: [
            {
                name: '📊 Commands Statistics',
                value: `Total Commands: **${totalCommands}**`
            },
            {
                name: '📂 Categories',
                value: categoryList
            },
            {
                name: '🔗 Support',
                value: `Join our [support server](${interaction.client.config.SupportServerLink}) for help`
            }
        ],
        footer: {
            text: `${interaction.client.user.username} Help Center`
        },
        timestamp: new Date()
    });

    const categoryOptions = Object.keys(categories).map(category => ({
        label: `${getCategoryEmoji(category)} ${category}`,
        description: `View ${category} commands (${categories[category].length} commands)`,
        value: category,
        emoji: getCategoryEmoji(category)
    }));

    const selectMenu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('help_category_select')
                .setPlaceholder('📚 Select a category')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(categoryOptions)
        );

    mainContainer.addActionRowComponents(selectMenu);

    // Use editReplyV2 if interaction is already deferred, otherwise use replyV2
    if (interaction.deferred || interaction.replied) {
        await editReplyV2(interaction, { embed: mainContainer });
    } else {
        await replyV2(interaction, { embed: mainContainer, ephemeral: true });
    }
}

// Export helper functions for use in interaction handlers
module.exports.getCategoryEmoji = getCategoryEmoji;
module.exports.getCommandsByCategory = getCommandsByCategory;
module.exports.createCommandPages = createCommandPages;
module.exports.showMainHelpMenu = showMainHelpMenu;
