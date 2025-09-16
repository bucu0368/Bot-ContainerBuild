
const { SlashCommandBuilder, ContainerBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    return client.config?.EmbedColor || '#0099ff';
}

function getErrorColor(client) {
    return client.config?.ErrorColor || '#ff0000';
}

// Helper function to format uptime
function formatUptime(uptime) {
    const days = Math.floor(uptime / (24 * 60 * 60 * 1000));
    const hours = Math.floor((uptime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((uptime % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((uptime % (60 * 1000)) / 1000);
    
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bot')
        .setDescription('Bot management and information commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('invite')
                .setDescription('Get the bot invite link'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('uptime')
                .setDescription('Check how long the bot has been running'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('help')
                .setDescription('Get help with bot commands'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get information about the bot'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Get bot statistics'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('serverlist')
                .setDescription('List all servers the bot is in (Owner only)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('Make the bot leave a server (Owner only)')
                .addStringOption(option =>
                    option
                        .setName('serverid')
                        .setDescription('The ID of the server to leave')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('support')
                .setDescription('Get the support server link'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('feedback')
                .setDescription('Send feedback to the developers')
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('Your feedback message')
                        .setRequired(true))),

    async execute(interaction) {

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'invite':
                    await handleInvite(interaction);
                    break;
                case 'uptime':
                    await handleUptime(interaction);
                    break;
                case 'help':
                    await handleHelp(interaction);
                    break;
                case 'info':
                    await handleInfo(interaction);
                    break;
                case 'stats':
                    await handleStats(interaction);
                    break;
                case 'serverlist':
                    await handleServerList(interaction);
                    break;
                case 'leave':
                    await handleLeave(interaction);
                    break;
                case 'support':
                    await handleSupport(interaction);
                    break;
                case 'feedback':
                    await handleFeedback(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in bot command:', error);
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

async function handleInvite(interaction) {
    const clientId = interaction.client.config.clientId;
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=536870912&scope=bot%20applications.commands`;
    
    const { buildContainerFromEmbedShape } = require('../utils/container');
    const { replyV2 } = require('../utils/sendV2');
    
    const container = buildContainerFromEmbedShape({
        title: '🔗 Bot Invite Link',
        description: `[Click here to invite me to your server!](${inviteUrl})`,
        color: getEmbedColor(interaction.client),
        fields: [{
            name: 'Permissions Included',
            value: '• Manage Webhooks\n• Send Messages\n• Use Slash Commands',
            inline: false
        }],
        timestamp: new Date()
    });

    await replyV2(interaction, { embed: container });
}

async function handleUptime(interaction) {
    const uptime = interaction.client.uptime;
    const formattedUptime = formatUptime(uptime);
    
    const { buildContainerFromEmbedShape } = require('../utils/container');
    const { replyV2 } = require('../utils/sendV2');
    
    const container = buildContainerFromEmbedShape({
        title: '⏰ Bot Uptime',
        description: `I've been running for **${formattedUptime}**`,
        color: getEmbedColor(interaction.client),
        timestamp: new Date()
    });

    await replyV2(interaction, { embed: container });
}

async function handleHelp(interaction) {
    const { buildContainerFromEmbedShape } = require('../utils/container');
    const { replyV2 } = require('../utils/sendV2');
    
    const container = buildContainerFromEmbedShape({
        title: '🤖 Bot Help',
        description: 'Here are all the available commands:',
        color: getEmbedColor(interaction.client),
        fields: [
            {
                name: '🔗 Webhook Commands',
                value: '`/webhook create` - Create a new webhook\n`/webhook delete` - Delete a webhook\n`/webhook list` - List all webhooks\n`/webhook say` - Send a message through a webhook',
                inline: false
            },
            {
                name: '🤖 Bot Commands',
                value: '`/bot invite` - Get bot invite link\n`/bot uptime` - Check bot uptime\n`/bot help` - Show this help message\n`/bot info` - Get bot information\n`/bot stats` - Get bot statistics',
                inline: false
            },
            {
                name: '👑 Owner Only Commands',
                value: '`/bot serverlist` - List all servers\n`/bot leave <serverid>` - Leave a server',
                inline: false
            }
        ],
        timestamp: new Date(),
        footer: { text: 'Use the commands to get started!' }
    });

    await replyV2(interaction, { embed: container });
}

async function handleInfo(interaction) {
    const { buildContainerFromEmbedShape } = require('../utils/container');
    const { replyV2 } = require('../utils/sendV2');
    
    const container = buildContainerFromEmbedShape({
        title: '📋 Bot Information',
        color: getEmbedColor(interaction.client),
        fields: [
            { name: 'Bot Name', value: interaction.client.user.tag, inline: true },
            { name: 'Bot ID', value: interaction.client.user.id, inline: true },
            { name: 'Created', value: `<t:${Math.floor(interaction.client.user.createdAt.getTime() / 1000)}:R>`, inline: true },
            { name: 'Node.js Version', value: process.version, inline: true },
            { name: 'Discord.js Version', value: require('discord.js').version, inline: true },
            { name: 'Platform', value: process.platform, inline: true }
        ],
        timestamp: new Date()
    });

    await replyV2(interaction, { embed: container });
}

async function handleStats(interaction) {
    const guilds = interaction.client.guilds.cache.size;
    const users = interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const channels = interaction.client.channels.cache.size;
    const commands = interaction.client.commands.size;
    
    const { buildContainerFromEmbedShape } = require('../utils/container');
    const { replyV2 } = require('../utils/sendV2');
    
    const container = buildContainerFromEmbedShape({
        title: '📊 Bot Statistics',
        color: getEmbedColor(interaction.client),
        fields: [
            { name: '🏠 Servers', value: guilds.toString(), inline: true },
            { name: '👥 Users', value: users.toLocaleString(), inline: true },
            { name: '📢 Channels', value: channels.toString(), inline: true },
            { name: '⚡ Commands', value: commands.toString(), inline: true },
            { name: '🏓 Ping', value: `${interaction.client.ws.ping}ms`, inline: true },
            { name: '💾 Memory', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true }
        ],
        timestamp: new Date()
    });

    await replyV2(interaction, { embed: container });
}

async function handleServerList(interaction) {
    // Check if user is the owner
    if (interaction.user.id !== interaction.client.config.OwnerID) {
        return await interaction.reply({
            content: '❌ This command is only available to the bot owner.',
            ephemeral: true
        });
    }

    await interaction.deferReply({ ephemeral: true });

    const guilds = Array.from(interaction.client.guilds.cache.values());
    
    if (guilds.length === 0) {
        return await interaction.editReply({
            content: '📭 Bot is not in any servers.'
        });
    }

    const itemsPerPage = 5;
    let currentPage = 0;
    const totalPages = Math.ceil(guilds.length / itemsPerPage);

    function createEmbed(page) {
        const start = page * itemsPerPage;
        const end = start + itemsPerPage;
        const currentGuilds = guilds.slice(start, end);

        const { buildContainerFromEmbedShape } = require('../utils/container');
        
        const fields = [];

        currentGuilds.forEach((guild, index) => {
            const globalIndex = start + index + 1;
            fields.push({
                name: `${globalIndex}. ${guild.name}`,
                value: `**ID:** \`${guild.id}\`\n**Members:** ${guild.memberCount}\n**Owner:** <@${guild.ownerId}>\n**Created:** <t:${Math.floor(guild.createdAt.getTime() / 1000)}:R>`,
                inline: false
            });
        });

        return buildContainerFromEmbedShape({
            title: `🏠 Server List (Page ${page + 1}/${totalPages})`,
            color: getEmbedColor(interaction.client),
            timestamp: new Date(),
            footer: { text: `Total: ${guilds.length} servers` },
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
}

async function handleLeave(interaction) {
    // Check if user is the owner
    if (interaction.user.id !== interaction.client.config.OwnerID) {
        return await interaction.reply({
            content: '❌ This command is only available to the bot owner.',
            ephemeral: true
        });
    }

    const serverId = interaction.options.getString('serverid');
    
    try {
        const guild = interaction.client.guilds.cache.get(serverId);
        
        if (!guild) {
            return await interaction.reply({
                content: '❌ I am not in a server with that ID, or the ID is invalid.',
                ephemeral: true
            });
        }

        const guildName = guild.name;
        const guildMemberCount = guild.memberCount;
        
        // Don't leave the current server if the command is being used there
        if (guild.id === interaction.guild.id) {
            return await interaction.reply({
                content: '❌ I cannot leave this server while you are using commands in it.',
                ephemeral: true
            });
        }

        await guild.leave();
        
        const { buildContainerFromEmbedShape } = require('../utils/container');
        const { replyV2 } = require('../utils/sendV2');
        
        const container = buildContainerFromEmbedShape({
            title: '✅ Left Server Successfully',
            color: getErrorColor(interaction.client),
            fields: [
                { name: 'Server Name', value: guildName, inline: true },
                { name: 'Server ID', value: serverId, inline: true },
                { name: 'Member Count', value: guildMemberCount.toString(), inline: true },
                { name: 'Left by', value: interaction.user.tag, inline: true }
            ],
            timestamp: new Date()
        });

        await replyV2(interaction, { embed: container, ephemeral: true });
    } catch (error) {
        console.error('Error leaving server:', error);
        await interaction.reply({
            content: '❌ An error occurred while trying to leave the server.',
            ephemeral: true
        });
    }
}

async function handleSupport(interaction) {
    const supportLink = interaction.client.config.SupportServerLink;
    
    if (!supportLink || supportLink === "https://discord.gg/your-support-server") {
        return await interaction.reply({
            content: '❌ Support server link is not configured.',
            ephemeral: true
        });
    }
    
    const { buildContainerFromEmbedShape } = require('../utils/container');
    const { replyV2 } = require('../utils/sendV2');
    
    const container = buildContainerFromEmbedShape({
        title: '🆘 Support Server',
        description: `Need help? Join our support server!\n\n[Click here to join](${supportLink})`,
        color: getEmbedColor(interaction.client),
        fields: [{
            name: '💡 What you can get help with:',
            value: '• Bot commands and features\n• Technical issues\n• Feature requests\n• General questions',
            inline: false
        }],
        timestamp: new Date()
    });

    await replyV2(interaction, { embed: container });
}

async function handleFeedback(interaction) {
    const feedbackChannelId = interaction.client.config.FeedBackChannelID;
    const message = interaction.options.getString('message');
    
    if (!feedbackChannelId || feedbackChannelId === "1234567890123456789") {
        return await interaction.reply({
            content: '❌ Feedback channel is not configured.',
            ephemeral: true
        });
    }
    
    try {
        const feedbackChannel = await interaction.client.channels.fetch(feedbackChannelId);
        
        if (!feedbackChannel) {
            return await interaction.reply({
                content: '❌ Feedback channel not found.',
                ephemeral: true
            });
        }

        const { buildContainerFromEmbedShape } = require('../utils/container');
        const { sendV2 } = require('../utils/sendV2');
        
        const feedbackContainer = buildContainerFromEmbedShape({
            title: '💬 New Feedback Received',
            color: getEmbedColor(interaction.client),
            fields: [
                { name: 'From User', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                { name: 'Server', value: `${interaction.guild.name} (${interaction.guild.id})`, inline: true },
                { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true },
                { name: 'Feedback Message', value: message, inline: false }
            ],
            timestamp: new Date()
        });

        await sendV2(feedbackChannel, { embed: feedbackContainer });
        
        const confirmContainer = buildContainerFromEmbedShape({
            title: '✅ Feedback Sent Successfully',
            description: 'Thank you for your feedback! Your message has been sent to the developers.',
            color: getEmbedColor(interaction.client),
            fields: [{
                name: 'Your Message',
                value: message.length > 1024 ? message.substring(0, 1021) + '...' : message,
                inline: false
            }],
            timestamp: new Date()
        });

        await replyV2(interaction, { embed: confirmContainer, ephemeral: true });
    } catch (error) {
        console.error('Error sending feedback:', error);
        await interaction.reply({
            content: '❌ An error occurred while sending your feedback. Please try again later.',
            ephemeral: true
        });
    }
}
