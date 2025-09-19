
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, MessageFlags } = require('discord.js');
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
        .setName('public-repo')
        .setDescription('Search GitHub repositories')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands)
        .addSubcommand(subcommand =>
            subcommand
                .setName('search')
                .setDescription('Search for public GitHub repositories')
                .addStringOption(option =>
                    option
                        .setName('prompt')
                        .setDescription('Search query for repositories')
                        .setRequired(true))),

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

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'search') {
            await handleRepositorySearch(interaction);
        }
    },
};

async function handleRepositorySearch(interaction) {
    const query = interaction.options.getString('prompt');
    
    await interaction.deferReply();

    try {
        const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`);
        
        if (!response.ok) {
            if (response.status === 403) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('❌ **GitHub API Rate Limit Exceeded**\n\nThe GitHub API rate limit has been reached. Please try again later.')
                    );

                return await interaction.editReply({ 
                    components: [errorContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            const noResultsContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`❌ **No Repositories Found**\n\nNo repositories found for query: **${query}**\n\nTry using different keywords or check your spelling.`)
                );

            return await interaction.editReply({ 
                components: [noResultsContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
        }

        const containers = [];

        data.items.slice(0, 10).forEach((repo, index) => {
            const container = new ContainerBuilder()
                .setAccentColor(getEmbedColor(interaction.client));

            // Add header
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`🔍 **GitHub Repository Search**\n\n**Query:** \`${query}\`\n**Result ${index + 1} of ${Math.min(data.items.length, 10)}**`)
            );

            container.addSeparatorComponents(separator => separator);

            // Add repository information
            const repoInfo = [
                `**📛 Name:** ${repo.name}`,
                `**👤 Owner:** ${repo.owner.login}`,
                `**📝 Description:** ${repo.description || 'No description available'}`,
                `**🗣️ Language:** ${repo.language || 'Not specified'}`,
                `**⭐ Stars:** ${repo.stargazers_count.toLocaleString()}`,
                `**🍴 Forks:** ${repo.forks_count.toLocaleString()}`,
                `**👀 Watchers:** ${repo.watchers_count.toLocaleString()}`,
                `**🐛 Open Issues:** ${repo.open_issues_count.toLocaleString()}`,
                `**📜 License:** ${repo.license ? repo.license.name : 'No license'}`
            ].join('\n');

            container.addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**📊 Repository Information**\n${repoInfo}`)
                    )
                    .setThumbnailAccessory(
                        thumbnail => thumbnail
                            .setURL(repo.owner.avatar_url)
                    )
            );

            container.addSeparatorComponents(separator => separator);

            // Add dates
            const createdDate = new Date(repo.created_at);
            const updatedDate = new Date(repo.updated_at);
            
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**📅 Repository Dates**\n**Created:** <t:${Math.floor(createdDate.getTime() / 1000)}:F>\n**Last Updated:** <t:${Math.floor(updatedDate.getTime() / 1000)}:R>`)
            );

            container.addSeparatorComponents(separator => separator);

            // Add action buttons
            container.addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**🔗 Quick Actions**\nView repository or clone it locally!`)
                    )
                    .setButtonAccessory(
                        button => button
                            .setLabel('View Repository')
                            .setStyle(ButtonStyle.Link)
                            .setURL(repo.html_url)
                    )
            );

            // Add clone URL
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**📋 Clone URL:**\n\`\`\`\ngit clone ${repo.clone_url}\n\`\`\``)
            );

            container.addSeparatorComponents(separator => separator);

            // Add footer with additional buttons
            container.addActionRowComponents(
                actionRow => actionRow
                    .setComponents(
                        new ButtonBuilder()
                            .setLabel('Invite Bot')
                            .setStyle(ButtonStyle.Link)
                            .setURL(`https://discord.com/oauth2/authorize?client_id=${interaction.client.config.clientId}&permissions=8&scope=bot%20applications.commands`),
                        new ButtonBuilder()
                            .setLabel('Join Server')
                            .setStyle(ButtonStyle.Link)
                            .setURL(interaction.client.config.SupportServerLink)
                    )
            );

            // Add footer text
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`Requested by: ${interaction.user.tag}`)
            );

            containers.push(container);
        });

        await pagination(interaction, containers, false);

    } catch (error) {
        console.error('Error fetching GitHub repositories:', error);
        
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`❌ **GitHub Repository Search Failed**\n\nSorry, I couldn't search for repositories with query **${query}**. Please try again later.\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}

/**
 * Container pagination
 *
 * @param {BaseInteraction} interaction - The interaction that triggers the pagination.
 * @param {Array} components - The containers to show.
 * @param {boolean} ephemeral - Whether the pagination will be ephemeral or not.
 */
async function pagination(interaction, components, ephemeral) {
    try {
        if (!interaction || !components || components.length === 0) {
            throw new Error('[PAGINATION] Invalid args');
        }

        if (components.length === 1) {
            return await interaction.editReply({ 
                components: components, 
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

        // Clone the container and add buttons
        const containerWithButtons = new ContainerBuilder(components[index].toJSON());
        containerWithButtons.addActionRowComponents(buttons);

        const msg = await interaction.editReply({ 
            components: [containerWithButtons], 
            flags: MessageFlags.IsComponentsV2,
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
                    ephemeral: true 
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

            if (index === 0) {
                first.setDisabled(true);
                prev.setDisabled(true);
            } else {
                first.setDisabled(false);
                prev.setDisabled(false);
            }

            if (index === components.length - 1) {
                next.setDisabled(true);
                last.setDisabled(true);
            } else {
                next.setDisabled(false);
                last.setDisabled(false);
            }

            // Clone the container and add updated buttons
            const updatedContainer = new ContainerBuilder(components[index].toJSON());
            updatedContainer.addActionRowComponents(buttons);

            await i.update({ 
                components: [updatedContainer], 
                flags: MessageFlags.IsComponentsV2 
            });

            collector.resetTimer();
        });

        collector.on("end", () => {
            return interaction.editReply({ 
                components: [components[index]], 
                flags: MessageFlags.IsComponentsV2 
            }).catch(() => {});
        });

        return msg;

    } catch (error) {
        console.error(`[PAGINATION] Error: ${error}`);
        throw error;
    }
}
