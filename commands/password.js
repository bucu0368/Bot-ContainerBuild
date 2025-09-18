
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('password')
        .setDescription('Generate a secure random password')
        .addIntegerOption(option =>
            option
                .setName('length')
                .setDescription('Password length (default: 12)')
                .setRequired(false)
                .setMinValue(4)
                .setMaxValue(128))
        .addBooleanOption(option =>
            option
                .setName('include_symbols')
                .setDescription('Include special symbols (default: true)')
                .setRequired(false))
        .addBooleanOption(option =>
            option
                .setName('include_numbers')
                .setDescription('Include numbers (default: true)')
                .setRequired(false))
        .addBooleanOption(option =>
            option
                .setName('include_uppercase')
                .setDescription('Include uppercase letters (default: true)')
                .setRequired(false))
        .addBooleanOption(option =>
            option
                .setName('include_lowercase')
                .setDescription('Include lowercase letters (default: true)')
                .setRequired(false)),

    async execute(interaction) {
        const length = interaction.options.getInteger('length') || 12;
        const includeSymbols = interaction.options.getBoolean('include_symbols') ?? true;
        const includeNumbers = interaction.options.getBoolean('include_numbers') ?? true;
        const includeUppercase = interaction.options.getBoolean('include_uppercase') ?? true;
        const includeLowercase = interaction.options.getBoolean('include_lowercase') ?? true;

        // Ensure at least one character type is selected
        if (!includeSymbols && !includeNumbers && !includeUppercase && !includeLowercase) {
            return await interaction.reply({
                content: '❌ You must include at least one character type!',
                ephemeral: true
            });
        }

        try {
            const password = generatePassword(length, {
                symbols: includeSymbols,
                numbers: includeNumbers,
                uppercase: includeUppercase,
                lowercase: includeLowercase
            });

            const { buildContainerFromEmbedShape } = require('../utils/container');
            const { replyV2 } = require('../utils/sendV2');

            const container = buildContainerFromEmbedShape({
                title: '🔐 Generated Password',
                color: getEmbedColor(interaction.client),
                fields: [
                    {
                        name: '🎯 Your Password:',
                        value: `\`\`${password}\`\``
                    },
                    {
                        name: '📊 Password Details:',
                        value: [
                            `**Length:** ${length} characters`,
                            `**Symbols:** ${includeSymbols ? '✅' : '❌'}`,
                            `**Numbers:** ${includeNumbers ? '✅' : '❌'}`,
                            `**Uppercase:** ${includeUppercase ? '✅' : '❌'}`,
                            `**Lowercase:** ${includeLowercase ? '✅' : '❌'}`
                        ].join('\n')
                    },
                    {
                        name: '⚠️ Security Tips:',
                        value: '• Never share your password with anyone\n• Use unique passwords for each account\n• Consider using a password manager\n• Change passwords regularly'
                    }
                ],
                footer: {
                    text: 'Keep your password safe and secure!'
                },
                timestamp: new Date()
            });

            await replyV2(interaction, { 
                embed: container, 
                ephemeral: true 
            });

        } catch (error) {
            console.error('Error generating password:', error);
            
            const { buildContainerFromEmbedShape } = require('../utils/container');
            const { replyV2 } = require('../utils/sendV2');
            
            const errorContainer = buildContainerFromEmbedShape({
                title: '❌ Error',
                description: 'An error occurred while generating the password. Please try again.',
                color: '#ff0000',
                timestamp: new Date()
            });

            await replyV2(interaction, { 
                embed: errorContainer, 
                ephemeral: true 
            });
        }
    },
};

function generatePassword(length, options) {
    let charset = '';
    
    // Character sets
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?~';

    // Build character set based on options
    if (options.lowercase) charset += lowercase;
    if (options.uppercase) charset += uppercase;
    if (options.numbers) charset += numbers;
    if (options.symbols) charset += symbols;

    // Generate password
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }

    // Ensure password contains at least one character from each selected type
    const requiredChars = [];
    if (options.lowercase) requiredChars.push(lowercase[Math.floor(Math.random() * lowercase.length)]);
    if (options.uppercase) requiredChars.push(uppercase[Math.floor(Math.random() * uppercase.length)]);
    if (options.numbers) requiredChars.push(numbers[Math.floor(Math.random() * numbers.length)]);
    if (options.symbols) requiredChars.push(symbols[Math.floor(Math.random() * symbols.length)]);

    // Replace random positions with required characters
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
