
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
        .setDescription('YouTube video information commands')
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
            if (subcommand === 'info') {
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
