
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

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
        .setName('nsfw')
        .setDescription('NSFW image commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands)
        .setNSFW(true)
        .addSubcommand(subcommand =>
            subcommand
                .setName('4k')
                .setDescription('Get a 4K NSFW image'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('anal')
                .setDescription('Get an anal NSFW image'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ass')
                .setDescription('Get an ass NSFW image'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('blowjob')
                .setDescription('Get a blowjob NSFW image'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('boobs')
                .setDescription('Get a boobs NSFW image'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('feet')
                .setDescription('Get a feet NSFW image'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('gonewild')
                .setDescription('Get a gonewild NSFW image'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('hass')
                .setDescription('Get a hass NSFW image'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('hboobs')
                .setDescription('Get a hboobs NSFW image'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('hentai')
                .setDescription('Get a hentai NSFW image'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('hentaianal')
                .setDescription('Get a hentai anal NSFW image'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('yaoi')
                .setDescription('Get a yaoi NSFW image')),

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

        // Check if channel is NSFW
        if (!interaction.channel.nsfw) {
            return await interaction.reply({
                content: '❌ This command can only be used in NSFW channels.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        await handleNSFWImage(interaction, subcommand);
    },
};

async function handleNSFWImage(interaction, type) {
    await interaction.deferReply();

    try {
        let imageUrl = null;
        let apiResponse = null;

        // Map command types to API types
        const typeMapping = {
            '4k': 'hentai', // Use hentai as fallback for 4k
            'anal': 'anal',
            'ass': 'ass',
            'blowjob': 'blowjob',
            'boobs': 'boobs',
            'feet': 'feet',
            'gonewild': 'gonewild',
            'hass': 'hass',
            'hboobs': 'hboobs',
            'hentai': 'hentai',
            'hentaianal': 'hentai_anal',
            'yaoi': 'yaoi'
        };

        // Try waifu.pics API first (more reliable)
        try {
            const waifuType = typeMapping[type] || type;
            const waifuUrl = `https://api.waifu.pics/nsfw/${waifuType}`;
            const response = await fetch(waifuUrl, {
                headers: {
                    'User-Agent': 'Discord Bot'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.url) {
                    imageUrl = data.url;
                    apiResponse = data;
                }
            }
        } catch (waifuError) {
            console.log(`Waifu.pics API failed for ${type}:`, waifuError.message);
        }

        // Try nekobot API as fallback
        if (!imageUrl) {
            try {
                const nekobotUrl = `https://nekobot.xyz/api/image?type=${type}`;
                const response = await fetch(nekobotUrl, {
                    headers: {
                        'User-Agent': 'Discord Bot'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.message) {
                        imageUrl = data.message;
                        apiResponse = data;
                    }
                }
            } catch (nekobotError) {
                console.log(`Nekobot API failed for ${type}:`, nekobotError.message);
            }
        }

        // Try third fallback API if both fail
        if (!imageUrl) {
            try {
                const fallbackUrl = `https://api.waifu.pics/nsfw/neko`; // Use neko as universal fallback
                const response = await fetch(fallbackUrl, {
                    headers: {
                        'User-Agent': 'Discord Bot'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.url) {
                        imageUrl = data.url;
                        apiResponse = data;
                    }
                }
            } catch (fallbackError) {
                console.log(`Fallback API failed:`, fallbackError.message);
            }
        }

        // If no image found, throw error
        if (!imageUrl) {
            throw new Error('No image URL received from any API');
        }

        const { MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
        
        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client));

        // Add the image using MediaGallery
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder().setURL(imageUrl)
                )
        );

        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`🔞 **NSFW ${type.toUpperCase()} Image**\n\nRequested by: ${interaction.user.username}`)
        );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setEmoji('📎')
                    .setLabel(' ▸ Link')
                    .setStyle(ButtonStyle.Link)
                    .setURL(imageUrl)
            );

        container.addActionRowComponents(
            actionRow => actionRow.setComponents(row.components)
        );

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error(`Error fetching ${type} image:`, error);

        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client));

        errorContainer.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`❌ **Image Fetch Failed**\n\nSorry, I couldn't fetch a ${type} image. The API might be temporarily unavailable or the content type might not be supported.\n\n**Error:** ${error.message}`)
        );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}
