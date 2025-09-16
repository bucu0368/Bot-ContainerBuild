
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

// In-memory storage for sticky messages (in production, use a database)
const stickyMessages = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stick')
        .setDescription('Sticky message system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages | PermissionFlagsBits.UseApplicationCommands)
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Sticks a message to the channel')
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('The message to stick')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Stops and completely deletes the stickied message in this channel')),

    async execute(interaction) {
        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) || 
            !interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ You need "Manage Messages" and "Use Application Commands" permissions to use this command.')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        // Check if bot has required permissions
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages) || 
            !interaction.guild.members.me.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ I need "Manage Messages" and "Use Application Commands" permissions to execute this command.')
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
                case 'start':
                    await handleStartSticky(interaction);
                    break;
                case 'remove':
                    await handleRemoveSticky(interaction);
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
            console.error('Error in stick command:', error);
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

async function handleStartSticky(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const message = interaction.options.getString('message');
    const channelId = interaction.channel.id;
    const guildId = interaction.guild.id;

    // Check if there's already a sticky message in this channel
    const existingSticky = stickyMessages.get(channelId);
    if (existingSticky) {
        // Delete the old sticky message if it exists
        try {
            const channel = await interaction.client.channels.fetch(channelId);
            const oldMessage = await channel.messages.fetch(existingSticky.messageId).catch(() => null);
            if (oldMessage) {
                await oldMessage.delete();
            }
        } catch (error) {
            console.error('Error deleting old sticky message:', error);
        }
    }

    try {
        // Create sticky message container
        const stickyContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('📌 **Stickied Message:**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(message)
            );

        // Send the sticky message
        const stickyMsg = await interaction.channel.send({
            components: [stickyContainer],
            flags: MessageFlags.IsComponentsV2
        });

        // Store sticky message data
        const stickyData = {
            messageId: stickyMsg.id,
            channelId: channelId,
            guildId: guildId,
            content: message,
            authorId: interaction.user.id,
            createdAt: Date.now()
        };

        stickyMessages.set(channelId, stickyData);

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`✅ **Sticky Message Created!**\n\nThe message has been sticked to ${interaction.channel}.\nIt will be reposted when other messages are sent in this channel.`)
            );

        await interaction.editReply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Error creating sticky message:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to create sticky message. Please check my permissions.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

async function handleRemoveSticky(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channelId = interaction.channel.id;
    const stickyData = stickyMessages.get(channelId);

    if (!stickyData) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ No sticky message found in this channel.')
            );

        return await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }

    try {
        // Delete the sticky message
        const channel = await interaction.client.channels.fetch(channelId);
        const stickyMsg = await channel.messages.fetch(stickyData.messageId).catch(() => null);
        
        if (stickyMsg) {
            await stickyMsg.delete();
        }

        // Remove from storage
        stickyMessages.delete(channelId);

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('✅ **Sticky Message Removed!**\n\nThe sticky message has been completely removed from this channel.')
            );

        await interaction.editReply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Error removing sticky message:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to remove sticky message.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

// Export functions for messageCreate handler
module.exports.stickyMessages = stickyMessages;
module.exports.getEmbedColor = getEmbedColor;
module.exports.getErrorColor = getErrorColor;
