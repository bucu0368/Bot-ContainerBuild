
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
        .setName('clear')
        .setDescription('Clear messages from the channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages | PermissionFlagsBits.UseApplicationCommands)
        .addIntegerOption(option =>
            option
                .setName('number')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),

    async execute(interaction) {
        // Check user permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ You need the "Manage Messages" permission to use this command.')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ You need the "Use Application Commands" permission to use this command.')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.ViewChannel)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ You need the "View Channel" permission to use this command.')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.SendMessages)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ You need the "Send Messages" permission to use this command.')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        // Check bot permissions
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ I need the "Manage Messages" permission to execute this command.')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ I need the "Use Application Commands" permission to execute this command.')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ViewChannel)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ I need the "View Channel" permission to execute this command.')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.SendMessages)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ I need the "Send Messages" permission to execute this command.')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const numberToDelete = interaction.options.getInteger('number');

        try {
            // Fetch messages to delete
            const messages = await interaction.channel.messages.fetch({ limit: numberToDelete });
            
            // Filter messages that are less than 14 days old (Discord limitation)
            const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
            const messagesToDelete = messages.filter(message => message.createdTimestamp > twoWeeksAgo);
            const oldMessages = messages.size - messagesToDelete.size;

            if (messagesToDelete.size === 0) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('❌ No messages found to delete. Messages older than 14 days cannot be bulk deleted.')
                    );

                return await interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Delete messages
            let deletedCount = 0;
            if (messagesToDelete.size === 1) {
                // Delete single message
                await messagesToDelete.first().delete();
                deletedCount = 1;
            } else {
                // Bulk delete multiple messages
                const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);
                deletedCount = deleted.size;
            }

            const successContainer = new ContainerBuilder()
                .setAccentColor(getEmbedColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('🗑️ **Messages Deleted**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**Messages Deleted:** ${deletedCount}\n**Channel:** ${interaction.channel.name}\n**Cleared by:** ${interaction.user.tag}${oldMessages > 0 ? `\n**Note:** ${oldMessages} messages older than 14 days were skipped` : ''}`)
                );

            await interaction.editReply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error clearing messages:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ Failed to clear messages. Please check my permissions and try again.')
                );

            await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};
