
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

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
        .setName('echo')
        .setDescription('Send a message through the bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The message to send')
                .setRequired(true))
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel to send the message to (optional)')
                .setRequired(false)),

    async execute(interaction) {
        // Check if user has required permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) || 
            !interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ You need "Manage Messages" and "Use Application Commands" permissions to use this command.',
                ephemeral: true
            });
        }

        // Check if bot has required permissions
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages) || 
            !interaction.guild.members.me.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ I need "Manage Messages" and "Use Application Commands" permissions to execute this command.',
                ephemeral: true
            });
        }

        const message = interaction.options.getString('message');
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            // Validate that the target channel is a text channel
            if (!targetChannel.isTextBased()) {
                return await interaction.reply({
                    content: '❌ You can only send messages to text channels.',
                    ephemeral: true
                });
            }

            // Check if bot can send messages in the target channel
            if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
                return await interaction.reply({
                    content: `❌ I don't have permission to send messages in ${targetChannel}.`,
                    ephemeral: true
                });
            }

            // Check if user can send messages in the target channel
            if (!targetChannel.permissionsFor(interaction.member).has(PermissionFlagsBits.SendMessages)) {
                return await interaction.reply({
                    content: `❌ You don't have permission to send messages in ${targetChannel}.`,
                    ephemeral: true
                });
            }

            // Send the message to the target channel with sender attribution
            await targetChannel.send(`${message}\n\n*- sent by ${interaction.user.username}*`);

            // Create success response
            const { buildContainerFromEmbedShape } = require('../utils/container');
            const { replyV2 } = require('../utils/sendV2');
            
            const container = buildContainerFromEmbedShape({
                title: '✅ Message Sent Successfully',
                description: `Message sent to ${targetChannel}`,
                color: getEmbedColor(interaction.client),
                fields: [
                    {
                        name: 'Message Content',
                        value: message.length > 1024 ? message.substring(0, 1021) + '...' : message,
                        inline: false
                    },
                    {
                        name: 'Sent by',
                        value: interaction.user.tag,
                        inline: true
                    },
                    {
                        name: 'Target Channel',
                        value: targetChannel.toString(),
                        inline: true
                    }
                ],
                timestamp: new Date()
            });

            await replyV2(interaction, { embed: container });

        } catch (error) {
            console.error('Error in echo command:', error);
            await interaction.reply({
                content: '❌ An error occurred while sending the message.',
                ephemeral: true
            });
        }
    },
};
