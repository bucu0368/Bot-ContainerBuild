
const { ContainerBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Ignore messages from bots
        if (message.author.bot) return;

        // AFK System Integration
        try {
            const { afkUsers, getEmbedColor } = require('../commands/afk.js');
            const key = `${message.guild.id}-${message.author.id}`;

            // Check if the message author is AFK and remove their AFK status
            if (afkUsers.has(key)) {
                const afkData = afkUsers.get(key);
                afkUsers.delete(key);

                // Try to remove [AFK] prefix from nickname
                try {
                    const member = message.member;
                    const currentNick = member.displayName;
                    
                    if (currentNick.startsWith('[AFK]')) {
                        const newNick = currentNick.replace('[AFK] ', '').replace('[AFK]', '');
                        await member.setNickname(newNick || member.user.username, 'User removed AFK status');
                    }
                } catch (error) {
                    // Ignore nickname errors
                }

                // Calculate AFK duration
                const afkDuration = Date.now() - afkData.timestamp;
                const hours = Math.floor(afkDuration / (1000 * 60 * 60));
                const minutes = Math.floor((afkDuration % (1000 * 60 * 60)) / (1000 * 60));
                
                let durationText = '';
                if (hours > 0) {
                    durationText = `${hours}h ${minutes}m`;
                } else {
                    durationText = `${minutes}m`;
                }

                const welcomeBackContainer = new ContainerBuilder()
                    .setAccentColor(parseInt((message.client.config?.EmbedColor || '#0099ff').replace('#', ''), 16))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`👋 **Welcome back, ${message.author}!**\n\nYou were AFK for **${durationText}**${afkData.mentions > 0 ? `\nYou were mentioned **${afkData.mentions}** times while away.` : ''}`)
                    );

                // Send welcome back message and delete after 5 seconds
                const welcomeMsg = await message.channel.send({
                    components: [welcomeBackContainer],
                    flags: MessageFlags.IsComponentsV2
                });

                setTimeout(() => {
                    welcomeMsg.delete().catch(() => {});
                }, 5000);
            }

            // Check for mentions of AFK users
            if (message.mentions.users.size > 0) {
                const afkMentions = [];
                
                message.mentions.users.forEach(user => {
                    const mentionKey = `${message.guild.id}-${user.id}`;
                    if (afkUsers.has(mentionKey)) {
                        const afkData = afkUsers.get(mentionKey);
                        // Increment mention count
                        afkData.mentions++;
                        afkUsers.set(mentionKey, afkData);
                        
                        const afkTime = Math.floor(afkData.timestamp / 1000);
                        afkMentions.push(`**${user.username}** is AFK: ${afkData.reason} (since <t:${afkTime}:R>)`);
                    }
                });

                if (afkMentions.length > 0) {
                    const afkContainer = new ContainerBuilder()
                        .setAccentColor(parseInt((message.client.config?.EmbedColor || '#0099ff').replace('#', ''), 16))
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent(`💤 **AFK Users Mentioned**\n\n${afkMentions.join('\n')}`)
                        );

                    // Send AFK notification and delete after 10 seconds
                    const afkMsg = await message.channel.send({
                        components: [afkContainer],
                        flags: MessageFlags.IsComponentsV2
                    });

                    setTimeout(() => {
                        afkMsg.delete().catch(() => {});
                    }, 10000);
                }
            }
        } catch (error) {
            console.error('Error in AFK system:', error);
        }

        // Sticky Message System Integration
        try {
            const { stickyMessages, getEmbedColor } = require('../commands/stick.js');
            const channelId = message.channel.id;
            const stickyData = stickyMessages.get(channelId);

            if (stickyData) {
                // Check if the message is not from the bot itself
                if (message.author.id !== message.client.user.id) {
                    // Wait a moment to avoid rate limiting
                    setTimeout(async () => {
                        try {
                            // Delete the current sticky message
                            const currentStickyMsg = await message.channel.messages.fetch(stickyData.messageId).catch(() => null);
                            if (currentStickyMsg) {
                                await currentStickyMsg.delete();
                            }

                            // Create new sticky message container
                            const stickyContainer = new ContainerBuilder()
                                .setAccentColor(parseInt((message.client.config?.EmbedColor || '#0099ff').replace('#', ''), 16))
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay
                                        .setContent('📌 **Stickied Message:**')
                                )
                                .addSeparatorComponents(separator => separator)
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay
                                        .setContent(stickyData.content)
                                );

                            // Send the new sticky message
                            const newStickyMsg = await message.channel.send({
                                components: [stickyContainer],
                                flags: MessageFlags.IsComponentsV2
                            });

                            // Update the stored message ID
                            stickyData.messageId = newStickyMsg.id;
                            stickyMessages.set(channelId, stickyData);

                        } catch (error) {
                            console.error('Error reposting sticky message:', error);
                        }
                    }, 1000); // 1 second delay
                }
            }
        } catch (error) {
            console.error('Error in sticky message system:', error);
        }

        // Check if the bot was mentioned
        if (message.mentions.has(message.client.user)) {
            try {
                // Create buttons row
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Invite Bot')
                            .setURL(`https://discord.com/api/oauth2/authorize?client_id=${message.client.config.clientId}&permissions=8&scope=bot%20applications.commands`)
                            .setStyle(ButtonStyle.Link),
                        new ButtonBuilder()
                            .setLabel('Support Server')
                            .setURL(message.client.config.SupportServerLink)
                            .setStyle(ButtonStyle.Link)
                    );

                // Create container
                const { buildContainerFromEmbedShape } = require('../utils/container');
                const { sendV2 } = require('../utils/sendV2');
                
                const container = new ContainerBuilder()
                    .setAccentColor(parseInt((message.client.config.EmbedColor || '#0099ff').replace('#', ''), 16));

                // Add title and description
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**Hi, i'm Bot**\n\nUse with commands via Discord / commands`)
                );

                container.addSeparatorComponents(separator => separator);

                // Add invite section with button
                container.addSectionComponents(
                    section => section
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent(`**📨┆Invite me**\nInvite Bot in your own server!`)
                        )
                        .setButtonAccessory(
                            button => button
                                .setLabel('Invite Bot')
                                .setStyle(ButtonStyle.Link)
                                .setURL(`https://discord.com/api/oauth2/authorize?client_id=${message.client.config.clientId}&permissions=8&scope=bot%20applications.commands`)
                        )
                );

                container.addSeparatorComponents(separator => separator);

                // Add slash commands info
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**❓┇I don't see any slash commands**\nThe bot may not have permissions for this. Open the invite link again and select your server. The bot then gets the correct permissions`)
                );

                container.addSeparatorComponents(separator => separator);

                // Add support section with button
                container.addSectionComponents(
                    section => section
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent(`**❓┆Need support?**\nFor questions you can join our support server!`)
                        )
                        .setButtonAccessory(
                            button => button
                                .setLabel('Support Server')
                                .setStyle(ButtonStyle.Link)
                                .setURL(message.client.config.SupportServerLink)
                        )
                );

                container.addSeparatorComponents(separator => separator);

                // Add error feedback info
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**🐞┆Error?**\nError Feedback: \`/bot feedback\`!`)
                );

                container.addSeparatorComponents(separator => separator);

                // Add footer info
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`*Requested by: ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

                // Send the container
                await sendV2(message.channel, {
                    embed: container
                });

            } catch (error) {
                console.error('Error sending ping response:', error);
            }
        }
    },
};
