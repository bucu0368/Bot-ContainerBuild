
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('youtube')
        .setDescription('YouTube search and video information commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('search')
                .setDescription('Search for YouTube videos')
                .addStringOption(option =>
                    option
                        .setName('query')
                        .setDescription('Search query for YouTube videos')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get information about a YouTube video')
                .addStringOption(option =>
                    option
                        .setName('query')
                        .setDescription('YouTube video URL or video ID')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const query = interaction.options.getString('query');

        // Check for API key in environment or config
        const apiKey = 'AIzaSyATFpor67agaOsjyU2AUcyGgVT184Afkeg';
        if (!apiKey) {
            const { buildContainerFromEmbedShape } = require('../utils/container');
            const { replyV2 } = require('../utils/sendV2');
            
            const errorContainer = buildContainerFromEmbedShape({
                title: '❌ API Key Missing',
                description: 'YouTube API key is not configured. Please set YOUTUBE_API_KEY environment variable.',
                color: '#ff0000',
                timestamp: new Date()
            });

            return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
        }

        await interaction.deferReply();

        try {
            if (subcommand === 'search') {
                await handleYouTubeSearch(interaction, query, apiKey);
            } else if (subcommand === 'info') {
                await handleYouTubeInfo(interaction, query, apiKey);
            }
        } catch (error) {
            console.error('Error in YouTube command:', error);
            
            const { buildContainerFromEmbedShape } = require('../utils/container');
            const { editReplyV2 } = require('../utils/sendV2');
            
            const errorContainer = buildContainerFromEmbedShape({
                title: '❌ Error',
                description: 'An error occurred while processing your YouTube request. Please try again later.',
                color: '#ff0000',
                timestamp: new Date()
            });

            await editReplyV2(interaction, { embed: errorContainer });
        }
    },
};

async function handleYouTubeSearch(interaction, query, apiKey) {
    try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(query)}&key=${apiKey}`;
        const response = await fetch(searchUrl);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(`YouTube API Error: ${data.error?.message || 'Unknown error'}`);
        }

        if (!data.items || data.items.length === 0) {
            const { buildContainerFromEmbedShape } = require('../utils/container');
            const { editReplyV2 } = require('../utils/sendV2');
            
            const noResultsContainer = buildContainerFromEmbedShape({
                title: '❌ No Results Found',
                description: `No YouTube videos found for **${query}**.`,
                color: getEmbedColor(interaction.client),
                timestamp: new Date()
            });

            return await editReplyV2(interaction, { embed: noResultsContainer });
        }

        // Create containers for each video
        const containers = [];
        const { buildContainerFromEmbedShape } = require('../utils/container');

        for (let i = 0; i < data.items.length; i++) {
            const video = data.items[i];
            
            // Get video statistics
            const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${video.id.videoId}&key=${apiKey}`;
            const statsResponse = await fetch(statsUrl);
            const statsData = await statsResponse.json();
            const stats = statsData.items?.[0] || {};

            // Format duration
            const duration = stats.contentDetails?.duration || 'N/A';
            const formattedDuration = formatDuration(duration);

            // Format numbers
            const viewCount = stats.statistics?.viewCount ? formatNumber(stats.statistics.viewCount) : 'N/A';
            const likeCount = stats.statistics?.likeCount ? formatNumber(stats.statistics.likeCount) : 'N/A';

            const container = buildContainerFromEmbedShape({
                title: `🎥 ${video.snippet.title}`,
                description: video.snippet.description.length > 300 
                    ? video.snippet.description.substring(0, 300) + '...' 
                    : video.snippet.description,
                color: getEmbedColor(interaction.client),
                thumbnail: {
                    url: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url
                },
                fields: [
                    {
                        name: '📺 **Channel:**',
                        value: video.snippet.channelTitle
                    },
                    {
                        name: '📅 **Published:**',
                        value: `<t:${Math.floor(new Date(video.snippet.publishedAt).getTime() / 1000)}:R>`
                    },
                    {
                        name: '⏱️ **Duration:**',
                        value: formattedDuration
                    },
                    {
                        name: '👀 **Views:**',
                        value: viewCount
                    },
                    {
                        name: '👍 **Likes:**',
                        value: likeCount
                    },
                    {
                        name: '🔗 **Link:**',
                        value: `https://www.youtube.com/watch?v=${video.id.videoId}`
                    }
                ],
                footer: {
                    text: `Result ${i + 1} of ${data.items.length} • YouTube Search`
                },
                timestamp: new Date()
            });

            containers.push(container);
        }

        // Use pagination function
        await pagination(interaction, containers, false);

    } catch (error) {
        console.error('Error in YouTube search:', error);
        throw error;
    }
}

