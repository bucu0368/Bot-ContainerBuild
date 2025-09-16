
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ContainerBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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
        .setName('channel')
        .setDescription('Channel management commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new channel')
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Channel type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Text Channel', value: 'text' },
                            { name: 'Voice Channel', value: 'voice' }
                        ))
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Name for the new channel')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a channel')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to delete')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clone')
                .setDescription('Clone a channel with all permissions')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to clone')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nuke')
                .setDescription('Delete and recreate a channel (keeps all settings)')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to nuke (optional - defaults to current channel)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('lock')
                .setDescription('Lock a channel (remove send message permissions)')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to lock (optional - defaults to current channel)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unlock')
                .setDescription('Unlock a channel (restore send message permissions)')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to unlock (optional - defaults to current channel)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('lockall')
                .setDescription('Lock all text channels in the server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unlockall')
                .setDescription('Unlock all text channels in the server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('hide')
                .setDescription('Hide a channel (remove view permissions)')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to hide (optional - defaults to current channel)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unhide')
                .setDescription('Unhide a channel (restore view permissions)')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to unhide (optional - defaults to current channel)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('hideall')
                .setDescription('Hide all channels in the server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unhideall')
                .setDescription('Unhide all channels in the server')),

    async execute(interaction) {
        // Check user permissions
        const requiredUserPerms = [
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.UseApplicationCommands
        ];

        for (const perm of requiredUserPerms) {
            if (!interaction.member.permissions.has(perm)) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('❌ You need the "Manage Channels", "View Channel", "Send Messages", and "Use Application Commands" permissions to use this command.')
                    );

                return await interaction.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true
                });
            }
        }

        // Check bot permissions
        const requiredBotPerms = [
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.UseApplicationCommands
        ];

        for (const perm of requiredBotPerms) {
            if (!interaction.guild.members.me.permissions.has(perm)) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('❌ I need the "Manage Channels", "View Channel", "Send Messages", and "Use Application Commands" permissions to execute this command.')
                    );

                return await interaction.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true
                });
            }
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'create':
                    await handleCreate(interaction);
                    break;
                case 'delete':
                    await handleDelete(interaction);
                    break;
                case 'clone':
                    await handleClone(interaction);
                    break;
                case 'nuke':
                    await handleNuke(interaction);
                    break;
                case 'lock':
                    await handleLock(interaction);
                    break;
                case 'unlock':
                    await handleUnlock(interaction);
                    break;
                case 'lockall':
                    await handleLockAll(interaction);
                    break;
                case 'unlockall':
                    await handleUnlockAll(interaction);
                    break;
                case 'hide':
                    await handleHide(interaction);
                    break;
                case 'unhide':
                    await handleUnhide(interaction);
                    break;
                case 'hideall':
                    await handleHideAll(interaction);
                    break;
                case 'unhideall':
                    await handleUnhideAll(interaction);
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
            console.error('Error in channel command:', error);
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

async function handleCreate(interaction) {
    await interaction.deferReply();

    const channelType = interaction.options.getString('type');
    const channelName = interaction.options.getString('name');

    try {
        const channelTypeMap = {
            'text': ChannelType.GuildText,
            'voice': ChannelType.GuildVoice
        };

        const newChannel = await interaction.guild.channels.create({
            name: channelName,
            type: channelTypeMap[channelType],
            reason: `Channel created by ${interaction.user.tag} (${interaction.user.id})`
        });

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('✅ **Channel Created Successfully**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Channel:** <#${newChannel.id}>\n**Type:** ${channelType === 'text' ? 'Text Channel' : 'Voice Channel'}\n**ID:** ${newChannel.id}\n**Created by:** ${interaction.user.tag}`)
            );

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error creating channel:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to create the channel. Please check my permissions and try again.')
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}

async function handleDelete(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const targetChannel = interaction.options.getChannel('channel');

    try {
        if (!targetChannel.deletable) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ I cannot delete this channel. It may be protected or I lack permissions.')
                );

            return await interaction.editReply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
        }

        const channelInfo = {
            name: targetChannel.name,
            type: targetChannel.type,
            id: targetChannel.id
        };

        await targetChannel.delete(`Channel deleted by ${interaction.user.tag} (${interaction.user.id})`);

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('✅ **Channel Deleted Successfully**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Channel Name:** ${channelInfo.name}\n**Channel ID:** ${channelInfo.id}\n**Deleted by:** ${interaction.user.tag}`)
            );

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error deleting channel:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to delete the channel. Please check my permissions and try again.')
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}

