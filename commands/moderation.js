
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
        .setName('moderation')
        .setDescription('Server moderation commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands)
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Ban a member from the server')
                .addUserOption(option =>
                    option
                        .setName('member')
                        .setDescription('The member to ban')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the ban')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unban')
                .setDescription('Unban a user from the server')
                .addStringOption(option =>
                    option
                        .setName('userid')
                        .setDescription('The user ID to unban')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the unban')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('timeout')
                .setDescription('Timeout a member (1m to 32d)')
                .addUserOption(option =>
                    option
                        .setName('member')
                        .setDescription('The member to timeout')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('duration')
                        .setDescription('Duration (e.g., 1m, 1h, 1d) - max 28d')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the timeout')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('untimeout')
                .setDescription('Remove timeout from a member')
                .addUserOption(option =>
                    option
                        .setName('member')
                        .setDescription('The member to remove timeout from')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for removing timeout')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Kick a member from the server')
                .addUserOption(option =>
                    option
                        .setName('member')
                        .setDescription('The member to kick')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the kick')
                        .setRequired(false))),

    async execute(interaction) {
        // Check if user has permission to use application commands
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

        // Check if bot has permission to use application commands
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

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'ban':
                    await handleBan(interaction);
                    break;
                case 'unban':
                    await handleUnban(interaction);
                    break;
                case 'timeout':
                    await handleTimeout(interaction);
                    break;
                case 'untimeout':
                    await handleUntimeout(interaction);
                    break;
                case 'kick':
                    await handleKick(interaction);
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
            console.error('Error in moderation command:', error);
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

async function handleBan(interaction) {
    // Check ban permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ You need the "Ban Members" permission to use this command.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ I need the "Ban Members" permission to execute this command.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    await interaction.deferReply();

    const targetUser = interaction.options.getUser('member');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
        // Check if user is trying to ban themselves
        if (targetUser.id === interaction.user.id) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ You cannot ban yourself.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Check if user is trying to ban the bot
        if (targetUser.id === interaction.client.user.id) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ I cannot ban myself.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Get member object to check permissions and hierarchy
        let targetMember;
        try {
            targetMember = await interaction.guild.members.fetch(targetUser.id);
        } catch {
            targetMember = null;
        }

        // If user is in the server, check role hierarchy
        if (targetMember) {
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('❌ You cannot ban this user as they have a higher or equal role than you.')
                    );

                return await interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('❌ I cannot ban this user as they have a higher or equal role than me.')
                    );

                return await interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            if (targetUser.id === interaction.guild.ownerId) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('❌ You cannot ban the server owner.')
                    );

                return await interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }

        // Check if user is already banned
        try {
            await interaction.guild.bans.fetch(targetUser.id);
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ This user is already banned.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        } catch {
            // User is not banned, continue
        }

        // Execute the ban
        await interaction.guild.members.ban(targetUser, {
            reason: `${reason} | Banned by: ${interaction.user.tag} (${interaction.user.id})`
        });

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('🔨 **User Banned Successfully**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**User:** ${targetUser.tag} (${targetUser.id})\n**Reason:** ${reason}\n**Banned by:** ${interaction.user.tag}`)
            );

        const { MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
        
        try {
            successContainer.addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder().setURL(targetUser.displayAvatarURL())
                    )
            );
        } catch (error) {
            console.warn('Failed to add user avatar to container:', error);
        }

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error banning user:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to ban the user. Please check my permissions and try again.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

