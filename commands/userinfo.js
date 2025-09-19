
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
// Function to format permissions
function formatPermissions(member) {
    const adminPermissions = ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'BanMembers', 'KickMembers'];
    const memberPermissions = member.permissions.toArray();
    
    const hasAdminPerms = adminPermissions.some(perm => memberPermissions.includes(perm));
    
    if (memberPermissions.includes('Administrator')) {
        return 'Administrator';
    } else if (hasAdminPerms) {
        return 'Moderate permissions';
    } else {
        return 'No significant permissions';
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Get detailed information about a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands)
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to get information about')
                .setRequired(false)),

    async execute(interaction) {
        // Check if user has required permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ You need "Use Application Commands" permission to use this command.',
                ephemeral: true
            });
        }

        // Check if bot has required permissions
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ I need "Use Application Commands" permission to execute this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

            if (!targetMember) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('❌ **Error**\nUser not found in this server.')
                    );

                return await interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const userAvatar = targetUser.displayAvatarURL({ size: 512, extension: 'png' });
            const isBot = targetUser.bot ? 'Yes 🤖' : 'No 👤';
            const nickname = targetMember.nickname || 'None';
            
            // Get roles excluding @everyone
            const userRoles = targetMember.roles.cache
                .filter(role => role.name !== '@everyone')
                .sort((a, b) => b.position - a.position);
            
            const rolesDisplay = userRoles.size > 0 
                ? userRoles.map(role => `<@&${role.id}>`).join(' ')
                : 'None';

            const highestRole = targetMember.roles.highest.name !== '@everyone' 
                ? targetMember.roles.highest 
                : null;

            const highestRoleDisplay = highestRole 
                ? `${highestRole.name} (Color: ${highestRole.hexColor})`
                : '@everyone (No color)';

            const permissions = formatPermissions(targetMember);

            const container = new ContainerBuilder()
                .setAccentColor(getEmbedColor(interaction.client));

            // Add main header
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`## 👤 User Info: \`${targetUser.displayName}\``)
            );

            container.addSeparatorComponents(separator => separator);

            // Add user information with thumbnail
            const userInfo = [
                `> ✦ **Username:** \`${targetUser.username}\``,
                `> ✦ **ID:** \`${targetUser.id}\``,
                `> ✦ **Bot:** ${isBot}`,
                `> ✦ **Nickname:** ${nickname}`,
                `> ✦ **Account Created:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:F> (<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>)`,
                `> ✦ **Joined Server:** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F> (<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>)`,
                `> ✦ **Roles:** ${rolesDisplay}`,
                `> ✦ **Highest Role:** ${highestRoleDisplay}`,
                `> ✦ **Permissions:** ${permissions}`
            ].join('\n');

            container.addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(userInfo)
                    )
                    .setThumbnailAccessory(
                        thumbnail => thumbnail
                            .setURL(userAvatar)
                    )
            );

            // Add footer
            container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`*Requested by ${interaction.user.username} <t:${Math.floor(new Date().getTime() / 1000)}:R>*`)
        );

            await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error in userinfo command:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`❌ **User Information Failed**\nSorry, I couldn't fetch the user information. Please try again later.\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
                );

            await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};