async function handleClone(interaction) {
    await interaction.deferReply();

    const sourceChannel = interaction.options.getChannel('channel');

    try {
        const clonedChannel = await sourceChannel.clone({
            name: `${sourceChannel.name}-clone`,
            reason: `Channel cloned by ${interaction.user.tag} (${interaction.user.id})`
        });

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('✅ **Channel Cloned Successfully**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Original Channel:** <#${sourceChannel.id}>\n**Cloned Channel:** <#${clonedChannel.id}>\n**Cloned by:** ${interaction.user.tag}`)
            );

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error cloning channel:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to clone the channel. Please check my permissions and try again.')
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}

async function handleNuke(interaction) {
    await interaction.deferReply();

    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    try {
        // Store channel information
        const channelData = {
            name: targetChannel.name,
            type: targetChannel.type,
            topic: targetChannel.topic,
            position: targetChannel.position,
            parent: targetChannel.parent,
            permissionOverwrites: targetChannel.permissionOverwrites.cache.clone(),
            nsfw: targetChannel.nsfw,
            rateLimitPerUser: targetChannel.rateLimitPerUser
        };

        // Delete the original channel
        await targetChannel.delete(`Channel nuked by ${interaction.user.tag} (${interaction.user.id})`);

        // Recreate the channel with same settings
        const newChannel = await interaction.guild.channels.create({
            name: channelData.name,
            type: channelData.type,
            topic: channelData.topic,
            position: channelData.position,
            parent: channelData.parent,
            permissionOverwrites: Array.from(channelData.permissionOverwrites.values()),
            nsfw: channelData.nsfw,
            rateLimitPerUser: channelData.rateLimitPerUser,
            reason: `Channel nuked by ${interaction.user.tag} (${interaction.user.id})`
        });

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('💥 **Channel Nuked Successfully**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Channel:** <#${newChannel.id}>\n**Nuked by:** ${interaction.user.tag}`)
            );

        await newChannel.send({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error nuking channel:', error);
        
        // Try to send to a fallback channel or DM
        try {
            const generalChannel = interaction.guild.channels.cache.find(ch => ch.name === 'general' && ch.type === ChannelType.GuildText);
            const fallbackChannel = generalChannel || interaction.guild.systemChannel || interaction.guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText).first();
            
            if (fallbackChannel) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`❌ Failed to nuke channel. Error occurred while processing the request by ${interaction.user.tag}.`)
                    );

                await fallbackChannel.send({ 
                    components: [errorContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
            }
        } catch {
            // If all else fails, ignore the error
        }
    }
}

async function handleLock(interaction) {
    await interaction.deferReply();

    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    try {
        await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: false
        }, {
            reason: `Channel locked by ${interaction.user.tag} (${interaction.user.id})`
        });

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('🔒 **Channel Locked**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Channel:** <#${targetChannel.id}>\n**Locked by:** ${interaction.user.tag}`)
            );

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error locking channel:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to lock the channel. Please check my permissions and try again.')
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}

async function handleUnlock(interaction) {
    await interaction.deferReply();

    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    try {
        await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: null
        }, {
            reason: `Channel unlocked by ${interaction.user.tag} (${interaction.user.id})`
        });

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('🔓 **Channel Unlocked**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Channel:** <#${targetChannel.id}>\n**Unlocked by:** ${interaction.user.tag}`)
            );

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error unlocking channel:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to unlock the channel. Please check my permissions and try again.')
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}

