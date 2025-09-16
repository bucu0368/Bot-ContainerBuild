
const { SlashCommandBuilder, ContainerBuilder, MessageFlags } = require('discord.js');
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
        .setName('stock')
        .setDescription('Display current Grow a Garden stock information'),

    async execute(interaction) {
        // Send initial loading message
        const loadingContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('⏳ Loading stock information...')
            );

        const sent = await interaction.reply({ 
            components: [loadingContainer], 
            flags: MessageFlags.IsComponentsV2,
            fetchReply: true 
        });

        try {
            // Fetch stock data from the API
            const response = await fetch('https://growagarden.gg/api/stock');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const stockData = await response.json();

            // Helper function to format stock items
            function formatStockCategory(category, maxItems = 10) {
                if (!category || !Array.isArray(category)) return 'No data available';
                
                return category.slice(0, maxItems).map(item => 
                    `${item.name || 'Unknown'} - ${item.value || '0'}`
                ).join('\n') || 'No items available';
            }

            // Create the container
            const container = new ContainerBuilder()
                .setAccentColor(getEmbedColor(interaction.client));

            // Add author section
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`🌱 **${interaction.client.user.username} • Grow a Garden Stocks**`)
            );

            container.addSeparatorComponents(separator => separator);

            // Add stock fields
            if (stockData.seedsStock) {
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**SEEDS STOCK:**\n${formatStockCategory(stockData.seedsStock, 9)}`)
                );
                container.addSeparatorComponents(separator => separator);
            }

            if (stockData.gearStock) {
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**GEAR STOCK:**\n${formatStockCategory(stockData.gearStock, 9)}`)
                );
                container.addSeparatorComponents(separator => separator);
            }

            if (stockData.eggStock) {
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**EGG STOCK:**\n${formatStockCategory(stockData.eggStock, 4)}`)
                );
                container.addSeparatorComponents(separator => separator);
            }

            if (stockData.eventStock) {
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**EVENT STOCK:**\n${formatStockCategory(stockData.eventStock, 2)}`)
                );
                container.addSeparatorComponents(separator => separator);
            }

            if (stockData.cosmeticsStock) {
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**COSMETICS STOCK:**\n${formatStockCategory(stockData.cosmeticsStock, 10)}`)
                );
                container.addSeparatorComponents(separator => separator);
            }

            // Add timestamp
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`Updated: <t:${Math.floor(Date.now() / 1000)}:R>`)
            );

            // Edit the original loading message with the container
            await interaction.editReply({ 
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error fetching stock data:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ **Error**\nFailed to fetch stock data from the API. Please try again later.')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**Error Details**\n${error.message || 'Unknown error occurred'}`)
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`Timestamp: <t:${Math.floor(Date.now() / 1000)}:R>`)
                );

            await interaction.editReply({ 
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};
