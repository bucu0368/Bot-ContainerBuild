
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    return client.config?.EmbedColor || '#0099ff';
}

function getErrorColor(client) {
    return client.config?.ErrorColor || '#ff0000';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announcement')
        .setDescription('Announcement management commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create an announcement')
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('The announcement message')
                        .setRequired(true))
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel to send the announcement to (defaults to current channel)')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        ,

    async execute(interaction) {
        // Check if user has required permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({
                content: '❌ You need "Manage Messages" permission to use this command.',
                ephemeral: true
            });
        }

        // Check if bot has required permissions
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({
                content: '❌ I need "Manage Messages" permission to execute this command.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'create':
                    await handleCreate(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in announcement command:', error);
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

async function handleCreate(interaction) {
    const message = interaction.options.getString('message');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    // Check if bot has permissions in target channel
    if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
        return await interaction.reply({
            content: `❌ I don't have permission to send messages in ${channel}.`,
            ephemeral: true
        });
    }

    try {
        const { buildContainerFromEmbedShape } = require('../utils/container');
        const { sendV2 } = require('../utils/sendV2');

        // Create announcement embed
        const announcementEmbed = buildContainerFromEmbedShape({
            title: '📢・Announcement!',
            description: message,
            color: getEmbedColor(interaction.client),
            timestamp: new Date()
        });

        // Send announcement to target channel
        await sendV2(channel, { embed: announcementEmbed });

        // Send success message
        interaction.client.succNormal({
            text: 'Announcement has been sent successfully!',
            fields: [
                {
                    name: '📘┆Channel',
                    value: `${channel} (${channel.name})`,
                    inline: true
                }
            ],
            type: 'editreply'
        }, interaction);

    } catch (error) {
        console.error('Error creating announcement:', error);
        await interaction.reply({
            content: '❌ Failed to send announcement. Please try again.',
            ephemeral: true
        });
    }
}


