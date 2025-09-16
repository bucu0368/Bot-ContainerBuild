
const { ContainerBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Store embed data temporarily (in production, consider using a database)
const embedData = new Map();

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        // Handle button interactions for embed builder
        if (interaction.isButton()) {
            const { customId, user } = interaction;
            
            if (customId.startsWith('embed_')) {
                const embedCommand = require('../commands/embed.js');
                
                switch (customId) {
                    case 'embed_title':
                        await embedCommand.showTitleModal(interaction);
                        break;
                    case 'embed_description':
                        await embedCommand.showDescriptionModal(interaction);
                        break;
                    case 'embed_author':
                        await embedCommand.showAuthorModal(interaction);
                        break;
                    case 'embed_footer':
                        await embedCommand.showFooterModal(interaction);
                        break;
                    case 'embed_image':
                        await embedCommand.showImageModal(interaction);
                        break;
                    case 'embed_thumbnail':
                        await embedCommand.showThumbnailModal(interaction);
                        break;
                    case 'embed_timestamp':
                        await handleTimestamp(interaction);
                        break;
                    case 'embed_color':
                        await embedCommand.showColorModal(interaction);
                        break;
                    case 'embed_preview':
                        await handlePreview(interaction);
                        break;
                    case 'embed_send':
                        await handleSend(interaction);
                        break;
                    case 'embed_reset':
                        await handleReset(interaction);
                        break;
                }
            }
        }

        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            const { customId, user } = interaction;
            
            if (customId.endsWith('_modal')) {
                await handleModalSubmit(interaction);
            }
        }
    },
};

async function handleTimestamp(interaction) {
    const userId = interaction.user.id;
    if (!embedData.has(userId)) {
        embedData.set(userId, {});
    }
    
    const data = embedData.get(userId);
    data.timestamp = new Date();
    
    await interaction.reply({
        content: '✅ Timestamp has been added to your embed!',
        ephemeral: true
    });
}

async function handlePreview(interaction) {
    const userId = interaction.user.id;
    const data = embedData.get(userId) || {};
    
    const { buildContainerFromEmbedShape } = require('../utils/container');
    const { replyV2 } = require('../utils/sendV2');
    
    if (Object.keys(data).length === 0) {
        return await interaction.reply({
            content: '❌ No embed data found. Please configure some properties first!',
            ephemeral: true
        });
    }

    const container = buildContainerFromEmbedShape({
        title: data.title || undefined,
        description: data.description || undefined,
        author: data.author || undefined,
        footer: data.footer || undefined,
        image: data.image || undefined,
        thumbnail: data.thumbnail || undefined,
        timestamp: data.timestamp || undefined,
        color: data.color || getEmbedColor(interaction.client)
    });

    await replyV2(interaction, { 
        embed: container, 
        ephemeral: true 
    });
}

async function handleSend(interaction) {
    const userId = interaction.user.id;
    const data = embedData.get(userId) || {};
    
    if (Object.keys(data).length === 0) {
        return await interaction.reply({
            content: '❌ No embed data found. Please configure some properties first!',
            ephemeral: true
        });
    }

    const { buildContainerFromEmbedShape } = require('../utils/container');
    const { sendV2 } = require('../utils/sendV2');
    
    const container = buildContainerFromEmbedShape({
        title: data.title || undefined,
        description: data.description || undefined,
        author: data.author || undefined,
        footer: data.footer || undefined,
        image: data.image || undefined,
        thumbnail: data.thumbnail || undefined,
        timestamp: data.timestamp || undefined,
        color: data.color || getEmbedColor(interaction.client)
    });

    await sendV2(interaction.channel, { embed: container });
    
    // Clear the data after sending
    embedData.delete(userId);
    
    await interaction.reply({
        content: '✅ Embed has been sent to the channel!',
        ephemeral: true
    });
}

async function handleReset(interaction) {
    const userId = interaction.user.id;
    embedData.delete(userId);
    
    await interaction.reply({
        content: '✅ Embed data has been reset!',
        ephemeral: true
    });
}

async function handleModalSubmit(interaction) {
    const { customId, user, fields } = interaction;
    const userId = user.id;
    
    if (!embedData.has(userId)) {
        embedData.set(userId, {});
    }
    
    const data = embedData.get(userId);
    
    try {
        switch (customId) {
            case 'embed_title_modal':
                const title = fields.getTextInputValue('title_input');
                if (title.trim()) {
                    data.title = title.trim();
                } else {
                    delete data.title;
                }
                break;

            case 'embed_description_modal':
                const description = fields.getTextInputValue('description_input');
                if (description.trim()) {
                    data.description = description.trim();
                } else {
                    delete data.description;
                }
                break;

            case 'embed_author_modal':
                const authorName = fields.getTextInputValue('author_name_input');
                const authorUrl = fields.getTextInputValue('author_url_input') || '';
                const authorIcon = fields.getTextInputValue('author_icon_input') || '';
                
                if (authorName.trim()) {
                    data.author = {
                        name: authorName.trim(),
                        url: authorUrl.trim() || undefined,
                        iconURL: authorIcon.trim() || undefined
                    };
                } else {
                    delete data.author;
                }
                break;

            case 'embed_footer_modal':
                const footerText = fields.getTextInputValue('footer_text_input');
                const footerIcon = fields.getTextInputValue('footer_icon_input') || '';
                
                if (footerText.trim()) {
                    data.footer = {
                        text: footerText.trim(),
                        iconURL: footerIcon.trim() || undefined
                    };
                } else {
                    delete data.footer;
                }
                break;

            case 'embed_image_modal':
                const imageUrl = fields.getTextInputValue('image_url_input');
                if (imageUrl.trim() && isValidUrl(imageUrl.trim())) {
                    data.image = { url: imageUrl.trim() };
                } else {
                    delete data.image;
                }
                break;

            case 'embed_thumbnail_modal':
                const thumbnailUrl = fields.getTextInputValue('thumbnail_url_input');
                if (thumbnailUrl.trim() && isValidUrl(thumbnailUrl.trim())) {
                    data.thumbnail = { url: thumbnailUrl.trim() };
                } else {
                    delete data.thumbnail;
                }
                break;

            case 'embed_color_modal':
                const color = fields.getTextInputValue('color_input');
                if (color.trim() && isValidHexColor(color.trim())) {
                    data.color = parseInt(color.trim().replace('#', ''), 16);
                } else {
                    delete data.color;
                }
                break;
        }

        await interaction.reply({
            content: '✅ Property updated successfully!',
            ephemeral: true
        });

    } catch (error) {
        console.error('Error handling modal submit:', error);
        await interaction.reply({
            content: '❌ An error occurred while processing your input!',
            ephemeral: true
        });
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function isValidHexColor(color) {
    return /^#?[0-9A-Fa-f]{6}$/.test(color);
}
