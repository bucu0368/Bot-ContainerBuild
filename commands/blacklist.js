
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Blacklist data file
const blacklistFile = path.join(__dirname, '..', 'blacklist.json');

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

function getErrorColor(client) {
    const color = client.config?.ErrorColor || '#ff0000';
    return parseInt(color.replace('#', ''), 16);
}

// Load blacklist data
function loadBlacklist() {
    try {
        if (fs.existsSync(blacklistFile)) {
            return JSON.parse(fs.readFileSync(blacklistFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading blacklist:', error);
    }
    return { users: [], servers: [] };
}

// Save blacklist data
function saveBlacklist(data) {
    try {
        fs.writeFileSync(blacklistFile, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving blacklist:', error);
        return false;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Manage bot blacklist (Owner only)')
        .addSubcommandGroup(subcommandGroup =>
            subcommandGroup
                .setName('user')
                .setDescription('Manage user blacklist')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Add a user to blacklist')
                        .addUserOption(option =>
                            option
                                .setName('member')
                                .setDescription('User to blacklist')
                                .setRequired(false))
                        .addStringOption(option =>
                            option
                                .setName('memberid')
                                .setDescription('User ID to blacklist')
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setDescription('Remove a user from blacklist')
                        .addUserOption(option =>
                            option
                                .setName('member')
                                .setDescription('User to remove from blacklist')
                                .setRequired(false))
                        .addStringOption(option =>
                            option
                                .setName('memberid')
                                .setDescription('User ID to remove from blacklist')
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('List all blacklisted users')))
        .addSubcommandGroup(subcommandGroup =>
            subcommandGroup
                .setName('server')
                .setDescription('Manage server blacklist')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Add a server to blacklist')
                        .addStringOption(option =>
                            option
                                .setName('serverid')
                                .setDescription('Server ID to blacklist')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setDescription('Remove a server from blacklist')
                        .addStringOption(option =>
                            option
                                .setName('serverid')
                                .setDescription('Server ID to remove from blacklist')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('List all blacklisted servers'))),

    async execute(interaction) {
        // Check if user is bot owner
        const ownerId = interaction.client.config?.OwnerID;
        if (!ownerId || interaction.user.id !== ownerId) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ Only the bot owner can use this command.')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommandGroup === 'user') {
                switch (subcommand) {
                    case 'add':
                        await handleUserAdd(interaction);
                        break;
                    case 'remove':
                        await handleUserRemove(interaction);
                        break;
                    case 'list':
                        await handleUserList(interaction);
                        break;
                }
            } else if (subcommandGroup === 'server') {
                switch (subcommand) {
                    case 'add':
                        await handleServerAdd(interaction);
                        break;
                    case 'remove':
                        await handleServerRemove(interaction);
                        break;
                    case 'list':
                        await handleServerList(interaction);
                        break;
                }
            }
        } catch (error) {
            console.error('Error in blacklist command:', error);
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

async function handleUserAdd(interaction) {
    const targetUser = interaction.options.getUser('member');
    const memberId = interaction.options.getString('memberid');

    if (!targetUser && !memberId) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Please provide either a user mention or user ID.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    const userId = targetUser ? targetUser.id : memberId;
    const userTag = targetUser ? targetUser.tag : `Unknown User (${userId})`;

    // Check if user is bot owner
    if (userId === interaction.client.config?.OwnerID) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ You cannot blacklist the bot owner.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    const blacklist = loadBlacklist();

    if (blacklist.users.includes(userId)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ This user is already blacklisted.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    blacklist.users.push(userId);
    
    if (saveBlacklist(blacklist)) {
        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('✅ **User Blacklisted Successfully**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**User:** ${userTag}\n**User ID:** ${userId}\n**Added by:** ${interaction.user.tag}`)
            );

        await interaction.reply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    } else {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to save blacklist data.')
            );

        await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }
}

async function handleUserRemove(interaction) {
    const targetUser = interaction.options.getUser('member');
    const memberId = interaction.options.getString('memberid');

    if (!targetUser && !memberId) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Please provide either a user mention or user ID.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    const userId = targetUser ? targetUser.id : memberId;
    const userTag = targetUser ? targetUser.tag : `Unknown User (${userId})`;

    const blacklist = loadBlacklist();
    const userIndex = blacklist.users.indexOf(userId);

    if (userIndex === -1) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ This user is not blacklisted.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    blacklist.users.splice(userIndex, 1);
    
    if (saveBlacklist(blacklist)) {
        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('✅ **User Removed from Blacklist**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**User:** ${userTag}\n**User ID:** ${userId}\n**Removed by:** ${interaction.user.tag}`)
            );

        await interaction.reply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    } else {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to save blacklist data.')
            );

        await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }
}

async function handleUserList(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const blacklist = loadBlacklist();

    if (blacklist.users.length === 0) {
        const emptyContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('📭 **No Blacklisted Users**\n\nThere are no users in the blacklist.')
            );

        return await interaction.editReply({
            components: [emptyContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(blacklist.users.length / itemsPerPage);
    const containers = [];

    // Create containers for each page
    for (let page = 0; page < totalPages; page++) {
        const start = page * itemsPerPage;
        const end = start + itemsPerPage;
        const currentUsers = blacklist.users.slice(start, end);

        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client));

        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`🚫 **Blacklisted Users (Page ${page + 1}/${totalPages})**`)
        );

        container.addSeparatorComponents(separator => separator);

        // Add each user
        for (let i = 0; i < currentUsers.length; i++) {
            const userId = currentUsers[i];
            const globalIndex = start + i + 1;
            
            try {
                const user = await interaction.client.users.fetch(userId).catch(() => null);
                const userDisplay = user ? `${user.tag} (${userId})` : `Unknown User (${userId})`;
                
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**${globalIndex}.** ${userDisplay}`)
                );
            } catch (error) {
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**${globalIndex}.** Unknown User (${userId})`)
                );
            }

            if (i < currentUsers.length - 1) {
                container.addSeparatorComponents(separator => separator);
            }
        }

        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`*Total: ${blacklist.users.length} blacklisted users*`)
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
        await pagination(interaction, containers, true);
    }
}

async function handleServerAdd(interaction) {
    const serverId = interaction.options.getString('serverid');

    // Check if server is current server
    if (serverId === interaction.guild.id) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ You cannot blacklist the current server.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    const blacklist = loadBlacklist();

    if (blacklist.servers.includes(serverId)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ This server is already blacklisted.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    blacklist.servers.push(serverId);
    
    if (saveBlacklist(blacklist)) {
        // Try to get server name
        let serverName = 'Unknown Server';
        try {
            const guild = await interaction.client.guilds.fetch(serverId).catch(() => null);
            if (guild) serverName = guild.name;
        } catch (error) {
            // Server name will remain as 'Unknown Server'
        }

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('✅ **Server Blacklisted Successfully**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Server:** ${serverName}\n**Server ID:** ${serverId}\n**Added by:** ${interaction.user.tag}`)
            );

        await interaction.reply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    } else {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to save blacklist data.')
            );

        await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }
}

async function handleServerRemove(interaction) {
    const serverId = interaction.options.getString('serverid');

    const blacklist = loadBlacklist();
    const serverIndex = blacklist.servers.indexOf(serverId);

    if (serverIndex === -1) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ This server is not blacklisted.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    blacklist.servers.splice(serverIndex, 1);
    
    if (saveBlacklist(blacklist)) {
        // Try to get server name
        let serverName = 'Unknown Server';
        try {
            const guild = await interaction.client.guilds.fetch(serverId).catch(() => null);
            if (guild) serverName = guild.name;
        } catch (error) {
            // Server name will remain as 'Unknown Server'
        }

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('✅ **Server Removed from Blacklist**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Server:** ${serverName}\n**Server ID:** ${serverId}\n**Removed by:** ${interaction.user.tag}`)
            );

        await interaction.reply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    } else {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to save blacklist data.')
            );

        await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }
}

async function handleServerList(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const blacklist = loadBlacklist();

    if (blacklist.servers.length === 0) {
        const emptyContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('📭 **No Blacklisted Servers**\n\nThere are no servers in the blacklist.')
            );

        return await interaction.editReply({
            components: [emptyContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(blacklist.servers.length / itemsPerPage);
    const containers = [];

    // Create containers for each page
    for (let page = 0; page < totalPages; page++) {
        const start = page * itemsPerPage;
        const end = start + itemsPerPage;
        const currentServers = blacklist.servers.slice(start, end);

        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client));

        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`🚫 **Blacklisted Servers (Page ${page + 1}/${totalPages})**`)
        );

        container.addSeparatorComponents(separator => separator);

        // Add each server
        for (let i = 0; i < currentServers.length; i++) {
            const serverId = currentServers[i];
            const globalIndex = start + i + 1;
            
            try {
                const guild = await interaction.client.guilds.fetch(serverId).catch(() => null);
                const serverDisplay = guild ? `${guild.name} (${serverId})` : `Unknown Server (${serverId})`;
                
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**${globalIndex}.** ${serverDisplay}`)
                );
            } catch (error) {
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**${globalIndex}.** Unknown Server (${serverId})`)
                );
            }

            if (i < currentServers.length - 1) {
                container.addSeparatorComponents(separator => separator);
            }
        }

        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`*Total: ${blacklist.servers.length} blacklisted servers*`)
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
        await pagination(interaction, containers, true);
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
                flags: MessageFlags.IsComponentsV2
            });
        }

        var index = 0;

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
            flags: MessageFlags.IsComponentsV2
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

// Export function to check if user/server is blacklisted
module.exports.isBlacklisted = function(userId, serverId) {
    const blacklist = loadBlacklist();
    return blacklist.users.includes(userId) || blacklist.servers.includes(serverId);
};
