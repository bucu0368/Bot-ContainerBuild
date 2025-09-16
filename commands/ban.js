const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    return client.config?.EmbedColor;
}

function getErrorColor(client) {
    return client.config?.ErrorColor;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban management commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Ban a user from the server')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to ban')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the ban')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Show all banned users in this server')),

    async execute(interaction) {
        // Check if user has ban members permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return await interaction.reply({
                content: '❌ You need the "Ban Members" permission to use this command.',
                ephemeral: true
            });
        }

        // Check if bot has ban members permission
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            return await interaction.reply({
                content: '❌ I need the "Ban Members" permission to execute this command.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'user':
                    await handleBanUser(interaction);
                    break;
                case 'list':
                    await handleBanList(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in ban command:', error);
            const reply = {
                content: '❌ An error occurred while executing the command.',
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

async function handleBanUser(interaction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
        // Check if user is trying to ban themselves
        if (targetUser.id === interaction.user.id) {
            return await interaction.editReply({
                content: '❌ You cannot ban yourself.'
            });
        }

        // Check if user is trying to ban the bot
        if (targetUser.id === interaction.client.user.id) {
            return await interaction.editReply({
                content: '❌ I cannot ban myself.'
            });
        }

        // Get member object to check permissions and hierarchy
        let targetMember;
        try {
            targetMember = await interaction.guild.members.fetch(targetUser.id);
        } catch {
            // User is not in the server, we can still ban them
            targetMember = null;
        }

        // If user is in the server, check role hierarchy
        if (targetMember) {
            // Check if target has higher or equal role than executor
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
                return await interaction.editReply({
                    content: '❌ You cannot ban this user as they have a higher or equal role than you.'
                });
            }

            // Check if target has higher or equal role than bot
            if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
                return await interaction.editReply({
                    content: '❌ I cannot ban this user as they have a higher or equal role than me.'
                });
            }

            // Check if target is the server owner
            if (targetUser.id === interaction.guild.ownerId) {
                return await interaction.editReply({
                    content: '❌ You cannot ban the server owner.'
                });
            }
        }

        // Check if user is already banned
        try {
            await interaction.guild.bans.fetch(targetUser.id);
            return await interaction.editReply({
                content: '❌ This user is already banned.'
            });
        } catch {
            // User is not banned, continue with ban process
        }

        // Try to send DM to user before banning (if they're in the server)
        let dmSent = false;
        if (targetMember) {
            try {
                const { buildContainerFromEmbedShape } = require('../utils/container');
                const { sendV2 } = require('../utils/sendV2');
                
                const dmContainer = buildContainerFromEmbedShape({
                    title: '🔨 You have been banned',
                    color: getEmbedColor(interaction.client),
                    fields: [
                        { name: 'Server', value: interaction.guild.name, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Banned by', value: interaction.user.tag, inline: true }
                    ],
                    timestamp: new Date()
                });

                await sendV2(targetUser, { embed: dmContainer });
                dmSent = true;
            } catch {
                // User has DMs disabled or blocked the bot
                dmSent = false;
            }
        }

        // Execute the ban
        await interaction.guild.members.ban(targetUser, {
            reason: `${reason} | Banned by: ${interaction.user.tag} (${interaction.user.id})`
        });

        // Create success container
        const { buildContainerFromEmbedShape } = require('../utils/container');
        const { editReplyV2 } = require('../utils/sendV2');
        
        const successContainer = buildContainerFromEmbedShape({
            title: '🔨 User Banned Successfully',
            color: getEmbedColor(interaction.client),
            fields: [
                { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                { name: 'Reason', value: reason, inline: true },
                { name: 'Banned by', value: interaction.user.tag, inline: true },
                { name: 'DM Notification', value: dmSent ? '✅ Sent' : '❌ Failed to send', inline: true }
            ],
            timestamp: new Date(),
            footer: { text: `User ID: ${targetUser.id}` }
        });

        await editReplyV2(interaction, { embed: successContainer });

    } catch (error) {
        console.error('Error banning user:', error);
        await interaction.editReply({
            content: '❌ Failed to ban the user. Please check my permissions and try again.'
        });
    }
}

async function handleBanList(interaction) {
    await interaction.deferReply();

    try {
        const bans = await interaction.guild.bans.fetch();
        const banArray = Array.from(bans.values());

        if (banArray.length === 0) {
            return await interaction.editReply({
                content: '📭 No banned users found in this server.'
            });
        }

        const itemsPerPage = 5;
        let currentPage = 0;
        const totalPages = Math.ceil(banArray.length / itemsPerPage);

        function createEmbed(page) {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentBans = banArray.slice(start, end);

            const { buildContainerFromEmbedShape } = require('../utils/container');
            
            const fields = [];

            currentBans.forEach((ban, index) => {
                const globalIndex = start + index + 1;
                const reason = ban.reason || 'No reason provided';
                fields.push({
                    name: `${globalIndex}. ${ban.user.tag}`,
                    value: `**ID:** \`${ban.user.id}\`\n**Reason:** ${reason.substring(0, 100)}${reason.length > 100 ? '...' : ''}`,
                    inline: false
                });
            });

            return buildContainerFromEmbedShape({
                title: `🔨 Banned Users (Page ${page + 1}/${totalPages})`,
                color: getEmbedColor(interaction.client),
                timestamp: new Date(),
                footer: { text: `Total: ${banArray.length} banned users` },
                fields: fields
            });
        }

        function createButtons(page) {
            const row = new ActionRowBuilder();
            
            const prevButton = new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0);

            const nextButton = new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === totalPages - 1);

            row.addComponents(prevButton, nextButton);
            return row;
        }

        const { editReplyV2 } = require('../utils/sendV2');
        
        const container = createEmbed(currentPage);
        const components = totalPages > 1 ? [createButtons(currentPage)] : [];

        const response = await editReplyV2(interaction, {
            embed: container,
            components: components
        });

        if (totalPages > 1) {
            const collector = response.createMessageComponentCollector({
                time: 60000
            });

            collector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.user.id !== interaction.user.id) {
                    return await buttonInteraction.reply({
                        content: '❌ You cannot use these buttons.',
                        ephemeral: true
                    });
                }

                if (buttonInteraction.customId === 'prev') {
                    currentPage--;
                } else if (buttonInteraction.customId === 'next') {
                    currentPage++;
                }

                const { updateV2 } = require('../utils/sendV2');
                
                const newContainer = createEmbed(currentPage);
                const newComponents = [createButtons(currentPage)];

                await updateV2(buttonInteraction, {
                    embed: newContainer,
                    components: newComponents
                });
            });

            collector.on('end', async () => {
                try {
                    await interaction.editReply({ components: [] });
                } catch (error) {
                    // Ignore error if message was already deleted
                }
            });
        }
    } catch (error) {
        console.error('Error listing bans:', error);
        await interaction.editReply({
            content: '❌ Failed to fetch banned users. Make sure I have permission to view the ban list.'
        });
    }
}