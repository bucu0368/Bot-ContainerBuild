
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
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

// Pokemon type colors for better visual appeal
const typeColors = {
    normal: '#A8A878',
    fire: '#F08030',
    water: '#6890F0',
    electric: '#F8D030',
    grass: '#78C850',
    ice: '#98D8D8',
    fighting: '#C03028',
    poison: '#A040A0',
    ground: '#E0C068',
    flying: '#A890F0',
    psychic: '#F85888',
    bug: '#A8B820',
    rock: '#B8A038',
    ghost: '#705898',
    dragon: '#7038F8',
    dark: '#705848',
    steel: '#B8B8D0',
    fairy: '#EE99AC'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pokemon')
        .setDescription('Get detailed Pokemon information')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands)
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('Name or ID of the Pokemon to search for')
                .setRequired(true)),

    async execute(interaction) {
        // Check if user has required permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ You need "Use Application Commands" permission to use this command.')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        // Check if bot has required permissions
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ I need "Use Application Commands" permission to execute this command.')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const pokemonName = interaction.options.getString('name').toLowerCase().trim();

        try {
            // Fetch Pokemon data from PokeAPI
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
            
            if (!response.ok) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`❌ Pokemon "${pokemonName}" not found. Please check the spelling and try again.`)
                    );

                return await interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const pokemon = await response.json();

            // Fetch species data for additional information
            const speciesResponse = await fetch(pokemon.species.url);
            const species = await speciesResponse.json();

            // Get Pokemon type color
            const primaryType = pokemon.types[0].type.name;
            const typeColor = typeColors[primaryType] || getEmbedColor(interaction.client);

            // Format Pokemon name
            const formattedName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
            
            // Format types
            const types = pokemon.types.map(type => 
                type.type.name.charAt(0).toUpperCase() + type.type.name.slice(1)
            ).join(', ');

            // Format abilities
            const abilities = pokemon.abilities.map(ability => {
                const abilityName = ability.ability.name.replace(/-/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());
                return ability.is_hidden ? `${abilityName} (Hidden)` : abilityName;
            }).join(', ');

            // Format stats
            const stats = pokemon.stats.map(stat => {
                const statName = stat.stat.name.replace(/-/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase())
                    .replace('Special Attack', 'Sp. Attack')
                    .replace('Special Defense', 'Sp. Defense');
                return `**${statName}:** ${stat.base_stat}`;
            }).join('\n');

            // Get evolution chain info
            let evolutionText = 'No evolution data available';
            try {
                const evolutionResponse = await fetch(species.evolution_chain.url);
                const evolutionChain = await evolutionResponse.json();
                evolutionText = getEvolutionChain(evolutionChain.chain);
            } catch (error) {
                console.log('Could not fetch evolution data:', error.message);
            }

            // Get Pokemon description
            let description = 'No description available';
            const flavorText = species.flavor_text_entries.find(entry => entry.language.name === 'en');
            if (flavorText) {
                description = flavorText.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ');
            }

            const container = new ContainerBuilder()
                .setAccentColor(parseInt(typeColor.replace('#', ''), 16));

            // Pokemon name and basic info
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`🔹 **${formattedName}** #${pokemon.id.toString().padStart(3, '0')}`)
            );

            container.addSeparatorComponents(separator => separator);

            // Add Pokemon sprite
            if (pokemon.sprites.other['official-artwork'].front_default) {
                try {
                    container.addMediaGalleryComponents(
                        new MediaGalleryBuilder()
                            .addItems(
                                new MediaGalleryItemBuilder()
                                    .setURL(pokemon.sprites.other['official-artwork'].front_default)
                            )
                    );
                } catch (error) {
                    console.warn('Failed to add Pokemon image:', error);
                }
            }

            // Basic information
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**__Basic Information__**\n**Type${pokemon.types.length > 1 ? 's' : ''}:** ${types}\n**Height:** ${(pokemon.height / 10).toFixed(1)} m\n**Weight:** ${(pokemon.weight / 10).toFixed(1)} kg\n**Abilities:** ${abilities}`)
            );

            container.addSeparatorComponents(separator => separator);

            // Description
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**__Description__**\n${description}`)
            );

            container.addSeparatorComponents(separator => separator);

            // Base stats
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**__Base Stats__**\n${stats}\n**Total:** ${pokemon.stats.reduce((total, stat) => total + stat.base_stat, 0)}`)
            );

            container.addSeparatorComponents(separator => separator);

            // Evolution chain
            if (evolutionText !== 'No evolution data available') {
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**__Evolution Chain__**\n${evolutionText}`)
                );

                container.addSeparatorComponents(separator => separator);
            }

            // Additional info
            const habitat = species.habitat ? species.habitat.name.charAt(0).toUpperCase() + species.habitat.name.slice(1) : 'Unknown';
            const generation = species.generation.name.replace('generation-', 'Generation ').toUpperCase();
            
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**__Additional Info__**\n**Generation:** ${generation}\n**Habitat:** ${habitat}\n**Base Experience:** ${pokemon.base_experience || 'Unknown'}\n**Capture Rate:** ${species.capture_rate}/255`)
            );

            await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error in pokemon command:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ Failed to fetch Pokemon information. Please try again later.')
                );

            await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};

// Helper function to format evolution chain
function getEvolutionChain(chain) {
    const evolutions = [];
    
    function processChain(current) {
        const name = current.species.name.charAt(0).toUpperCase() + current.species.name.slice(1);
        evolutions.push(name);
        
        if (current.evolves_to && current.evolves_to.length > 0) {
            current.evolves_to.forEach(evolution => {
                processChain(evolution);
            });
        }
    }
    
    processChain(chain);
    
    if (evolutions.length <= 1) {
        return 'Does not evolve';
    }
    
    return evolutions.join(' → ');
}
