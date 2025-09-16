
const { SlashCommandBuilder, ChannelType, ContainerBuilder, MessageFlags } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Server information commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Show detailed server information'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('icon')
                .setDescription('Show the server icon with download links')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'info':
                    await handleServerInfo(interaction);
                    break;
                case 'icon':
                    await handleServerIcon(interaction);
                    break;
                default:
                    const errorContainer = new ContainerBuilder()
                        .setAccentColor(0xFF0000)
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
            console.error('Error in server command:', error);
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
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

async function handleServerInfo(interaction) {
    await interaction.deferReply();
    
    const guild = interaction.guild;
    
    try {
        // Fetch additional guild information
        const fetchedGuild = await guild.fetch();
        
        // Count different channel types
        const channels = await guild.channels.fetch();
        const textChannels = channels.filter(channel => channel.type === ChannelType.GuildText).size;
        const voiceChannels = channels.filter(channel => channel.type === ChannelType.GuildVoice).size;
        const categoryChannels = channels.filter(channel => channel.type === ChannelType.GuildCategory).size;
        const totalChannels = textChannels + voiceChannels + categoryChannels;

        // Get member counts
        const totalMembers = guild.memberCount;
        const onlineMembers = guild.members.cache.filter(member => member.presence?.status !== 'offline').size;

        // Get boost information
        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;
        const boostersCount = guild.members.cache.filter(member => member.premiumSince).size;

        // Get emoji information
        const totalEmojis = guild.emojis.cache.size;
        const staticEmojis = guild.emojis.cache.filter(emoji => !emoji.animated).size;
        const animatedEmojis = guild.emojis.cache.filter(emoji => emoji.animated).size;

        // Get roles count
        const rolesCount = guild.roles.cache.size;

        // Format creation date
        const createdAt = Math.floor(guild.createdAt.getTime() / 1000);

        // Build features list
        const features = guild.features.length > 0 ? guild.features.map(feature => {
            return feature.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }).join(', ') : 'None';

        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client));

        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`🏠 **${guild.name} Server Information**`)
        );

        container.addSeparatorComponents(separator => separator);

        // Add server roles
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**__Server Roles__ [ ${rolesCount} ]**\nTotal roles in this server: **${rolesCount}**`)
        );

        container.addSeparatorComponents(separator => separator);

        // Add boost status
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**__Boost Status__**\n**Level:** ${boostLevel}\n**Boosts:** ${boostCount}\n**Boosters:** ${boostersCount}`)
        );

        container.addSeparatorComponents(separator => separator);

        // Add emoji info
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**__Emoji Info__**\n**Total:** ${totalEmojis}\n**Static:** ${staticEmojis}\n**Animated:** ${animatedEmojis}`)
        );

        container.addSeparatorComponents(separator => separator);

        // Add channels
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**__Channels__**\n**Total:** ${totalChannels}\n**Text:** ${textChannels}\n**Voice:** ${voiceChannels}\n**Categories:** ${categoryChannels}`)
        );

        container.addSeparatorComponents(separator => separator);

        // Add features
        const featuresText = features.length > 1024 ? features.substring(0, 1021) + '...' : features;
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**__Features__**\n${featuresText}`)
        );

        container.addSeparatorComponents(separator => separator);

        // Add general stats
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**__General Stats__**\n**Total Members:** ${totalMembers}\n**Online:** ${onlineMembers}\n**Created:** <t:${createdAt}:R>`)
        );

        // Add description if it exists
        if (guild.description) {
            container.addSeparatorComponents(separator => separator);
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**__Description__**\n${guild.description}`)
            );
        }

        // Add about section
        const owner = await guild.fetchOwner();
        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**__About__**\n**Owner:** ${owner.user.tag}\n**Region:** ${guild.preferredLocale || 'Unknown'}\n**Verification Level:** ${getVerificationLevel(guild.verificationLevel)}`)
        );

        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`Server ID: ${guild.id}`)
        );

        await interaction.editReply({ 
            components: [container], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error fetching server info:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(0xFF0000)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to fetch server information.')
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}

async function handleServerIcon(interaction) {
    const guild = interaction.guild;
    
    if (!guild.icon) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(0xFF0000)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ This server doesn\'t have an icon set.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    try {
        // Get different formats of the server icon
        const iconPNG = guild.iconURL({ size: 1024, extension: 'png' });
        const iconJPG = guild.iconURL({ size: 1024, extension: 'jpg' });
        const iconWEBP = guild.iconURL({ size: 1024, extension: 'webp' });

        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`🖼️ **${guild.name}'s Server Icon**\n[**PNG**](${iconPNG}) | [**JPG**](${iconJPG}) | [**WEBP**](${iconWEBP})`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`Server ID: ${guild.id}`)
            );

        const { MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
        
        try {
            container.addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder().setURL(iconPNG)
                    )
            );
        } catch (error) {
            console.warn('Failed to add server icon to container:', error);
        }

        await interaction.reply({ 
            components: [container], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error fetching server icon:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(0xFF0000)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to fetch the server icon.')
            );

        await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }
}

function getVerificationLevel(level) {
    const levels = {
        0: 'None',
        1: 'Low',
        2: 'Medium',
        3: 'High',
        4: 'Very High'
    };
    return levels[level] || 'Unknown';
}
