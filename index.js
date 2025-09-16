const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, PermissionFlagsBits, ActivityType, ContainerBuilder, MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Load configuration
let config;
try {
    config = require('./config.json');
} catch (error) {
    console.error('❌ Could not load config.json file. Please make sure it exists and is properly formatted.');
    process.exit(1);
}

// Create a new client instance
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildWebhooks
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ]
});

// Commands collection
client.commands = new Collection();

// Set up success message function
client.succNormal = function(options, interaction) {
    const { createSuccessContainer } = require('./utils/container');
    const { replyV2, editReplyV2 } = require('./utils/sendV2');
    const container = createSuccessContainer(options.text, interaction.client);
    
    if (options.type === 'ephemeraledit') {
        return editReplyV2(interaction, { embed: container, ephemeral: true });
    } else {
        return replyV2(interaction, { embed: container });
    }
};

// Load commands
const commandsPath = path.join(__dirname, 'commands');
function loadCommands(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            loadCommands(filePath);
        } else if (file.endsWith('.js')) {
            const command = require(filePath);
            client.commands.set(command.data.name, command);
        }
    }
}

if (fs.existsSync(commandsPath)) {
    loadCommands(commandsPath);
}

// Load events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

// Deploy commands function
async function deployCommands() {
    const token = process.env.DISCORD_TOKEN || config.token;
    const clientId = config.clientId;

    if (!token || !clientId) {
        console.log('❌ Missing DISCORD_TOKEN or CLIENT_ID environment variables');
        return;
    }

    const commands = [];
    client.commands.forEach((command) => {
        commands.push(command.data.toJSON());
    });

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
}

// Make config available globally
client.config = config;

// Error logging function
async function logError(client, error, errorType = 'Unknown Error') {
    try {
        const errorChannelId = client.config?.ErrorLogChannelID;
        if (!errorChannelId) return;

        const errorChannel = await client.channels.fetch(errorChannelId).catch(() => null);
        if (!errorChannel) return;

        const { buildContainerFromEmbedShape } = require('./utils/container');
        const { sendV2 } = require('./utils/sendV2');
        
        const container = buildContainerFromEmbedShape({
            title: `🚨・${errorType}`,
            color: '#ff0000',
            fields: [
                {
                    name: `Error`,
                    value: `\`\`\`${error.toString().substring(0, 1000)}\`\`\``,
                },
                {
                    name: `Stack error`,
                    value: `\`\`\`${error.stack ? error.stack.substring(0, 1000) : 'No stack trace available'}\`\`\``,
                }
            ],
            timestamp: new Date()
        });

        await sendV2(errorChannel, { embed: container });
    } catch (logError) {
        console.error('Failed to log error to Discord:', logError);
    }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    if (client.isReady()) {
        logError(client, reason, 'Unhandled Rejection');
    }
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    if (client.isReady()) {
        logError(client, error, 'Uncaught Exception');
    }
    process.exit(1);
});

// Discord client error handling
client.on('error', (error) => {
    console.error('Discord client error:', error);
    logError(client, error, 'Discord Client Error');
});

client.on('warn', (warning) => {
    console.warn('Discord client warning:', warning);
});

// Login to Discord
const token = process.env.DISCORD_TOKEN || config.token;
const clientId = config.clientId;

if (token && clientId) {
    console.log('🔄 Attempting to login to Discord...');
    client.login(token).catch(error => {
        console.error('❌ Failed to login to Discord:', error);
        process.exit(1);
    });
} else {
    console.log('❌ Please set DISCORD_TOKEN and CLIENT_ID environment variables');
    console.log('You can get these from https://discord.com/developers/applications');
    console.log('DISCORD_TOKEN: Your bot token from the Bot section');
    console.log('CLIENT_ID: Your application ID from General Information');
}

// Deploy commands when bot is ready
client.once('ready', () => {
    console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
    
    // Set bot status and activity
    client.user.setStatus(config.setStatus);
    client.user.setActivity(config.setActivity, { type: ActivityType.Playing });
    
    deployCommands();
});

module.exports = client;
