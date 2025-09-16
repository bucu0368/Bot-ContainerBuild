
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('urban')
        .setDescription('Search for definitions on Urban Dictionary')
        .addStringOption(option =>
            option
                .setName('query')
                .setDescription('The term to search for')
                .setRequired(true)),

    async execute(interaction) {
        const query = interaction.options.getString('query');
        
        await interaction.deferReply();

        try {
            const response = await fetch(`http://api.urbandictionary.com/v0/define?term=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (!data.list || data.list.length === 0) {
                const { buildContainerFromEmbedShape } = require('../utils/container');
                const { editReplyV2 } = require('../utils/sendV2');
                
                const noResultsContainer = buildContainerFromEmbedShape({
                    title: '❌ No Results Found',
                    description: `No Urban Dictionary definitions found for **${query}**.`,
                    color: getEmbedColor(interaction.client),
                    timestamp: new Date()
                });

                return await editReplyV2(interaction, { embed: noResultsContainer });
            }

            // Create containers for each definition
            const containers = [];
            const { buildContainerFromEmbedShape } = require('../utils/container');

            data.list.slice(0, 10).forEach((definition, index) => {
                // Truncate long text
                const truncateText = (text, maxLength = 1000) => {
                    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
                };

                const container = buildContainerFromEmbedShape({
                    title: `📚 ${query}`,
                    color: getEmbedColor(interaction.client),
                    fields: [
                        {
                            name: '📝 **Definition:**',
                            value: truncateText(definition.definition.replace(/\[|\]/g, ''))
                        },
                        {
                            name: '💡 **Example:**',
                            value: definition.example ? truncateText(definition.example.replace(/\[|\]/g, '')) : 'No example provided'
                        },
                        {
                            name: '👤 **Author:**',
                            value: definition.author || 'Unknown'
                        },
                        {
                            name: '📅 **Written On:**',
                            value: new Date(definition.written_on).toLocaleDateString() || 'Unknown date'
                        },
                        {
                            name: '👍 **Thumbs Up:**',
                            value: definition.thumbs_up?.toString() || '0'
                        },
                        {
                            name: '👎 **Thumbs Down:**',
                            value: definition.thumbs_down?.toString() || '0'
                        }
                    ],
                    footer: {
                        text: `Definition ${index + 1} of ${Math.min(data.list.length, 10)} • Urban Dictionary`
                    },
                    timestamp: new Date()
                });

                containers.push(container);
            });

            // Use pagination function
            await pagination(interaction, containers, false);

        } catch (error) {
            console.error('Error fetching Urban Dictionary data:', error);
            
            const { buildContainerFromEmbedShape } = require('../utils/container');
            const { editReplyV2 } = require('../utils/sendV2');
            
            const errorContainer = buildContainerFromEmbedShape({
                title: '❌ Error',
                description: 'An error occurred while fetching Urban Dictionary data. Please try again later.',
                color: '#ff0000',
                timestamp: new Date()
            });

            await editReplyV2(interaction, { embed: errorContainer });
        }
    },
};

/**
 * Container pagination
 *
 * @param {BaseInteraction} interaction - The interaction that triggers the pagination.
 * @param {Array} components - The containers to show.
 * @param {boolean} ephemeral - Whether the pagination will be ephemeral or not.
 */
async function pagination(interaction, components, ephemeral) {
    try {
        if (!interaction || !components || !components.length > 0) throw new Error('[PAGINATION] Invalid args');

        if (components.length === 1) {
            const { editReplyV2 } = require('../utils/sendV2');
            return await editReplyV2(interaction, { embed: components[0] });
        }

        var index = 0;

        const first = new ButtonBuilder()
            .setCustomId('pagefirst')
            .setEmoji('⏪')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true);

        const prev = new ButtonBuilder()
            .setCustomId('pageprev')
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true);

        const pageCount = new ButtonBuilder()
            .setCustomId('pagecount')
            .setLabel(`${index + 1}/${components.length}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const next = new ButtonBuilder()
            .setCustomId('pagenext')
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Primary);

        const last = new ButtonBuilder()
            .setCustomId('pagelast')
            .setEmoji('⏩')
            .setStyle(ButtonStyle.Primary);

        const buttons = new ActionRowBuilder().addComponents([first, prev, pageCount, next, last]);

        // Clone the container and add pagination buttons
        const containerWithButtons = new ContainerBuilder(components[index].toJSON());
        containerWithButtons.addActionRowComponents(buttons);

        const { editReplyV2 } = require('../utils/sendV2');
        const msg = await editReplyV2(interaction, { embed: containerWithButtons });

        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 180000 
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return await i.reply({ 
                    content: `Only **${interaction.user.username}** can use these buttons.`, 
                    ephemeral: true 
                });
            }

            if (i.customId === 'pagefirst') { 
                index = 0; 
                pageCount.setLabel(`${index + 1}/${components.length}`); 
            }

            if (i.customId === 'pageprev') { 
                if (index > 0) index--; 
                pageCount.setLabel(`${index + 1}/${components.length}`); 
            }
            else if (i.customId === 'pagenext') { 
                if (index < components.length - 1) { 
                    index++; 
                    pageCount.setLabel(`${index + 1}/${components.length}`); 
                } 
            }
            else if (i.customId === 'pagelast') { 
                index = components.length - 1; 
                pageCount.setLabel(`${index + 1}/${components.length}`); 
            }

            if (index === 0) { 
                first.setDisabled(true); 
                prev.setDisabled(true); 
            } else { 
                first.setDisabled(false); 
                prev.setDisabled(false); 
            }

            if (index === components.length - 1) { 
                next.setDisabled(true); 
                last.setDisabled(true); 
            } else { 
                next.setDisabled(false); 
                last.setDisabled(false); 
            }

            // Create new container with updated buttons
            const updatedContainer = new ContainerBuilder(components[index].toJSON());
            updatedContainer.addActionRowComponents(new ActionRowBuilder().addComponents([first, prev, pageCount, next, last]));

            const { updateV2 } = require('../utils/sendV2');
            await updateV2(i, { embed: updatedContainer });

            collector.resetTimer();
        });

        collector.on("end", () => {
            try {
                const { editReplyV2 } = require('../utils/sendV2');
                return editReplyV2(interaction, { embed: components[index] });
            } catch (err) {
                console.error('Error ending pagination:', err);
            }
        });

        return msg;

    } catch (e) { 
        console.error(`[PAGINATION ERROR] ${e}`); 
    }
}
