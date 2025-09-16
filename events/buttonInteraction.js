
const { ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        // Handle giveaway join buttons
        if (interaction.customId.startsWith('giveaway_join_')) {
            const { activeGiveaways, getEmbedColor, getErrorColor } = require('../commands/giveaway');
            
            // Find the giveaway by message ID
            const giveaway = Array.from(activeGiveaways.values())
                .find(g => g.channelId === interaction.channel.id);

            if (!giveaway) {
                return await interaction.reply({
                    content: '❌ This giveaway is no longer active.',
                    ephemeral: true
                });
            }

            if (giveaway.ended) {
                return await interaction.reply({
                    content: '❌ This giveaway has already ended.',
                    ephemeral: true
                });
            }

            // Check if user is already participating
            if (giveaway.participants.has(interaction.user.id)) {
                const alreadyEnteredContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('❌ **Already Entered!**\n\nYou are already participating in this giveaway.')
                    );

                return await interaction.reply({
                    components: [alreadyEnteredContainer],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true
                });
            }

            // Add user to participants
            giveaway.participants.add(interaction.user.id);

            const successContainer = new ContainerBuilder()
                .setAccentColor(getEmbedColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('🎉 **Entry Successful!**\n\nYou have been entered into the giveaway!\nGood luck! 🍀')
                );

            await interaction.reply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
    },
};
