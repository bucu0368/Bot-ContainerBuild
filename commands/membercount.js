const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, MessageFlags } = require('discord.js');
const { buildContainerFromEmbedShape } = require('../utils/container');
const { editReplyV2 } = require('../utils/sendV2');

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('membercount')
        .setDescription('Shows the member count of the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommand)
        .setDMPermission(false),
    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            const guild = interaction.guild;
            const memberCount = guild.memberCount;

            const container = buildContainerFromEmbedShape({
                title: '📊 Member Count',
                description: `This server currently has **${memberCount}** members.`,
                color: getEmbedColor(interaction.client),
                timestamp: new Date()
            });

            await editReplyV2(interaction, { embed: container });
        } catch (error) {
            console.error('Error in membercount command:', error);

            const errorContainer = buildContainerFromEmbedShape({
                title: '❌ Error',
                description: 'Failed to fetch member statistics. Please try again later.',
                color: '#ff0000',
                timestamp: new Date()
            });

            await editReplyV2(interaction, { embed: errorContainer });
        }
    }
};