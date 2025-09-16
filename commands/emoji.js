
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, MessageFlags } = require('discord.js');

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
        .setName('emoji')
        .setDescription('Emoji management commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
        .addSubcommand(subcommand =>
            subcommand
                .setName('steal')
                .setDescription('Steal an emoji from a message or URL')
                .addStringOption(option =>
                    option
                        .setName('emoji')
                        .setDescription('The emoji to steal (custom emoji or URL)')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Name for the emoji (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('upload')
                .setDescription('Upload a new emoji from an attachment')
                .addAttachmentOption(option =>
                    option
                        .setName('attachment')
                        .setDescription('The image file to upload as emoji')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Name for the emoji')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete an emoji from the server')
                .addStringOption(option =>
                    option
                        .setName('emoji')
                        .setDescription('The emoji to delete (name or emoji itself)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get information about an emoji')
                .addStringOption(option =>
                    option
                        .setName('emoji')
                        .setDescription('The emoji to get info about')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('image')
                .setDescription('Display emoji image in 4096 resolution')
                .addStringOption(option =>
                    option
                        .setName('emoji')
                        .setDescription('The emoji to display image for')
                        .setRequired(true))),

    async execute(interaction) {
        // Check if user has manage emojis permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ You need the "Manage Emojis and Stickers" permission to use this command.')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        // Check if bot has manage emojis permission
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ I need the "Manage Emojis and Stickers" permission to execute this command.')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'steal':
                    await handleSteal(interaction);
                    break;
                case 'upload':
                    await handleUpload(interaction);
                    break;
                case 'delete':
                    await handleDelete(interaction);
                    break;
                case 'info':
                    await handleInfo(interaction);
                    break;
                case 'image':
                    await handleImage(interaction);
                    break;
                default:
                    const errorContainer = new ContainerBuilder()
                        .setAccentColor(getErrorColor(interaction.client))
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent('❌ Unknown subcommand.')
                        );

                    await interaction.reply({
                        components: [errorContainer],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in emoji command:', error);
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ An error occurred while executing the command.')
                );

            const reply = {
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
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

async function handleSteal(interaction) {
    await interaction.deferReply();

    const emojiInput = interaction.options.getString('emoji');
    const customName = interaction.options.getString('name');

    try {
        let emojiUrl = null;
        let emojiName = customName;

        // Check if it's a custom Discord emoji
        const customEmojiRegex = /<a?:([^:]+):(\d+)>/;
        const customEmojiMatch = emojiInput.match(customEmojiRegex);

        if (customEmojiMatch) {
            // It's a custom Discord emoji
            const [, name, id] = customEmojiMatch;
            const isAnimated = emojiInput.startsWith('<a:');
            const extension = isAnimated ? 'gif' : 'png';
            emojiUrl = `https://cdn.discordapp.com/emojis/${id}.${extension}`;
            emojiName = emojiName || name;
        } else if (emojiInput.startsWith('http')) {
            // It's a direct URL
            emojiUrl = emojiInput;
            if (!emojiName) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('❌ Please provide a name for the emoji when using a direct URL.')
                    );

                return await interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        } else {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ Invalid emoji format. Please provide a custom Discord emoji or a direct image URL.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Validate emoji name
        if (!emojiName || emojiName.length < 2 || emojiName.length > 32) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ Emoji name must be between 2 and 32 characters long.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Check if emoji with this name already exists
        const existingEmoji = interaction.guild.emojis.cache.find(emoji => emoji.name === emojiName);
        if (existingEmoji) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`❌ An emoji with the name "${emojiName}" already exists.`)
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Create the emoji
        const newEmoji = await interaction.guild.emojis.create({
            attachment: emojiUrl,
            name: emojiName,
            reason: `Emoji stolen by ${interaction.user.tag} (${interaction.user.id})`
        });

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('✅ **Emoji Stolen Successfully**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Emoji:** ${newEmoji}\n**Name:** ${newEmoji.name}\n**ID:** ${newEmoji.id}\n**Added by:** ${interaction.user.tag}`)
            );

        const { MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
        
        try {
            successContainer.addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder().setURL(newEmoji.url)
                    )
            );
        } catch (error) {
            console.warn('Failed to add emoji image to container:', error);
        }

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error stealing emoji:', error);
        let errorMessage = '❌ **Emoji Steal Failed**\nFailed to steal the emoji.';

        if (error.code === 50035) {
            errorMessage = '❌ **Invalid Image Format**\nPlease use a valid image URL.';
        } else if (error.code === 50013) {
            errorMessage = '❌ **Permission Error**\nI don\'t have permission to manage emojis in this server.';
        } else if (error.code === 30008) {
            errorMessage = '❌ **Emoji Limit Reached**\nMaximum number of emojis reached for this server.';
        }

        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(errorMessage)
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}

async function handleUpload(interaction) {
    await interaction.deferReply();

    const attachment = interaction.options.getAttachment('attachment');
    const emojiName = interaction.options.getString('name');

    try {
        // Validate file size (Discord limit is 256KB for emojis)
        if (attachment.size > 256000) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ File size too large. Emoji files must be under 256KB.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        if (!validTypes.includes(attachment.contentType)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ Invalid file type. Please upload a PNG, JPEG, GIF, or WebP image.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Validate emoji name
        if (!emojiName || emojiName.length < 2 || emojiName.length > 32) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ Emoji name must be between 2 and 32 characters long.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Check if emoji with this name already exists
        const existingEmoji = interaction.guild.emojis.cache.find(emoji => emoji.name === emojiName);
        if (existingEmoji) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`❌ An emoji with the name "${emojiName}" already exists.`)
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Create the emoji
        const newEmoji = await interaction.guild.emojis.create({
            attachment: attachment.url,
            name: emojiName,
            reason: `Emoji uploaded by ${interaction.user.tag} (${interaction.user.id})`
        });

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('✅ **Emoji Uploaded Successfully**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Emoji:** ${newEmoji}\n**Name:** ${newEmoji.name}\n**ID:** ${newEmoji.id}\n**Added by:** ${interaction.user.tag}`)
            );

        const { MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
        
        try {
            successContainer.addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder().setURL(newEmoji.url)
                    )
            );
        } catch (error) {
            console.warn('Failed to add emoji image to container:', error);
        }

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error uploading emoji:', error);
        let errorMessage = '❌ **Emoji Upload Failed**\nFailed to upload the emoji.';

        if (error.code === 50035) {
            errorMessage = '❌ **Invalid Image Format**\nPlease use a valid image file.';
        } else if (error.code === 50013) {
            errorMessage = '❌ **Permission Error**\nI don\'t have permission to manage emojis in this server.';
        } else if (error.code === 30008) {
            errorMessage = '❌ **Emoji Limit Reached**\nMaximum number of emojis reached for this server.';
        }

        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(errorMessage)
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}

async function handleDelete(interaction) {
    await interaction.deferReply();

    const emojiInput = interaction.options.getString('emoji');

    try {
        let targetEmoji = null;

        // Check if it's a custom Discord emoji format
        const customEmojiRegex = /<a?:([^:]+):(\d+)>/;
        const customEmojiMatch = emojiInput.match(customEmojiRegex);

        if (customEmojiMatch) {
            // Extract emoji ID from custom emoji format
            const emojiId = customEmojiMatch[2];
            targetEmoji = interaction.guild.emojis.cache.get(emojiId);
        } else {
            // Search by name or ID
            targetEmoji = interaction.guild.emojis.cache.find(emoji => 
                emoji.name === emojiInput || emoji.id === emojiInput
            );
        }

        if (!targetEmoji) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ Emoji not found in this server. Please make sure the emoji exists and try again.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Store emoji info before deletion
        const emojiInfo = {
            name: targetEmoji.name,
            id: targetEmoji.id,
            url: targetEmoji.url,
            animated: targetEmoji.animated
        };

        // Delete the emoji
        await targetEmoji.delete(`Emoji deleted by ${interaction.user.tag} (${interaction.user.id})`);

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('✅ **Emoji Deleted Successfully**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Name:** ${emojiInfo.name}\n**ID:** ${emojiInfo.id}\n**Type:** ${emojiInfo.animated ? 'Animated' : 'Static'}\n**Deleted by:** ${interaction.user.tag}`)
            );

        const { MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
        
        try {
            successContainer.addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder().setURL(emojiInfo.url)
                    )
            );
        } catch (error) {
            console.warn('Failed to add emoji image to container:', error);
        }

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error deleting emoji:', error);
        let errorMessage = '❌ **Emoji Delete Failed**\nFailed to delete the emoji.';

        if (error.code === 50013) {
            errorMessage = '❌ **Permission Error**\nI don\'t have permission to manage emojis in this server.';
        } else if (error.code === 10014) {
            errorMessage = '❌ **Emoji Not Found**\nEmoji not found. It may have already been deleted.';
        }

        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(errorMessage)
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}

async function handleInfo(interaction) {
    await interaction.deferReply();

    const emojiInput = interaction.options.getString('emoji');

    try {
        let targetEmoji = null;

        // Check if it's a custom Discord emoji format
        const customEmojiRegex = /<a?:([^:]+):(\d+)>/;
        const customEmojiMatch = emojiInput.match(customEmojiRegex);

        if (customEmojiMatch) {
            // Extract emoji ID from custom emoji format
            const emojiId = customEmojiMatch[2];
            targetEmoji = interaction.guild.emojis.cache.get(emojiId);
        } else {
            // Search by name or ID
            targetEmoji = interaction.guild.emojis.cache.find(emoji => 
                emoji.name === emojiInput || emoji.id === emojiInput
            );
        }

        if (!targetEmoji) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ Emoji not found in this server. Please make sure the emoji exists and try again.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const infoContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('📝 **Emoji Information**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Name:** ${targetEmoji.name}\n**ID:** ${targetEmoji.id}\n**Type:** ${targetEmoji.animated ? 'Animated' : 'Static'}\n**Created:** <t:${Math.floor(targetEmoji.createdAt.getTime() / 1000)}:R>\n**Managed:** ${targetEmoji.managed ? 'Yes' : 'No'}\n**Available:** ${targetEmoji.available ? 'Yes' : 'No'}\n**Usage:** \`${targetEmoji}\``)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`Guild: ${interaction.guild.name}`)
            );

        const { MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
        
        try {
            infoContainer.addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder().setURL(targetEmoji.imageURL({ size: 512 }))
                    )
            );
        } catch (error) {
            console.warn('Failed to add emoji image to container:', error);
        }

        await interaction.editReply({ 
            components: [infoContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error getting emoji info:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to get emoji information.')
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}

async function handleImage(interaction) {
    await interaction.deferReply();

    const emojiInput = interaction.options.getString('emoji');

    try {
        let targetEmoji = null;

        // Check if it's a custom Discord emoji format
        const customEmojiRegex = /<a?:([^:]+):(\d+)>/;
        const customEmojiMatch = emojiInput.match(customEmojiRegex);

        if (customEmojiMatch) {
            // Extract emoji ID from custom emoji format
            const emojiId = customEmojiMatch[2];
            targetEmoji = interaction.guild.emojis.cache.get(emojiId);
        } else {
            // Search by name or ID
            targetEmoji = interaction.guild.emojis.cache.find(emoji => 
                emoji.name === emojiInput || emoji.id === emojiInput
            );
        }

        if (!targetEmoji) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ Emoji not found in this server. Please make sure the emoji exists and try again.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Get 4096 resolution image URL
        const emoji4096 = targetEmoji.imageURL({ size: 4096 });

        const imageContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**${targetEmoji.name} - 4096x4096**`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`Emoji ID: ${targetEmoji.id}`)
            );

        const { MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
        
        try {
            imageContainer.addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder().setURL(emoji4096)
                    )
            );
        } catch (error) {
            console.warn('Failed to add emoji image to container:', error);
        }

        await interaction.editReply({ 
            components: [imageContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error getting emoji image:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to get emoji image.')
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}
