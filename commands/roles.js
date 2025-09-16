
const { SlashCommandBuilder, ContainerBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roles')
        .setDescription('Display all roles in the server with pagination'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const guild = interaction.guild;
            const roles = guild.roles.cache
                .filter(role => role.id !== guild.id) // Exclude @everyone role
                .sort((a, b) => b.position - a.position) // Sort by position (highest first)
                .values();
            
            const roleArray = Array.from(roles);

            if (roleArray.length === 0) {
                const container = new ContainerBuilder()
                    .setAccentColor(getEmbedColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('📭 No roles found in this server (excluding @everyone).')
                    );

                return await interaction.editReply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const itemsPerPage = 10;
            let currentPage = 0;
            const totalPages = Math.ceil(roleArray.length / itemsPerPage);

            function createContainer(page) {
                const start = page * itemsPerPage;
                const end = start + itemsPerPage;
                const currentRoles = roleArray.slice(start, end);

                const container = new ContainerBuilder()
                    .setAccentColor(getEmbedColor(interaction.client));

                // Add title
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`📋 **List of Roles in ${guild.name} - ${roleArray.length} roles**`)
                );

                container.addSeparatorComponents(separator => separator);

                // Create description with role mentions and IDs
                let description = '';
                currentRoles.forEach((role, index) => {
                    const globalIndex = start + index + 1;
                    description += `\`#${globalIndex}.\` <@&${role.id}> - \`[${role.id}]\`\n`;
                });

                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(description)
                );

                container.addSeparatorComponents(separator => separator);
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`• Page ${page + 1}/${totalPages} | Requested by ${interaction.member?.displayName || interaction.user.tag}`)
                );

                return container;
            }

            function createButtons(page) {
                const row = new ActionRowBuilder();
                
                const prevButton = new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0);

                const nextButton = new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1);

                row.addComponents(prevButton, nextButton);
                return row;
            }

            const container = createContainer(currentPage);
            const components = totalPages > 1 ? [container, createButtons(currentPage)] : [container];

            const response = await interaction.editReply({
                components: components,
                flags: MessageFlags.IsComponentsV2
            });

            if (totalPages > 1) {
                const collector = response.createMessageComponentCollector({
                    componentType: 2, // Button component type
                    time: 60000
                });

                collector.on('collect', async (buttonInteraction) => {
                    if (buttonInteraction.user.id !== interaction.user.id) {
                        const errorContainer = new ContainerBuilder()
                            .setAccentColor(0xFF0000)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent('❌ You cannot use these buttons.')
                            );

                        return await buttonInteraction.reply({
                            components: [errorContainer],
                            flags: MessageFlags.IsComponentsV2,
                            ephemeral: true
                        });
                    }

                    if (buttonInteraction.customId === 'prev') {
                        currentPage--;
                    } else if (buttonInteraction.customId === 'next') {
                        currentPage++;
                    }

                    const newContainer = createContainer(currentPage);
                    const newComponents = [newContainer, createButtons(currentPage)];

                    try {
                        await buttonInteraction.update({
                            components: newComponents,
                            flags: MessageFlags.IsComponentsV2
                        });
                    } catch (error) {
                        console.error('Error updating button interaction:', error);
                    }
                });

                collector.on('end', async () => {
                    try {
                        const finalContainer = createContainer(currentPage);
                        await interaction.editReply({ 
                            components: [finalContainer],
                            flags: MessageFlags.IsComponentsV2
                        });
                    } catch (error) {
                        // Ignore error if message was already deleted
                    }
                });
            }
        } catch (error) {
            console.error('Error in roles command:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ Failed to fetch server roles. Please try again later.')
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