async function handleYouTubeInfo(interaction, query, apiKey) {
    try {
        // Extract video ID from URL or use as is
        let videoId = query;
        const urlMatch = query.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
        if (urlMatch) {
            videoId = urlMatch[1];
        }

        const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`;
        const response = await fetch(videoUrl);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(`YouTube API Error: ${data.error?.message || 'Unknown error'}`);
        }

        if (!data.items || data.items.length === 0) {
            const { buildContainerFromEmbedShape } = require('../utils/container');
            const { editReplyV2 } = require('../utils/sendV2');
            
            const notFoundContainer = buildContainerFromEmbedShape({
                title: '❌ Video Not Found',
                description: `No YouTube video found with ID/URL: **${query}**`,
                color: '#ff0000',
                timestamp: new Date()
            });

            return await editReplyV2(interaction, { embed: notFoundContainer });
        }

        const video = data.items[0];
        const { buildContainerFromEmbedShape } = require('../utils/container');
        const { editReplyV2 } = require('../utils/sendV2');

        // Format data
        const duration = formatDuration(video.contentDetails?.duration || 'PT0S');
        const viewCount = formatNumber(video.statistics?.viewCount || '0');
        const likeCount = formatNumber(video.statistics?.likeCount || '0');
        const commentCount = formatNumber(video.statistics?.commentCount || '0');

        const container = buildContainerFromEmbedShape({
            title: `🎥 ${video.snippet.title}`,
            description: video.snippet.description.length > 500 
                ? video.snippet.description.substring(0, 500) + '...' 
                : video.snippet.description,
            color: getEmbedColor(interaction.client),
            thumbnail: {
                url: video.snippet.thumbnails?.maxres?.url || video.snippet.thumbnails?.high?.url
            },
            fields: [
                {
                    name: '📺 **Channel:**',
                    value: video.snippet.channelTitle
                },
                {
                    name: '📅 **Published:**',
                    value: `<t:${Math.floor(new Date(video.snippet.publishedAt).getTime() / 1000)}:F>`
                },
                {
                    name: '⏱️ **Duration:**',
                    value: duration
                },
                {
                    name: '👀 **Views:**',
                    value: viewCount
                },
                {
                    name: '👍 **Likes:**',
                    value: likeCount
                },
                {
                    name: '💬 **Comments:**',
                    value: commentCount
                },
                {
                    name: '🏷️ **Tags:**',
                    value: video.snippet.tags ? video.snippet.tags.slice(0, 5).join(', ') : 'None'
                },
                {
                    name: '🔗 **Link:**',
                    value: `https://www.youtube.com/watch?v=${video.id}`
                }
            ],
            footer: {
                text: 'YouTube Video Info'
            },
            timestamp: new Date()
        });

        await editReplyV2(interaction, { embed: container });

    } catch (error) {
        console.error('Error in YouTube info:', error);
        throw error;
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
        const msg = await editReplyV2(interaction, { 
            embed: containerWithButtons,
            flags: MessageFlags.IsComponentsV2
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
            await updateV2(i, { 
                embed: updatedContainer,
                flags: MessageFlags.IsComponentsV2
            });

            collector.resetTimer();
        });

        collector.on("end", () => {
            try {
                const { editReplyV2 } = require('../utils/sendV2');
                return editReplyV2(interaction, { 
                    embed: components[index],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (err) {
                console.error('Error ending pagination:', err);
            }
        });

        return msg;

    } catch (e) { 
        console.error(`[PAGINATION ERROR] ${e}`); 
    }
}

// Helper functions
function formatDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 'N/A';
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

function formatNumber(num) {
    const number = parseInt(num);
    if (number >= 1000000000) {
        return (number / 1000000000).toFixed(1) + 'B';
    } else if (number >= 1000000) {
        return (number / 1000000).toFixed(1) + 'M';
    } else if (number >= 1000) {
        return (number / 1000).toFixed(1) + 'K';
    }
    return number.toLocaleString();
}
