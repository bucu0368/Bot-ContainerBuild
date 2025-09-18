
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Helper function to get colors from config
function getEmbedColor(client) {
    return client.config?.EmbedColor || '#0099ff';
}

function getErrorColor(client) {
    return client.config?.ErrorColor || '#ff0000';
}

const IMAGE_API_KEY = 'Apikey-EFychKOxf1oIfxkHtBDCuYC';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('image')
        .setDescription('Image generation commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('generate')
                .setDescription('Generate an image from a text prompt')
                .addStringOption(option =>
                    option
                        .setName('prompt')
                        .setDescription('The prompt to generate an image from')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'generate') {
                await handleImageGenerate(interaction);
            } else {
                await interaction.reply({
                    content: '❌ Unknown subcommand.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in image command:', error);
            const reply = {
                content: '❌ An error occurred while executing the command.',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    },
};

async function handleImageGenerate(interaction) {
    const prompt = interaction.options.getString('prompt');

    // Create loading embed
    const { replyV2, editReplyV2 } = require('../utils/sendV2');

    const loadingEmbed = {
        title: '🎨 Image Generate',
        description: 'Please wait while I create your image.',
        color: getEmbedColor(interaction.client),
        timestamp: new Date()
    };

    await replyV2(interaction, { embed: loadingEmbed });

    try {
        const encodedPrompt = encodeURIComponent(prompt);
        const response = await fetch(`http://67.220.85.146:6207/image?prompt=${encodedPrompt}`, {
            method: 'GET',
            headers: {
                'x-api-key': IMAGE_API_KEY
            }
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const imageUrl = data.image || data.imageUrl || data.image_url || data.url;

        // Create container with buttons
        const { buildContainerFromEmbedShape } = require('../utils/container');
        
        const embedShape = {
            title: '🎨 Image Generate',
            description: `**Prompt:**\n\`\`\`${data.prompt || prompt}\`\`\``,
            color: getEmbedColor(interaction.client),
            image: { url: imageUrl },
            fields: [
                {
                    name: 'Information',
                    value: `**imageId:** ${data.imageId || 'N/A'}\n**status:** ${data.status || 'completed'}\n**duration:** ${data.duration || 'N/A'}`,
                    inline: false
                }
            ],
            footer: { 
                text: `Requested By: ${interaction.user.username}`,
                icon_url: interaction.user.displayAvatarURL()
            },
            timestamp: new Date()
        };

        const container = buildContainerFromEmbedShape(embedShape);
        
        // Add buttons to container
        container.addActionRowComponents(
            actionRow => actionRow
                .setComponents([
                    new ButtonBuilder()
                        .setLabel('Invite Bots')
                        .setURL(`https://discord.com/oauth2/authorize?client_id=${interaction.client.config.clientId}&permissions=8&integration_type=0&scope=bot`)
                        .setStyle(ButtonStyle.Link),
                    new ButtonBuilder()
                        .setLabel('Join Server')
                        .setURL(interaction.client.config.SupportServerLink)
                        .setStyle(ButtonStyle.Link)
                ])
        );

        await editReplyV2(interaction, { 
            embed: container
        });

    } catch (error) {
        console.error('Error generating image:', error);

        const errorEmbed = {
            title: '❌ Image Generation Failed',
            description: 'Sorry, I couldn\'t generate the image. Please try again later.',
            color: getErrorColor(interaction.client),
            timestamp: new Date()
        };

        await editReplyV2(interaction, { 
            embed: errorEmbed,
            components: []
        });
    }
}
