
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    return parseInt((client.config?.EmbedColor || '#0099ff').replace('#', ''), 16);
}

function getErrorColor(client) {
    return parseInt((client.config?.ErrorColor || '#ff0000').replace('#', ''), 16);
}

// In-memory storage for AFK users (in production, use a database)
const afkUsers = new Map();

/**
 * Container pagination
 *
 * @param {BaseInteraction} interaction - The interaction that triggers the pagination.
 * @param {Array} components - The containers to show.
 * @param {boolean} ephemeral - Whether the pagination will be ephemeral or not.
 */
async function pagination(interaction, components, ephemeral) {
    try {
        if (!interaction || !components || components.length === 0) {
            throw new Error('[PAGINATION] Invalid args');
        }

        if (components.length === 1) {
            return await interaction.editReply({ 
                components: components, 
                flags: MessageFlags.IsComponentsV2,
                fetchReply: true 
            });
        }

        let index = 0;

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

        const msg = await interaction.editReply({ 
            components: [components[index], buttons], 
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
            } else if (i.customId === 'pageprev') {
                if (index > 0) index--;
            } else if (i.customId === 'pagenext') {
                if (index < components.length - 1) index++;
            } else if (i.customId === 'pagelast') {
                index = components.length - 1;
            }

            pageCount.setLabel(`${index + 1}/${components.length}`);

            // Update button states
            first.setDisabled(index === 0);
            prev.setDisabled(index === 0);
            next.setDisabled(index === components.length - 1);
            last.setDisabled(index === components.length - 1);

            await i.update({ 
                components: [components[index], buttons],
                flags: MessageFlags.IsComponentsV2
            }).catch(err => {
                console.error(`[ERROR] ${err.message}`);
            });

            collector.resetTimer();
        });

        collector.on("end", () => {
            return interaction.editReply({ 
                components: [components[index]], 
                flags: MessageFlags.IsComponentsV2
            }).catch(err => {
                console.error(`[ERROR] ${err.message}`);
            });
        });

        return msg;

    } catch (e) {
        console.error(`[ERROR] ${e}`);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('AFK system commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set your AFK status')
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for being AFK (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all AFK users in the server')),

    async execute(interaction) {
        // Check if user has required permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ You need "Use Application Commands" permission to use this command.')
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
                case 'set':
                    await handleSetAFK(interaction);
                    break;
                case 'list':
                    await handleListAFK(interaction);
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
            console.error('Error in afk command:', error);
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

    // Export the afkUsers map and functions for use in messageCreate
    afkUsers,
    getEmbedColor,
    getErrorColor
};

async function handleSetAFK(interaction) {
    await interaction.deferReply();

    const reason = interaction.options.getString('reason') || 'No reason provided';
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // Create unique key for guild-user combination
    const key = `${guildId}-${userId}`;

    // Check if user is already AFK
    if (afkUsers.has(key)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ You are already marked as AFK! Send a message to remove your AFK status.')
            );

        return await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }

    // Set user as AFK
    const afkData = {
        userId: userId,
        guildId: guildId,
        username: interaction.user.username,
        displayName: interaction.member.displayName || interaction.user.username,
        reason: reason,
        timestamp: Date.now(),
        mentions: 0
    };

    afkUsers.set(key, afkData);

    // Try to add [AFK] prefix to nickname
    try {
        const member = interaction.member;
        const currentNick = member.displayName;
        
        if (!currentNick.startsWith('[AFK]')) {
            const newNick = `[AFK] ${currentNick}`;
            if (newNick.length <= 32) { // Discord nickname limit
                await member.setNickname(newNick, 'User set AFK status');
            }
        }
    } catch (error) {
        // Ignore nickname errors (permissions, hierarchy, etc.)
    }

    const successContainer = new ContainerBuilder()
        .setAccentColor(getEmbedColor(interaction.client))
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent('💤 **AFK Status Set**')
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**User:** ${interaction.user}\n**Reason:** ${reason}\n**Set:** <t:${Math.floor(Date.now() / 1000)}:R>`)
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent('Send any message to remove your AFK status!')
        );

    await interaction.editReply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2
    });
}

async function handleListAFK(interaction) {
    await interaction.deferReply();

    const guildId = interaction.guild.id;
    
    // Get all AFK users for this guild
    const guildAFKUsers = Array.from(afkUsers.values()).filter(user => user.guildId === guildId);

    if (guildAFKUsers.length === 0) {
        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('💤 **AFK Users**\n\nNo users are currently AFK in this server.')
            );

        return await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }

    // Create containers for pagination
    const containers = [];
    const itemsPerPage = 10;
    const totalPages = Math.ceil(guildAFKUsers.length / itemsPerPage);

    for (let page = 0; page < totalPages; page++) {
        const start = page * itemsPerPage;
        const end = start + itemsPerPage;
        const currentUsers = guildAFKUsers.slice(start, end);

        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client));

        // Add title
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`💤 **AFK Users in ${interaction.guild.name}**`)
        );

        container.addSeparatorComponents(separator => separator);

        // Create user list
        let userList = '';
        currentUsers.forEach((user, index) => {
            const globalIndex = start + index + 1;
            const afkTime = Math.floor(user.timestamp / 1000);
            const mentions = user.mentions > 0 ? ` (${user.mentions} mentions)` : '';
            
            userList += `**${globalIndex}.** <@${user.userId}>${mentions}\n`;
            userList += `   • **Reason:** ${user.reason}\n`;
            userList += `   • **Since:** <t:${afkTime}:R>\n\n`;
        });

        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(userList)
        );

        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`• Page ${page + 1}/${totalPages} | Total: ${guildAFKUsers.length} AFK users`)
        );

        containers.push(container);
    }

    // Use pagination if multiple pages
    if (containers.length > 1) {
        await pagination(interaction, containers, false);
    } else {
        await interaction.editReply({
            components: containers,
            flags: MessageFlags.IsComponentsV2
        });
    }
}
