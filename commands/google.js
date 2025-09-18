const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags, ContainerBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const GOOGLE_CX = '2166875ec165a6c21';
const GOOGLE_API_KEY = 'AIzaSyDId_oN6acZT-UMHTfYEZUgIcl4GVn1s6g';

// Helper function to get colors from config
function getEmbedColor(client) {
    return client.config?.EmbedColor || '#0099ff';
}

function getErrorColor(client) {
    return client.config?.ErrorColor || '#ff0000';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('google')
        .setDescription('Google search commands')
        .addSubcommandGroup(group =>
            group
                .setName('search')
                .setDescription('Search Google')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('images')
                        .setDescription('Search Google Images')
                        .addStringOption(option =>
                            option
                                .setName('query')
                                .setDescription('What to search for')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('website')
                        .setDescription('Search Google Web')
                        .addStringOption(option =>
                            option
                                .setName('query')
                                .setDescription('What to search for')
                                .setRequired(true)))),

    async execute(interaction) {
        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        if (group === 'search') {
            if (subcommand === 'images') {
                await handleImageSearch(interaction);
            } else if (subcommand === 'website') {
                await handleWebsiteSearch(interaction);
            }
        }
    },
};

async function handleImageSearch(interaction) {
    const query = interaction.options.getString('query');

    await interaction.deferReply();

    try {
        // Check if API keys are set
        if (!GOOGLE_API_KEY || !GOOGLE_CX) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(parseInt(getErrorColor(interaction.client).replace('#', ''), 16))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ **Configuration Error**\n\nGoogle API keys are not configured. Please set GOOGLE_API_KEY and GOOGLE_CX constants in the file.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&searchType=image`;

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!response.ok || !data.items || data.items.length === 0) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(parseInt(getErrorColor(interaction.client).replace('#', ''), 16))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ **No Results Found**\n\nNo images found for your search query.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Create containers for pagination
        const containers = [];

        data.items.slice(0, 10).forEach((item, index) => {
            const container = new ContainerBuilder()
                .setAccentColor(parseInt(getEmbedColor(interaction.client).replace('#', ''), 16))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**🖼️ Google Image Search Results**\n\n**Query:** \`${query}\`\n**Result ${index + 1} of ${Math.min(data.items.length, 10)}**\n\n**[${item.title}](${item.link})**\n${item.snippet || 'No description available'}`)
                )
                .addMediaGalleryComponents(
                    mediaGallery => mediaGallery
                        .addItems(
                            mediaItem => mediaItem.setURL(item.link)
                        )
                );

            containers.push(container);
        });

        await pagination(interaction, containers, false);

    } catch (error) {
        console.error('Error in image search:', error);

        const errorContainer = new ContainerBuilder()
            .setAccentColor(parseInt(getErrorColor(interaction.client).replace('#', ''), 16))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ **Search Error**\n\nAn error occurred while searching for images. Please try again later.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

async function handleWebsiteSearch(interaction) {
    const query = interaction.options.getString('query');

    await interaction.deferReply();

    try {
        // Check if API keys are set
        if (!GOOGLE_API_KEY || !GOOGLE_CX) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(parseInt(getErrorColor(interaction.client).replace('#', ''), 16))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ **Configuration Error**\n\nGoogle API keys are not configured. Please set GOOGLE_API_KEY and GOOGLE_CX constants in the file.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}`;

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!response.ok || !data.items || data.items.length === 0) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(parseInt(getErrorColor(interaction.client).replace('#', ''), 16))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ **No Results Found**\n\nNo websites found for your search query.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Create containers for pagination
        const containers = [];

        data.items.slice(0, 10).forEach((item, index) => {
            const container = new ContainerBuilder()
                .setAccentColor(parseInt(getEmbedColor(interaction.client).replace('#', ''), 16))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**🌐 Google Web Search Results**\n\n**Query:** \`${query}\`\n**Result ${index + 1} of ${Math.min(data.items.length, 10)}**\n\n**[${item.title}](${item.link})**\n${item.snippet || 'No description available'}\n\n**URL:** ${item.displayLink || item.link}`)
                );

            containers.push(container);
        });

        await pagination(interaction, containers, false);

    } catch (error) {
        console.error('Error in website search:', error);

        const errorContainer = new ContainerBuilder()
            .setAccentColor(parseInt(getErrorColor(interaction.client).replace('#', ''), 16))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ **Search Error**\n\nAn error occurred while searching websites. Please try again later.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

/**
 * Container pagination
 *
 * @param {BaseInteraction} interaction - The interaction that triggers the pagination.
 * @param {Array} components - The containers to show.
 * @param {boolean} ephemeral - Whether the pagination will be ephemeral or not.
 */
async function pagination(interaction, components, ephemeral) {
    try {
        if (!interaction || !components || components.length === 0) {
            throw new Error('[PAGINATION] Invalid args');
        }

        if (components.length === 1) {
            return await interaction.editReply({ 
                components: components, 
                flags: MessageFlags.IsComponentsV2,
                fetchReply: true 
            });
        }

        let index = 0;

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

        const msg = await interaction.editReply({ 
            components: [containerWithButtons], 
            flags: MessageFlags.IsComponentsV2,
            fetchReply: true 
        });

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
            } else if (i.customId === 'pageprev') {
                if (index > 0) index--;
            } else if (i.customId === 'pagenext') {
                if (index < components.length - 1) index++;
            } else if (i.customId === 'pagelast') {
                index = components.length - 1;
            }

            pageCount.setLabel(`${index + 1}/${components.length}`);

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

            // Clone the container and add updated buttons
            const updatedContainer = new ContainerBuilder(components[index].toJSON());
            updatedContainer.addActionRowComponents(buttons);

            await i.update({ 
                components: [updatedContainer], 
                flags: MessageFlags.IsComponentsV2 
            });

            collector.resetTimer();
        });

        collector.on("end", () => {
            return interaction.editReply({ 
                components: [components[index]], 
                flags: MessageFlags.IsComponentsV2 
            }).catch(() => {});
        });

        return msg;

    } catch (error) {
        console.error(`[PAGINATION ERROR] ${error}`);
    }
}