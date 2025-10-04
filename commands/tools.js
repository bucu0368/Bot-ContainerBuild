
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ContainerBuilder
} = require('discord.js');
const config = require('../config.json');

const pastefy_API_KEY = 'SUvl7obruMDgaCcgyVZQzk9XfQ4zVM82XvC6vqSAvUANKcoa14Fq2YNkc6qT';

function getEmbedColor() {
    const color = config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

function getErrorColor() {
    const color = config?.ErrorColor || '#ff0000';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tools')
        .setDescription('Utility tools for various tasks')
        .addSubcommand(subcommand =>
            subcommand
                .setName('decode')
                .setDescription('Decode binary code to text')
                .addStringOption(option =>
                    option
                        .setName('code')
                        .setDescription('The binary code to decode')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('encode')
                .setDescription('Encode text to binary code')
                .addStringOption(option =>
                    option
                        .setName('text')
                        .setDescription('The text to encode to binary')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mcskin')
                .setDescription('Search for Minecraft player skin')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Minecraft username to search')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mcstatus')
                .setDescription('Check Minecraft server status')
                .addStringOption(option =>
                    option
                        .setName('ip')
                        .setDescription('Minecraft server IP address (e.g., hypixel.net or mc.hypixel.net:25565)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('pwdgen')
                .setDescription('Generate a secure random password')
                .addIntegerOption(option =>
                    option
                        .setName('length')
                        .setDescription('Password length (default: 12)')
                        .setRequired(false)
                        .setMinValue(4)
                        .setMaxValue(128)
                )
                .addBooleanOption(option =>
                    option
                        .setName('include_symbols')
                        .setDescription('Include special symbols (default: true)')
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName('include_numbers')
                        .setDescription('Include numbers (default: true)')
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName('include_uppercase')
                        .setDescription('Include uppercase letters (default: true)')
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName('include_lowercase')
                        .setDescription('Include lowercase letters (default: true)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('calculator')
                .setDescription('Open an interactive calculator')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('sourcebin')
                .setDescription('Create a paste on Sourcebin')
                .addStringOption(option =>
                    option
                        .setName('title')
                        .setDescription('Title of the paste (max 128 characters)')
                        .setRequired(true)
                        .setMaxLength(128)
                )
                .addStringOption(option =>
                    option
                        .setName('content')
                        .setDescription('Content of the paste (max 6000 characters)')
                        .setRequired(true)
                        .setMaxLength(6000)
                )
                .addStringOption(option =>
                    option
                        .setName('description')
                        .setDescription('Description of the paste (max 128 characters)')
                        .setRequired(false)
                        .setMaxLength(128)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('pastefy')
                .setDescription('Create a paste on Pastefy')
                .addStringOption(option =>
                    option
                        .setName('content')
                        .setDescription('Content of the paste')
                        .setRequired(true)
                        .setMaxLength(6000)               
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('pastebin')
                .setDescription('Create a paste on Pastebin')
                .addStringOption(option =>
                    option
                        .setName('title')
                        .setDescription('Title of the paste (max 128 characters)')
                        .setRequired(true)
                        .setMaxLength(128)
                )
                .addStringOption(option =>
                    option
                        .setName('content')
                        .setDescription('Content of the paste (max 6000 characters)')
                        .setRequired(true)
                        .setMaxLength(6000)
                )
        ),

    async execute(interaction) {
        // Check if user has required permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **Permission Denied**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('You need **Use Application Commands** permission to use this command!')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'decode') {
            await handleDecode(interaction);
        } else if (subcommand === 'encode') {
            await handleEncode(interaction);
        } else if (subcommand === 'mcskin') {
            await handleMcSkin(interaction);
        } else if (subcommand === 'mcstatus') {
            await handleMcStatus(interaction);
        } else if (subcommand === 'pwdgen') {
            await handlePwdGen(interaction);
        } else if (subcommand === 'calculator') {
            await handleCalculator(interaction);
        } else if (subcommand === 'sourcebin') {
            await handleSourcebin(interaction);
        } else if (subcommand === 'pastefy') {
            await handlePastefy(interaction);
        } else if (subcommand === 'pastebin') {
            await handlePastebin(interaction);
        }
    }
};

async function handleEncode(interaction) {
    const loadingContainer = new ContainerBuilder()
        .setAccentColor(getEmbedColor())
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('⏳ **Encoding...**')
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('Please wait while I encode your text to binary...')
        );

    await interaction.reply({
        components: [loadingContainer],
        flags: MessageFlags.IsComponentsV2
    });

    const text = interaction.options.getString('text');

    try {
        let encode = text.split("").map(x => x.charCodeAt(0).toString(2)).join(" ");

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('✔️ **Encode Success!**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('I have successfully converted text to binary.')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('**📥 Input:**')
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`\`\`\`${text.length > 1000 ? text.substring(0, 1000) + '...' : text}\`\`\``)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('**📤 Output:**')
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`\`\`${encode.length > 1000 ? encode.substring(0, 1000) + '...' : encode}\`\``)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        await interaction.editReply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Encode error:', error);
        
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Encode Failed**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('An error occurred while encoding the text. Please try again.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

async function handleDecode(interaction) {
    const loadingContainer = new ContainerBuilder()
        .setAccentColor(getEmbedColor())
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('⏳ **Decoding...**')
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('Please wait while I decode your binary code...')
        );

    await interaction.reply({
        components: [loadingContainer],
        flags: MessageFlags.IsComponentsV2
    });

    const code = interaction.options.getString('code');

    const binaryPattern = /^[01\s]+$/;
    if (!binaryPattern.test(code)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Invalid Input**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('You can only decode binary code! Please use only 0s and 1s separated by spaces.')
            );

        return await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }

    try {
        let decode = code.split(' ')
            .map(bin => String.fromCharCode(parseInt(bin, 2)))
            .join('');

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('✔️ **Decode Success!**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('I have successfully decoded your binary code.')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('**📥 Input:**')
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`\`\`\`${code.length > 1000 ? code.substring(0, 1000) + '...' : code}\`\`\``)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('**📤 Output:**')
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`\`\`\`${decode.length > 1000 ? decode.substring(0, 1000) + '...' : decode}\`\`\``)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        await interaction.editReply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Decode error:', error);
        
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Decode Failed**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('An error occurred while decoding the binary code. Please check your input and try again.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

async function handleMcSkin(interaction) {
    const { ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    const loadingContainer = new ContainerBuilder()
        .setAccentColor(getEmbedColor())
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('⏳ **Searching...**')
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('Please wait while I search for the Minecraft skin...')
        );

    await interaction.reply({
        components: [loadingContainer],
        flags: MessageFlags.IsComponentsV2
    });

    const username = interaction.options.getString('name');

    try {
        const uuidResponse = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
        
        if (!uuidResponse.ok) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **Player Not Found**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`Could not find Minecraft player with username: **${username}**`)
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const playerData = await uuidResponse.json();
        const uuid = playerData.id;
        const playerName = playerData.name;

        const containers = [];

        const infoContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`🎮 **Minecraft Player: ${playerName}**`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**UUID:** \`${uuid}\``)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('**📸 Skin Preview:**')
            )
            .addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(`https://visage.surgeplay.com/full/512/${uuid}`)
                    )
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        containers.push(infoContainer);

        const skinContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`🎨 **Skin Views: ${playerName}**`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('**Front View:**')
            )
            .addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(`https://visage.surgeplay.com/front/512/${uuid}`)
                    )
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        containers.push(skinContainer);

        const headContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`👤 **Head & Face: ${playerName}**`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('**3D Head:**')
            )
            .addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(`https://visage.surgeplay.com/head/512/${uuid}`)
                    )
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('**Face:**')
            )
            .addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(`https://visage.surgeplay.com/face/512/${uuid}`)
                    )
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        containers.push(headContainer);

        await paginateContainers(interaction, containers);

    } catch (error) {
        console.error('Minecraft skin search error:', error);
        
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Search Failed**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('An error occurred while searching for the Minecraft skin. Please try again.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

async function paginateContainers(interaction, components) {
    const { ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType } = require('discord.js');

    if (components.length === 1) {
        return await interaction.editReply({ 
            components: [components[0]], 
            flags: MessageFlags.IsComponentsV2,
            fetchReply: true 
        });
    }

    let index = 0;

    const first = new ButtonBuilder()
        .setCustomId('pagefirst')
        .setEmoji('⏪')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true);

    const prev = new ButtonBuilder()
        .setCustomId('pageprev')
        .setEmoji('⬅️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true);

    const pageCount = new ButtonBuilder()
        .setCustomId('pagecount')
        .setLabel(`${index + 1}/${components.length}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

    const next = new ButtonBuilder()
        .setCustomId('pagenext')
        .setEmoji('➡️')
        .setStyle(ButtonStyle.Primary);

    const last = new ButtonBuilder()
        .setCustomId('pagelast')
        .setEmoji('⏩')
        .setStyle(ButtonStyle.Primary);

    const buttons = new ActionRowBuilder().addComponents([first, prev, pageCount, next, last]);

    const containerWithButtons = new ContainerBuilder(components[index].toJSON());
    containerWithButtons.addActionRowComponents(buttons);

    const msg = await interaction.editReply({ 
        flags: MessageFlags.IsComponentsV2, 
        components: [containerWithButtons], 
        fetchReply: true 
    });

    const collector = await msg.createMessageComponentCollector({ 
        componentType: ComponentType.Button, 
        time: 180000 
    });

    collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
            return await i.reply({ 
                content: `Only **${interaction.user.username}** can use these buttons.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        if (i.customId === 'pagefirst') {
            index = 0;
        } else if (i.customId === 'pageprev') {
            if (index > 0) index--;
        } else if (i.customId === 'pagenext') {
            if (index < components.length - 1) index++;
        } else if (i.customId === 'pagelast') {
            index = components.length - 1;
        }

        pageCount.setLabel(`${index + 1}/${components.length}`);

        first.setDisabled(index === 0);
        prev.setDisabled(index === 0);
        next.setDisabled(index === components.length - 1);
        last.setDisabled(index === components.length - 1);

        const updatedContainer = new ContainerBuilder(components[index].toJSON());
        updatedContainer.addActionRowComponents(buttons);

        await i.update({ 
            flags: MessageFlags.IsComponentsV2, 
            components: [updatedContainer] 
        });

        collector.resetTimer();
    });

    collector.on("end", () => {
        return interaction.editReply({ 
            flags: MessageFlags.IsComponentsV2, 
            components: [components[index]] 
        }).catch(() => {});
    });

    return msg;
}

async function handleMcStatus(interaction) {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    const loadingContainer = new ContainerBuilder()
        .setAccentColor(getEmbedColor())
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('⏳ **Checking Server...**')
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('Please wait while I check the Minecraft server status...')
        );

    await interaction.reply({
        components: [loadingContainer],
        flags: MessageFlags.IsComponentsV2
    });

    const serverIp = interaction.options.getString('ip');

    try {
        const response = await fetch(`https://api.mcsrvstat.us/3/${serverIp}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch server status');
        }

        const data = await response.json();

        if (!data.online) {
            const offlineContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('🔴 **Server Offline**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`The Minecraft server **${serverIp}** is currently offline or unreachable.`)
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            return await interaction.editReply({
                components: [offlineContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const motd = data.motd?.clean ? data.motd.clean.join('\n') : 'No MOTD available';
        const version = data.version || 'Unknown';
        const protocol = data.protocol || 'Unknown';
        const playersOnline = data.players?.online || 0;
        const playersMax = data.players?.max || 0;

        const statusContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`🟢 **Server Online: ${data.hostname || serverIp}**`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**IP:** \`${data.ip || serverIp}\`\n**Port:** \`${data.port || 25565}\``)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**📊 Players:** ${playersOnline}/${playersMax}`)
            );

        if (data.players?.list && data.players.list.length > 0) {
            const playerList = data.players.list.slice(0, 10).join(', ');
            const moreText = data.players.list.length > 10 ? ` (+${data.players.list.length - 10} more)` : '';
            statusContainer.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**👥 Online Players:** ${playerList}${moreText}`)
            );
        }

        statusContainer.addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**🎮 Version:** ${version}\n**🔧 Protocol:** ${protocol}`)
            );

        if (motd && motd !== 'No MOTD available') {
            statusContainer.addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**📝 MOTD:**\n\`\`\`${motd.substring(0, 500)}\`\`\``)
                );
        }

        if (data.mods?.list && data.mods.list.length > 0) {
            const modList = data.mods.list.slice(0, 5).map(mod => mod.name || mod).join(', ');
            const moreText = data.mods.list.length > 5 ? ` (+${data.mods.list.length - 5} more)` : '';
            statusContainer.addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**🔌 Mods/Plugins:** ${modList}${moreText}`)
                );
        }

        statusContainer.addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        await interaction.editReply({
            components: [statusContainer],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Minecraft server status error:', error);
        
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Status Check Failed**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('An error occurred while checking the server status. Please verify the IP address and try again.')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

async function handlePwdGen(interaction) {
    const length = interaction.options.getInteger('length') || 12;
    const includeSymbols = interaction.options.getBoolean('include_symbols') ?? true;
    const includeNumbers = interaction.options.getBoolean('include_numbers') ?? true;
    const includeUppercase = interaction.options.getBoolean('include_uppercase') ?? true;
    const includeLowercase = interaction.options.getBoolean('include_lowercase') ?? true;

    if (!includeSymbols && !includeNumbers && !includeUppercase && !includeLowercase) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Invalid Configuration**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('You must include at least one character type!')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }

    try {
        const password = generatePassword(length, {
            symbols: includeSymbols,
            numbers: includeNumbers,
            uppercase: includeUppercase,
            lowercase: includeLowercase
        });

        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('🔐 **Generated Password**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('**🎯 Your Password:**')
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`\`\`${password}\`\``)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('**📊 Password Details:**')
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent([
                    `**Length:** ${length} characters`,
                    `**Symbols:** ${includeSymbols ? '✅' : '❌'}`,
                    `**Numbers:** ${includeNumbers ? '✅' : '❌'}`,
                    `**Uppercase:** ${includeUppercase ? '✅' : '❌'}`,
                    `**Lowercase:** ${includeLowercase ? '✅' : '❌'}`
                ].join('\n'))
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('**⚠️ Security Tips:**')
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('• Never share your password with anyone\n• Use unique passwords for each account\n• Consider using a password manager\n• Change passwords regularly')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });

    } catch (error) {
        console.error('Password generation error:', error);
        
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Generation Failed**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('An error occurred while generating the password. Please try again.')
            );

        await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }
}