async function handleUnban(interaction) {
    // Check ban permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ You need the "Ban Members" permission to use this command.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ I need the "Ban Members" permission to execute this command.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    await interaction.deferReply();

    const userId = interaction.options.getString('userid');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
        // Check if user is banned
        let bannedUser;
        try {
            bannedUser = await interaction.guild.bans.fetch(userId);
        } catch {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ This user is not banned.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Unban the user
        await interaction.guild.members.unban(userId, `${reason} | Unbanned by: ${interaction.user.tag} (${interaction.user.id})`);

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('✅ **User Unbanned Successfully**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**User:** ${bannedUser.user.tag} (${bannedUser.user.id})\n**Reason:** ${reason}\n**Unbanned by:** ${interaction.user.tag}`)
            );

        const { MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
        
        try {
            successContainer.addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder().setURL(bannedUser.user.displayAvatarURL())
                    )
            );
        } catch (error) {
            console.warn('Failed to add user avatar to container:', error);
        }

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error unbanning user:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to unban the user. Please check my permissions and try again.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

async function handleTimeout(interaction) {
    // Check timeout permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ You need the "Moderate Members" permission to use this command.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ I need the "Moderate Members" permission to execute this command.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    await interaction.deferReply();

    const targetUser = interaction.options.getUser('member');
    const duration = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ User is not in this server.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Check hierarchy
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ You cannot timeout this user as they have a higher or equal role than you.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ I cannot timeout this user as they have a higher or equal role than me.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Parse duration
        const timeoutMs = parseDuration(duration);
        if (!timeoutMs || timeoutMs < 60000 || timeoutMs > 28 * 24 * 60 * 60 * 1000) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ Invalid duration. Please use format like 1m, 1h, 1d (minimum 1m, maximum 28d).')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Apply timeout
        await targetMember.timeout(timeoutMs, `${reason} | Timeout by: ${interaction.user.tag} (${interaction.user.id})`);

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('⏰ **User Timed Out Successfully**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**User:** ${targetUser.tag} (${targetUser.id})\n**Duration:** ${duration}\n**Reason:** ${reason}\n**Timed out by:** ${interaction.user.tag}`)
            );

        const { MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
        
        try {
            successContainer.addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder().setURL(targetUser.displayAvatarURL())
                    )
            );
        } catch (error) {
            console.warn('Failed to add user avatar to container:', error);
        }

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error timing out user:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to timeout the user. Please check my permissions and try again.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

async function handleUntimeout(interaction) {
    // Check timeout permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ You need the "Moderate Members" permission to use this command.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ I need the "Moderate Members" permission to execute this command.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    await interaction.deferReply();

    const targetUser = interaction.options.getUser('member');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ User is not in this server.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (!targetMember.communicationDisabledUntil) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ This user is not timed out.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Remove timeout
        await targetMember.timeout(null, `${reason} | Timeout removed by: ${interaction.user.tag} (${interaction.user.id})`);

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('✅ **Timeout Removed Successfully**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**User:** ${targetUser.tag} (${targetUser.id})\n**Reason:** ${reason}\n**Timeout removed by:** ${interaction.user.tag}`)
            );

        const { MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
        
        try {
            successContainer.addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder().setURL(targetUser.displayAvatarURL())
                    )
            );
        } catch (error) {
            console.warn('Failed to add user avatar to container:', error);
        }

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error removing timeout:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to remove timeout. Please check my permissions and try again.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

async function handleKick(interaction) {
    // Check kick permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ You need the "Kick Members" permission to use this command.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ I need the "Kick Members" permission to execute this command.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    await interaction.deferReply();

    const targetUser = interaction.options.getUser('member');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ User is not in this server.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Check if user is trying to kick themselves
        if (targetUser.id === interaction.user.id) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ You cannot kick yourself.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Check hierarchy
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ You cannot kick this user as they have a higher or equal role than you.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ I cannot kick this user as they have a higher or equal role than me.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (targetUser.id === interaction.guild.ownerId) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ You cannot kick the server owner.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Execute kick
        await targetMember.kick(`${reason} | Kicked by: ${interaction.user.tag} (${interaction.user.id})`);

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('👢 **User Kicked Successfully**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**User:** ${targetUser.tag} (${targetUser.id})\n**Reason:** ${reason}\n**Kicked by:** ${interaction.user.tag}`)
            );

        const { MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
        
        try {
            successContainer.addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder().setURL(targetUser.displayAvatarURL())
                    )
            );
        } catch (error) {
            console.warn('Failed to add user avatar to container:', error);
        }

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error kicking user:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to kick the user. Please check my permissions and try again.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

// Helper function to parse duration strings
function parseDuration(durationStr) {
    const match = durationStr.match(/^(\d+)([smhd])$/i);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
}
