
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Embed management commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create an embed using the container system')),

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

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create') {
            await handleCreateEmbed(interaction);
        }
    },
};

async function handleCreateEmbed(interaction) {
    const { buildContainerFromEmbedShape } = require('../utils/container');
    const { replyV2 } = require('../utils/sendV2');

    // Create initial container with instructions
    const container = buildContainerFromEmbedShape({
        title: '📝 Embed Builder',
        description: 'Click the buttons below to configure your embed properties. Each button will open a form to customize different aspects of your embed.',
        color: getEmbedColor(interaction.client),
        fields: [
            {
                name: '🎨 Available Options',
                value: '• **Title** - Set the embed title\n• **Description** - Set the main content\n• **Author** - Add author information\n• **Footer** - Add footer text\n• **Image** - Add a large image\n• **Thumbnail** - Add a small thumbnail\n• **Timestamp** - Add current timestamp\n• **Color** - Change embed color'
            }
        ],
        timestamp: new Date()
    });

    

    // Add buttons directly to the container
    container.addActionRowComponents(
        actionRow => actionRow.setComponents([
            new ButtonBuilder()
                .setCustomId('embed_title')
                .setLabel('Title')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📰'),
            new ButtonBuilder()
                .setCustomId('embed_description')
                .setLabel('Description')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝'),
            new ButtonBuilder()
                .setCustomId('embed_author')
                .setLabel('Author')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👤'),
            new ButtonBuilder()
                .setCustomId('embed_footer')
                .setLabel('Footer')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📋')
        ])
    );

    container.addActionRowComponents(
        actionRow => actionRow.setComponents([
            new ButtonBuilder()
                .setCustomId('embed_image')
                .setLabel('Image')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🖼️'),
            new ButtonBuilder()
                .setCustomId('embed_thumbnail')
                .setLabel('Thumbnail')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🏞️'),
            new ButtonBuilder()
                .setCustomId('embed_timestamp')
                .setLabel('Timestamp')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⏰'),
            new ButtonBuilder()
                .setCustomId('embed_color')
                .setLabel('Color')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🎨')
        ])
    );

    container.addActionRowComponents(
        actionRow => actionRow.setComponents([
            new ButtonBuilder()
                .setCustomId('embed_preview')
                .setLabel('Preview Embed')
                .setStyle(ButtonStyle.Success)
                .setEmoji('👁️'),
            new ButtonBuilder()
                .setCustomId('embed_send')
                .setLabel('Send Embed')
                .setStyle(ButtonStyle.Success)
                .setEmoji('📤'),
            new ButtonBuilder()
                .setCustomId('embed_reset')
                .setLabel('Reset')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔄')
        ])
    );

    await replyV2(interaction, { 
        embed: container,
        ephemeral: true 
    });
}

// Modal handlers for each embed property
async function showTitleModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('embed_title_modal')
        .setTitle('Set Embed Title');

    const titleInput = new TextInputBuilder()
        .setCustomId('title_input')
        .setLabel('Embed Title')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(256)
        .setPlaceholder('Enter the title for your embed')
        .setRequired(false);

    const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
}

async function showDescriptionModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('embed_description_modal')
        .setTitle('Set Embed Description');

    const descriptionInput = new TextInputBuilder()
        .setCustomId('description_input')
        .setLabel('Embed Description')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(4000)
        .setPlaceholder('Enter the description for your embed')
        .setRequired(false);

    const firstActionRow = new ActionRowBuilder().addComponents(descriptionInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
}

async function showAuthorModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('embed_author_modal')
        .setTitle('Set Embed Author');

    const nameInput = new TextInputBuilder()
        .setCustomId('author_name_input')
        .setLabel('Author Name')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(256)
        .setPlaceholder('Enter the author name')
        .setRequired(false);

    const urlInput = new TextInputBuilder()
        .setCustomId('author_url_input')
        .setLabel('Author URL (optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://example.com')
        .setRequired(false);

    const iconInput = new TextInputBuilder()
        .setCustomId('author_icon_input')
        .setLabel('Author Icon URL (optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://example.com/icon.png')
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(urlInput),
        new ActionRowBuilder().addComponents(iconInput)
    );

    await interaction.showModal(modal);
}

async function showFooterModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('embed_footer_modal')
        .setTitle('Set Embed Footer');

    const textInput = new TextInputBuilder()
        .setCustomId('footer_text_input')
        .setLabel('Footer Text')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(2048)
        .setPlaceholder('Enter the footer text')
        .setRequired(false);

    const iconInput = new TextInputBuilder()
        .setCustomId('footer_icon_input')
        .setLabel('Footer Icon URL (optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://example.com/icon.png')
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(textInput),
        new ActionRowBuilder().addComponents(iconInput)
    );

    await interaction.showModal(modal);
}

async function showImageModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('embed_image_modal')
        .setTitle('Set Embed Image');

    const imageInput = new TextInputBuilder()
        .setCustomId('image_url_input')
        .setLabel('Image URL')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://example.com/image.png')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(imageInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
}

async function showThumbnailModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('embed_thumbnail_modal')
        .setTitle('Set Embed Thumbnail');

    const thumbnailInput = new TextInputBuilder()
        .setCustomId('thumbnail_url_input')
        .setLabel('Thumbnail URL')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://example.com/thumbnail.png')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(thumbnailInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
}

async function showColorModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('embed_color_modal')
        .setTitle('Set Embed Color');

    const colorInput = new TextInputBuilder()
        .setCustomId('color_input')
        .setLabel('Color (hex code)')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(7)
        .setPlaceholder('#0099ff')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(colorInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
}

// Export modal handlers for use in button interaction handler
module.exports.showTitleModal = showTitleModal;
module.exports.showDescriptionModal = showDescriptionModal;
module.exports.showAuthorModal = showAuthorModal;
module.exports.showFooterModal = showFooterModal;
module.exports.showImageModal = showImageModal;
module.exports.showThumbnailModal = showThumbnailModal;
module.exports.showColorModal = showColorModal;
