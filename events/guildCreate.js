
const { ContainerBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    name: 'guildCreate',
    async execute(guild) {
        try {
            // Find a suitable channel to send the welcome message
            const systemChannel = guild.systemChannel;
            const generalChannel = guild.channels.cache.find(channel => 
                channel.name.includes('general') && 
                channel.type === 0 && 
                channel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel'])
            );
            const firstTextChannel = guild.channels.cache.find(channel => 
                channel.type === 0 && 
                channel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel'])
            );

            const targetChannel = systemChannel || generalChannel || firstTextChannel;

            if (!targetChannel) {
                console.log(`Could not find a suitable channel in guild: ${guild.name} (${guild.id})`);
                return;
            }

            // Create welcome container
            const container = new ContainerBuilder()
                .setAccentColor(getEmbedColor(guild.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`🎉 **Thank you for adding me to ${guild.name}!**\n\nI'm ready to help make your server awesome! Use \`/\` to see all available commands and get started.`)
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**💡 Need Help?**\nJoin our support server or invite the bot to other servers using the buttons below!`)
                );

            // Create action row with invite and support buttons
            container.addActionRowComponents(
                actionRow => actionRow.setComponents([
                    new ButtonBuilder()
                        .setLabel('🤖 Invite Bot')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://discord.com/oauth2/authorize?client_id=${guild.client.config.clientId}&permissions=8&integration_type=0&scope=bot`),
                    new ButtonBuilder()
                        .setLabel('🛠️ Support Server')
                        .setStyle(ButtonStyle.Link)
                        .setURL(guild.client.config.SupportServerLink)
                ])
            );

            // Add footer
            container.addSeparatorComponents(separator => separator);
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`Server ID: ${guild.id} • Members: ${guild.memberCount}`)
            );

            const { sendV2 } = require('../utils/sendV2');
            await sendV2(targetChannel, { embed: container });

            console.log(`✅ Sent welcome message to ${guild.name} (${guild.id})`);

        } catch (error) {
            console.error(`❌ Error sending welcome message to guild ${guild.name}:`, error);
        }
    },
};
