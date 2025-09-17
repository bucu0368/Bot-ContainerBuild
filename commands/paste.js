const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { ContainerBuilder } = require('discord.js');
const { createSuccessContainer, createErrorContainer } = require('../utils/container');
const { editReplyV2 } = require('../utils/sendV2');
const https = require('https');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('paste')
        .setDescription('Paste-related commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new paste with title and description')),

    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'create') {
            // Create modal for paste creation
            const modal = new ModalBuilder()
                .setCustomId('paste_create_modal')
                .setTitle('📋 Create New Paste');

            // Title input
            const titleInput = new TextInputBuilder()
                .setCustomId('paste_title')
                .setLabel('Paste Title')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter a title for your paste...')
                .setRequired(false)
                .setMaxLength(100);

            // Content input
            const contentInput = new TextInputBuilder()
                .setCustomId('paste_content')
                .setLabel('Paste Content')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Enter your paste content here...')
                .setRequired(true)
                .setMaxLength(4000);

            // Add inputs to action rows
            const titleRow = new ActionRowBuilder().addComponents(titleInput);
            const contentRow = new ActionRowBuilder().addComponents(contentInput);

            modal.addComponents(titleRow, contentRow);

            await interaction.showModal(modal);

            // Handle modal submission
            const filter = (modalInteraction) => {
                return modalInteraction.customId === 'paste_create_modal' && 
                       modalInteraction.user.id === interaction.user.id;
            };

            try {
                const modalSubmission = await interaction.awaitModalSubmit({ filter, time: 300000 });
                
                const title = modalSubmission.fields.getTextInputValue('paste_title') || 'API Generated Paste';
                const content = modalSubmission.fields.getTextInputValue('paste_content');

                // Defer the reply to give us time to create the paste
                await modalSubmission.deferReply();

                try {
                    const pasteUrl = await createSourcebinPaste(content, title);
                    const pasteKey = pasteUrl.split('/').pop();
                    const rawUrl = `https://cdn.sourceb.in/bins/${pasteKey}/0`;
                    const useravatar = modalSubmission.user.displayAvatarURL();

                    const container = new ContainerBuilder()
                        .setAccentColor(0x00FF00);

                    // Add main success message
                    container.addSectionComponents(
                        section => section
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent(`✅ **Paste Created Successfully**\n\n**Title:** ${title}\n**Content Length:** ${content.length} characters`)
                            )
                            .setThumbnailAccessory(
                                thumbnail => thumbnail
                                    .setURL(useravatar)
                            )
                    );

                    container.addSeparatorComponents(separator => separator);

                    // Add paste URLs section
                    container.addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**🔗 Paste URL:** [View Paste](${pasteUrl})\n**📄 Raw URL:** [Raw Content](${rawUrl})`)
                    );

                    container.addSeparatorComponents(separator => separator);

                    // Add footer information
                    container.addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`Credits: bucu0368\n<t:${Math.floor(Date.now() / 1000)}:F>`)
                    );

                    await modalSubmission.editReply({ 
                        components: [container], 
                        flags: MessageFlags.IsComponentsV2 
                    });

                } catch (error) {
                    console.error('Error creating paste:', error);
                    
                    const errorContainer = new ContainerBuilder()
                        .setAccentColor(0xFF0000);

                    errorContainer.addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`❌ **Failed to Create Paste**\n\nAn error occurred while creating your paste: ${error.message}\n\n<t:${Math.floor(Date.now() / 1000)}:F>`)
                    );

                    await modalSubmission.editReply({ 
                        components: [errorContainer], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                }

            } catch (error) {
                // Modal timed out or other error
                console.error('Modal submission error:', error);
            }
        }
    }
};

// Function to create paste on sourcebin
function createSourcebinPaste(content, title = "API Generated Paste") {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            files: [{
                name: "paste.txt",
                content: content,
                languageId: 1
            }],
            title: title,
            description: ""
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
                console.log('Response status:', response.statusCode);
                console.log('Response data:', data);
                
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