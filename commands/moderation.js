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
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('banlist')
                .setDescription('View all banned users in the server')),

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
                case 'banlist':
                    await handleBanList(interaction);
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
            .addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**User:** ${targetUser.tag} (${targetUser.id})\n**Reason:** ${reason}\n**Banned by:** ${interaction.user.tag}`)
                    )
                    .setThumbnailAccessory(
                        thumbnail => thumbnail
                            .setURL(targetUser.displayAvatarURL())
                    )
            );

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
            .addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**User:** ${bannedUser.user.tag} (${bannedUser.user.id})\n**Reason:** ${reason}\n**Unbanned by:** ${interaction.user.tag}`)
                    )
                    .setThumbnailAccessory(
                        thumbnail => thumbnail
                            .setURL(bannedUser.user.displayAvatarURL())
                    )
            );

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
            .addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**User:** ${targetUser.tag} (${targetUser.id})\n**Duration:** ${duration}\n**Reason:** ${reason}\n**Timed out by:** ${interaction.user.tag}`)
                    )
                    .setThumbnailAccessory(
                        thumbnail => thumbnail
                            .setURL(targetUser.displayAvatarURL())
                    )
            );

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
            .addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**User:** ${targetUser.tag} (${targetUser.id})\n**Reason:** ${reason}\n**Timeout removed by:** ${interaction.user.tag}`)
                    )
                    .setThumbnailAccessory(
                        thumbnail => thumbnail
                            .setURL(targetUser.displayAvatarURL())
                    )
            );

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
            .addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**User:** ${targetUser.tag} (${targetUser.id})\n**Reason:** ${reason}\n**Kicked by:** ${interaction.user.tag}`)
                    )
                    .setThumbnailAccessory(
                        thumbnail => thumbnail
                            .setURL(targetUser.displayAvatarURL())
                    )
            );

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

async function handleBanList(interaction) {
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

    try {
        const bans = await interaction.guild.bans.fetch();
        const banArray = Array.from(bans.values());

        if (banArray.length === 0) {
            const noBansContainer = new ContainerBuilder()
                .setAccentColor(getEmbedColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('📭 **No Banned Users**\n\nThis server has no banned users.')
                );

            return await interaction.editReply({
                components: [noBansContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const itemsPerPage = 5;
        const totalPages = Math.ceil(banArray.length / itemsPerPage);
        const containers = [];

        // Create containers for each page
        for (let page = 0; page < totalPages; page++) {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentBans = banArray.slice(start, end);

            const container = new ContainerBuilder()
                .setAccentColor(getEmbedColor(interaction.client));

            // Add title
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`🔨 **Banned Users (Page ${page + 1}/${totalPages})**`)
            );

            container.addSeparatorComponents(separator => separator);

            // Add each banned user
            currentBans.forEach((ban, index) => {
                const globalIndex = start + index + 1;
                const reason = ban.reason || 'No reason provided';
                const truncatedReason = reason.length > 100 ? reason.substring(0, 100) + '...' : reason;

                container.addSectionComponents(
                    section => section
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent(`**${globalIndex}. ${ban.user.tag}**\n**ID:** \`${ban.user.id}\`\n**Reason:** ${truncatedReason}`)
                        )
                        .setThumbnailAccessory(
                            thumbnail => thumbnail
                                .setURL(ban.user.displayAvatarURL())
                        )
                );

                if (index < currentBans.length - 1) {
                    container.addSeparatorComponents(separator => separator);
                }
            });

            // Add footer
            container.addSeparatorComponents(separator => separator);
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`*Total: ${banArray.length} banned users*`)
            );

            containers.push(container);
        }

        // Use pagination if more than one page
        if (containers.length === 1) {
            await interaction.editReply({
                components: [containers[0]],
                flags: MessageFlags.IsComponentsV2
            });
        } else {
            await pagination(interaction, containers, false);
        }

    } catch (error) {
        console.error('Error fetching ban list:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to fetch the ban list. Please check my permissions and try again.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
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
            return await interaction.editReply({
                components: components,
                flags: MessageFlags.IsComponentsV2,
                fetchReply: true
            });
        }

        var index = 0;

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

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

        const msg = await interaction.editReply({
            components: [containerWithButtons],
            flags: MessageFlags.IsComponentsV2,
            fetchReply: true
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

            await i.update({
                components: [updatedContainer],
                flags: MessageFlags.IsComponentsV2
            });

            collector.resetTimer();
        });

        collector.on("end", () => {
            try {
                return interaction.editReply({
                    components: [components[index]],
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