async function handleLockAll(interaction) {
    await interaction.deferReply();

    try {
        const textChannels = interaction.guild.channels.cache.filter(channel => channel.type === ChannelType.GuildText);
        let lockedCount = 0;
        let failedCount = 0;

        for (const channel of textChannels.values()) {
            try {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    SendMessages: false
                }, {
                    reason: `All channels locked by ${interaction.user.tag} (${interaction.user.id})`
                });
                lockedCount++;
            } catch {
                failedCount++;
            }
        }

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('🔒 **Channels Locked**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Successfully Locked:** ${lockedCount}\n**Failed:** ${failedCount}\n**Locked by:** ${interaction.user.tag}`)
            );

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error locking all channels:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to lock all channels. Please check my permissions and try again.')
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}

async function handleUnlockAll(interaction) {
    await interaction.deferReply();

    try {
        const textChannels = interaction.guild.channels.cache.filter(channel => channel.type === ChannelType.GuildText);
        let unlockedCount = 0;
        let failedCount = 0;

        for (const channel of textChannels.values()) {
            try {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    SendMessages: null
                }, {
                    reason: `All channels unlocked by ${interaction.user.tag} (${interaction.user.id})`
                });
                unlockedCount++;
            } catch {
                failedCount++;
            }
        }

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('🔓 **Channels Unlocked**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Successfully Unlocked:** ${unlockedCount}\n**Failed:** ${failedCount}\n**Unlocked by:** ${interaction.user.tag}`)
            );

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error unlocking all channels:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to unlock all channels. Please check my permissions and try again.')
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}

async function handleHide(interaction) {
    await interaction.deferReply();

    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    try {
        await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            ViewChannel: false
        }, {
            reason: `Channel hidden by ${interaction.user.tag} (${interaction.user.id})`
        });

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('👁️ **Channel Hidden**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Channel:** <#${targetChannel.id}>\n**Hidden by:** ${interaction.user.tag}`)
            );

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error hiding channel:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to hide the channel. Please check my permissions and try again.')
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}

async function handleUnhide(interaction) {
    await interaction.deferReply();

    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    try {
        await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            ViewChannel: null
        }, {
            reason: `Channel unhidden by ${interaction.user.tag} (${interaction.user.id})`
        });

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('👁️ **Channel Unhidden**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Channel:** <#${targetChannel.id}>\n**Unhidden by:** ${interaction.user.tag}`)
            );

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error unhiding channel:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to unhide the channel. Please check my permissions and try again.')
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}

async function handleHideAll(interaction) {
    await interaction.deferReply();

    try {
        const allChannels = interaction.guild.channels.cache.filter(channel => 
            channel.type === ChannelType.GuildText || 
            channel.type === ChannelType.GuildVoice ||
            channel.type === ChannelType.GuildCategory
        );
        let hiddenCount = 0;
        let failedCount = 0;

        for (const channel of allChannels.values()) {
            try {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    ViewChannel: false
                }, {
                    reason: `All channels hidden by ${interaction.user.tag} (${interaction.user.id})`
                });
                hiddenCount++;
            } catch {
                failedCount++;
            }
        }

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('👁️ **Channels Hidden**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Successfully Hidden:** ${hiddenCount}\n**Failed:** ${failedCount}\n**Hidden by:** ${interaction.user.tag}`)
            );

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error hiding all channels:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to hide all channels. Please check my permissions and try again.')
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}

async function handleUnhideAll(interaction) {
    await interaction.deferReply();

    try {
        const allChannels = interaction.guild.channels.cache.filter(channel => 
            channel.type === ChannelType.GuildText || 
            channel.type === ChannelType.GuildVoice ||
            channel.type === ChannelType.GuildCategory
        );
        let unhiddenCount = 0;
        let failedCount = 0;

        for (const channel of allChannels.values()) {
            try {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    ViewChannel: null
                }, {
                    reason: `All channels unhidden by ${interaction.user.tag} (${interaction.user.id})`
                });
                unhiddenCount++;
            } catch {
                failedCount++;
            }
        }

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('👁️ **Channels Unhidden**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Successfully Unhidden:** ${unhiddenCount}\n**Failed:** ${failedCount}\n**Unhidden by:** ${interaction.user.tag}`)
            );

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error unhiding all channels:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to unhide all channels. Please check my permissions and try again.')
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}
