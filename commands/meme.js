
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

function getErrorColor(client) {
    const color = client.config?.ErrorColor || '#ff0000';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Get a random meme')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),

    async execute(interaction) {
        // Check if user has required permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ You need "Use Application Commands" permission to use this command.',
                ephemeral: true
            });
        }

        // Check if bot has required permissions
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ I need "Use Application Commands" permission to execute this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const response = await fetch('https://meme-api.com/gimme');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();

            if (!data.url) {
                throw new Error('No meme URL received from API');
            }

            const { buildContainerFromEmbedShape } = require('../utils/container');
            const { editReplyV2 } = require('../utils/sendV2');

            const container = buildContainerFromEmbedShape({
                title: `😂 ${data.title || 'Random Meme'}`,
                description: data.postLink ? `[View Original Post](${data.postLink})` : null,
                color: getEmbedColor(interaction.client),
                image: {
                    url: data.url
                },
                fields: [
                    {
                        name: '📱 Subreddit',
                        value: data.subreddit ? `${data.subreddit}` : 'Unknown',
                        inline: true
                    },
                    {
                        name: '👤 Author',
                        value: data.author ? `${data.author}` : 'Unknown',
                        inline: true
                    },
                    {
                        name: '👍 Upvotes',
                        value: data.ups ? data.ups.toString() : '0',
                        inline: true
                    }
                ],
                footer: {
                    text: `Requested by ${interaction.user.username} • Powered by meme-api.com`
                },
                timestamp: new Date()
            });

            await editReplyV2(interaction, { embed: container });

        } catch (error) {
            console.error('Error fetching meme:', error);

            const { buildContainerFromEmbedShape } = require('../utils/container');
            const { editReplyV2 } = require('../utils/sendV2');

            const errorContainer = buildContainerFromEmbedShape({
                title: '❌ Meme Fetch Failed',
                description: 'Sorry, I couldn\'t fetch a meme right now. The API might be temporarily unavailable. Please try again later.',
                color: getErrorColor(interaction.client),
                timestamp: new Date()
            });

            await editReplyV2(interaction, { embed: errorContainer });
        }
    },
};