async function handleCalculator(interaction) {
    const { ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType } = require('discord.js');
    
    const createButton = (label, disabled) => {
        let style = ButtonStyle.Secondary;
        if (label === 'AC' || label === 'DC' || label === '⌫') {
            style = ButtonStyle.Danger;
        } else if (label === '=') {
            style = ButtonStyle.Success;
        } else if (
            label === '(' ||
            label === ')' ||
            label === '^' ||
            label === '%' ||
            label === '÷' ||
            label === 'x' ||
            label === '-' ||
            label === '+' ||
            label === '.'
        ) {
            style = ButtonStyle.Primary;
        }
        
        const customId = label === '\u200b' 
            ? `cal_empty_${Math.random().toString(36).substr(2, 9)}`
            : `cal${label}`;
        
        const btn = new ButtonBuilder()
            .setLabel(label)
            .setStyle(style)
            .setCustomId(customId);
        
        if (disabled || label === '\u200b') {
            btn.setDisabled(true);
        }
        
        return btn;
    };

    const text = [
        '(', ')', '^', '%', 'AC',
        '7', '8', '9', '÷', 'DC',
        '4', '5', '6', 'x', '⌫',
        '1', '2', '3', '-', '\u200b',
        '.', '0', '=', '+', '\u200b',
    ];

    const createRows = (disabled = false) => {
        const rows = [];
        for (let i = 0; i < 5; i++) {
            const row = new ActionRowBuilder();
            for (let j = 0; j < 5; j++) {
                const index = i * 5 + j;
                row.addComponents(createButton(text[index], disabled));
            }
            rows.push(row);
        }
        return rows;
    };

    let str = ' ';
    const rows = createRows(false);

    const calculatorContainer = new ContainerBuilder()
        .setAccentColor(getEmbedColor())
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('🧮 **Calculator**')
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`\`\`\`\n${str}\n\`\`\``)
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
        );

    await interaction.reply({
        components: [calculatorContainer, ...rows],
        flags: MessageFlags.IsComponentsV2
    });

    const collector = interaction.channel.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000
    });

    collector.on('collect', async (btn) => {
        if (btn.user.id !== interaction.user.id) {
            return await btn.reply({
                content: `Only **${interaction.user.username}** can use this calculator.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await btn.deferUpdate();

        if (btn.customId === 'calAC') {
            str = ' ';
        } else if (btn.customId === 'calx') {
            str += '*';
        } else if (btn.customId === 'cal÷') {
            str += '/';
        } else if (btn.customId === 'cal⌫') {
            if (str !== ' ' && str !== '') {
                str = str.slice(0, -1);
                if (str === '') str = ' ';
            }
        } else if (btn.customId === 'cal=') {
            if (str !== ' ' && str !== '') {
                try {
                    const result = Function(`'use strict'; return (${str.replace(/\^/g, '**')})`)();
                    str += ' = ' + result;
                } catch (e) {
                    str = 'Invalid equation!';
                }
                
                setTimeout(() => {
                    str = ' ';
                    const updatedContainer = new ContainerBuilder()
                        .setAccentColor(getEmbedColor())
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent('🧮 **Calculator**')
                        )
                        .addSeparatorComponents(separator => separator)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent(`\`\`\`\n${str}\n\`\`\``)
                        )
                        .addSeparatorComponents(separator => separator)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
                        );
                    
                    interaction.editReply({
                        components: [updatedContainer, ...rows],
                        flags: MessageFlags.IsComponentsV2
                    }).catch(() => {});
                }, 2000);
            }
        } else if (btn.customId === 'calDC') {
            str = 'Calculator disabled!';
            const disabledContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('🧮 **Calculator**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`\`\`\`\n${str}\n\`\`\``)
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
                );
            
            const disabledRows = createRows(true);
            await interaction.editReply({
                components: [disabledContainer, ...disabledRows],
                flags: MessageFlags.IsComponentsV2
            });
            collector.stop();
            return;
        } else if (!btn.customId.startsWith('cal_empty_')) {
            str += btn.customId.replace('cal', '');
        }

        const updatedContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('🧮 **Calculator**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`\`\`\`\n${str}\n\`\`\``)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        await interaction.editReply({
            components: [updatedContainer, ...rows],
            flags: MessageFlags.IsComponentsV2
        });
    });

    collector.on('end', () => {
        const timeoutContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('🧮 **Calculator**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`\`\`\`\n${str}\n\`\`\``)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('*Calculator timed out*')
            );
        
        const disabledRows = createRows(true);
        interaction.editReply({
            components: [timeoutContainer, ...disabledRows],
            flags: MessageFlags.IsComponentsV2
        }).catch(() => {});
    });
}

async function handleSourcebin(interaction) {
    const title = interaction.options.getString('title');
    const content = interaction.options.getString('content');
    const description = interaction.options.getString('description') || '';

    const loadingContainer = new ContainerBuilder()
        .setAccentColor(getEmbedColor())
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('⏳ **Creating Paste...**')
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('Please wait while I create your Sourcebin paste...')
        );

    await interaction.reply({
        components: [loadingContainer],
        flags: MessageFlags.IsComponentsV2
    });

    try {
        const pasteUrl = await createSourcebinPaste(content, title, description);
        const pasteKey = pasteUrl.split('/').pop();
        const rawUrl = `https://cdn.sourceb.in/bins/${pasteKey}/0`;

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('✅ **Paste Created Successfully!**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**📝 Title:** ${title}`)
            );

        if (description) {
            successContainer.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**📄 Description:** ${description}`)
            );
        }

        successContainer.addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**🔗 Paste URL:** ${pasteUrl}`)
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**📎 Raw URL:** ${rawUrl}`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**📊 Content Length:** ${content.length} characters`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        await interaction.editReply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Sourcebin paste creation error:', error);

        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Paste Creation Failed**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`An error occurred while creating the paste: ${error.message}`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('Please try again later.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

function createSourcebinPaste(content, title = "API Generated Paste", description = "") {
    const https = require('https');
    
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            files: [{
                name: "paste.txt",
                content: content,
                languageId: 1
            }],
            title: title,
            description: description
        });

        const options = {
            hostname: 'sourceb.in',
            port: 443,
            path: '/api/bins',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'SourcebinAPI/1.0'
            }
        };

        const req = https.request(options, (response) => {
            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                console.log('Sourcebin Response status:', response.statusCode);
                console.log('Sourcebin Response data:', data);

                try {
                    if (response.statusCode === 200 || response.statusCode === 201) {
                        const result = JSON.parse(data);
                        if (result.key) {
                            resolve(`https://sourceb.in/${result.key}`);
                        } else {
                            reject(new Error(`No key in response: ${data}`));
                        }
                    } else {
                        reject(new Error(`HTTP ${response.statusCode}: ${data}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse response: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

async function handlePastefy(interaction) {
    const content = interaction.options.getString('content');

    if (!pastefy_API_KEY) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **API Key Missing**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('Pastefy API key is not configured. Please set the PASTEFY_API_KEY environment variable.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }

    const loadingContainer = new ContainerBuilder()
        .setAccentColor(getEmbedColor())
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('⏳ **Creating Paste...**')
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('Please wait while I create your Pastefy paste...')
        );

    await interaction.reply({
        components: [loadingContainer],
        flags: MessageFlags.IsComponentsV2
    });

    try {
        const pasteUrl = await createPastefyPaste(content);

        const pasteId = pasteUrl.split('/').pop();
        const rawUrl = `https://pastefy.app/${pasteId}/raw`;

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('✅ **Paste Created Successfully!**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**🔗 Paste URL:** ${pasteUrl}`)
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**📎 Raw URL:** ${rawUrl}`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**📊 Content Length:** ${content.length} characters`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        await interaction.editReply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Pastefy paste creation error:', error);

        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Paste Creation Failed**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`An error occurred while creating the paste: ${error.message}`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('Please try again later.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

function createPastefyPaste(content) {
    const https = require('https');
    
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            content: content,
            type: "PASTE"
        });

        const options = {
            hostname: 'pastefy.app',
            port: 443,
            path: '/api/v2/paste',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'Authorization': `Bearer ${pastefy_API_KEY}`
            }
        };

        const req = https.request(options, (response) => {
            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                console.log('Pastefy Response status:', response.statusCode);
                console.log('Pastefy Response data:', data);

                try {
                    if (response.statusCode === 200 || response.statusCode === 201) {
                        const result = JSON.parse(data);
                        if (result.paste && result.paste.id) {
                            resolve(`https://pastefy.app/${result.paste.id}`);
                        } else {
                            reject(new Error(`No paste ID in response: ${data}`));
                        }
                    } else {
                        reject(new Error(`HTTP ${response.statusCode}: ${data}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse response: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

async function handlePastebin(interaction) {
    const title = interaction.options.getString('title');
    const content = interaction.options.getString('content');

    const loadingContainer = new ContainerBuilder()
        .setAccentColor(getEmbedColor())
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('⏳ **Creating Paste...**')
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('Please wait while I create your Pastebin paste...')
        );

    await interaction.reply({
        components: [loadingContainer],
        flags: MessageFlags.IsComponentsV2
    });

    try {
        const pasteUrl = await createPastebinPaste(content, title);

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('✅ **Paste Created Successfully!**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**📝 Title:** ${title}`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**🔗 Paste URL:**\n${pasteUrl}`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**📊 Content Length:** ${content.length} characters`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        await interaction.editReply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Pastebin paste creation error:', error);

        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Paste Creation Failed**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`An error occurred while creating the paste: ${error.message}`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('Please try again later.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

function createPastebinPaste(content, title) {
    const https = require('https');
    const querystring = require('querystring');
    
    return new Promise((resolve, reject) => {
        const postData = querystring.stringify({
            api_dev_key: 'Qva9jbFVAJ31U9i9iANRYN7gpKRNju8w',
            api_paste_code: content,
            api_option: 'paste',
            api_paste_name: title
        });

        const options = {
            hostname: 'pastebin.com',
            port: 443,
            path: '/api/api_post.php',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (response) => {
            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                console.log('Pastebin Response status:', response.statusCode);
                console.log('Pastebin Response data:', data);

                if (response.statusCode === 200) {
                    if (data.startsWith('https://pastebin.com/')) {
                        resolve(data.trim());
                    } else if (data.startsWith('Bad API request')) {
                        reject(new Error(`Pastebin API error: ${data}`));
                    } else {
                        reject(new Error(`Unexpected response: ${data}`));
                    }
                } else {
                    reject(new Error(`HTTP ${response.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

function generatePassword(length, options) {
    let charset = '';
    
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?~';

    if (options.lowercase) charset += lowercase;
    if (options.uppercase) charset += uppercase;
    if (options.numbers) charset += numbers;
    if (options.symbols) charset += symbols;

    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }

    const requiredChars = [];
    if (options.lowercase) requiredChars.push(lowercase[Math.floor(Math.random() * lowercase.length)]);
    if (options.uppercase) requiredChars.push(uppercase[Math.floor(Math.random() * uppercase.length)]);
    if (options.numbers) requiredChars.push(numbers[Math.floor(Math.random() * numbers.length)]);
    if (options.symbols) requiredChars.push(symbols[Math.floor(Math.random() * symbols.length)]);

    const passwordArray = password.split('');
    const usedPositions = new Set();
    
    for (let i = 0; i < requiredChars.length; i++) {
        let position;
        do {
            position = Math.floor(Math.random() * length);
        } while (usedPositions.has(position));
        
        usedPositions.add(position);
        passwordArray[position] = requiredChars[i];
    }

    return passwordArray.join('');
}
