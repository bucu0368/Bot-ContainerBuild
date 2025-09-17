
const { SlashCommandBuilder, ContainerBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
const wiki = require('wikijs').default;

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0066CC';
    return parseInt(color.replace('#', ''), 16);
}

function getErrorColor(client) {
    const color = client.config?.ErrorColor || '#ff0000';
    return parseInt(color.replace('#', ''), 16);
}

// Helper functions for reference processing
function extractSmartLinkName(url) {
    try {
        let urlObj = new URL(url);
        let domain = urlObj.hostname.replace('www.', '').toLowerCase();
        let pathname = urlObj.pathname;
        let searchParams = urlObj.searchParams;
        
        let titleFromPath = extractTitleFromPath(pathname);
        if (titleFromPath) {
            let domainName = getCleanDomainName(domain);
            return `${titleFromPath} - ${domainName}`;
        }
        
        let titleFromParams = extractTitleFromParams(searchParams);
        if (titleFromParams) {
            let domainName = getCleanDomainName(domain);
            return `${titleFromParams} - ${domainName}`;
        }
        
        return getIntelligentDomainName(domain);
    } catch (e) {
        return 'External Link';
    }
}

function extractTitleFromPath(pathname) {
    if (!pathname || pathname.length <= 1) return null;
    
    let pathParts = pathname.split('/').filter(part => part && part.length > 1);
    if (pathParts.length === 0) return null;
    
    for (let i = pathParts.length - 1; i >= 0; i--) {
        let part = pathParts[i];
        
        if (part.includes('.html') || part.includes('.pdf') || 
            part.includes('.php') || /^\d+$/.test(part) || 
            part.length < 3) continue;
            
        let cleaned = part
            .replace(/[-_]/g, ' ')
            .replace(/\+/g, ' ')
            .replace(/%20/g, ' ')
            .trim();
            
        if (cleaned.length >= 4 && cleaned.length <= 60 && 
            /[a-zA-Z]/.test(cleaned) && 
            cleaned.split(' ').length <= 8) {
            
            return cleaned.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        }
    }
    
    return null;
}

function extractTitleFromParams(searchParams) {
    let titleParams = ['title', 'q', 'query', 'search', 'article', 'page', 'name'];
    
    for (let param of titleParams) {
        let value = searchParams.get(param);
        if (value && value.length >= 4 && value.length <= 60) {
            let cleaned = decodeURIComponent(value)
                .replace(/[-_+]/g, ' ')
                .trim();
                
            if (/[a-zA-Z]/.test(cleaned) && cleaned.split(' ').length <= 8) {
                return cleaned.split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
            }
        }
    }
    
    return null;
}

function getIntelligentDomainName(domain) {
    let parts = domain.split('.');
    
    if (parts.length >= 3) {
        let subdomain = parts[0];
        let mainDomain = parts[1];
        
        if (isLanguageCode(subdomain)) {
            return `${capitalize(mainDomain)} (${subdomain.toUpperCase()})`;
        } else if (subdomain.length <= 8 && /^[a-z]+$/.test(subdomain)) {
            return `${capitalize(subdomain)} ${capitalize(mainDomain)}`;
        }
    }
    
    let mainPart = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    
    let tld = parts[parts.length - 1];
    let suffix = '';
    if (tld === 'gov') suffix = ' (Government)';
    else if (tld === 'edu') suffix = ' (Education)';
    else if (tld === 'org') suffix = ' (Organization)';
    else if (tld === 'mil') suffix = ' (Military)';
    
    if (mainPart.length <= 4 && /^[a-z]+$/.test(mainPart)) {
        return mainPart.toUpperCase() + suffix;
    }
    
    let cleanName = mainPart
        .replace(/[-_]/g, ' ')
        .split(' ')
        .map(word => capitalize(word))
        .join(' ');
        
    return cleanName + suffix;
}

function getCleanDomainName(domain) {
    let parts = domain.split('.');
    let mainPart = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    
    if (mainPart.length <= 4) {
        return mainPart.toUpperCase();
    }
    
    return capitalize(mainPart);
}

function extractTitleFromText(ref) {
    let patterns = [
        /^[^:]+:\s*(.+?)(?:\.|$)/,
        /^(.+?)\.\s+[A-Z][a-z]+/,
        /^(.+?)\s*\(\d{4}\)/,
        /^(.+?)\./
    ];
    
    for (let pattern of patterns) {
        let match = ref.match(pattern);
        if (match && match[1]) {
            let title = match[1].trim();
            
            if (title.length >= 10 && title.length <= 100 && 
                title.split(' ').length >= 2 && 
                title.split(' ').length <= 15) {
                
                return title.length > 80 ? title.substring(0, 77) + '...' : title;
            }
        }
    }
    
    return ref.length > 100 ? ref.substring(0, 97) + '...' : ref;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function isLanguageCode(code) {
    let langCodes = /^(en|hu|de|fr|es|it|ru|ja|zh|pt|nl|pl|sv|no|da|fi|ko|tr|ar|he|hi|th|vi|uk|el|ca|cs|bg|hr|et|lv|lt|mt|ro|sk|sl)$/i;
    return langCodes.test(code);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wikipedia')
        .setDescription('Search and browse Wikipedia articles')
        .addSubcommand(subcommand =>
            subcommand
                .setName('search')
                .setDescription('Search for articles on Wikipedia')
                .addStringOption(option => 
                    option.setName('query')
                        .setDescription('What would you like to search on Wikipedia?')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('language')
                        .setDescription('Wikipedia language (default: en)')
                        .setRequired(false)
                        .addChoices(
                            { name: '🇬🇧 English', value: 'en' },
                            { name: '🇭🇺 Magyar', value: 'hu' },
                            { name: '🇩🇪 Deutsch', value: 'de' },
                            { name: '🇫🇷 Français', value: 'fr' },
                            { name: '🇪🇸 Español', value: 'es' },
                            { name: '🇮🇹 Italiano', value: 'it' },
                            { name: '🇷🇺 Русский', value: 'ru' },
                            { name: '🇯🇵 日本語', value: 'ja' },
                            { name: '🇨🇳 中文', value: 'zh' },
                            { name: '🇵🇹 Português', value: 'pt' }
                        )
                )),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'search') {
            await handleSearch(interaction);
        }
    },
};

async function handleSearch(interaction) {
    let query = interaction.options.getString('query');
    let language = interaction.options.getString('language') || 'en';
    
    // Send initial loading message
    const loadingContainer = new ContainerBuilder()
        .setAccentColor(getEmbedColor(interaction.client))
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent('⏳ Loading Wikipedia Search...')
        );

    await interaction.reply({
        components: [loadingContainer],
        flags: MessageFlags.IsComponentsV2
    });

    try {
        // Wikipedia instance creation
        let wikiInstance;
        let supportedLanguages = ['en', 'hu', 'de', 'fr', 'es', 'it', 'ru', 'ja', 'zh', 'pt', 'nl', 'pl', 'sv', 'no', 'da', 'fi', 'ko', 'tr', 'ar', 'he', 'hi', 'th', 'vi', 'uk', 'el'];
        
        if (supportedLanguages.includes(language)) {
            try {
                wikiInstance = wiki({ apiUrl: `https://${language}.wikipedia.org/w/api.php` });
                let testSearch = await wikiInstance.search(query);
            } catch (langError) {
                console.log(`Language ${language} failed, falling back to English`);
                wikiInstance = wiki();
            }
        } else {
            wikiInstance = wiki();
        }
        
        // Perform search
        let searchResults = await wikiInstance.search(query);

        if (!searchResults.results || searchResults.results.length === 0) {
            const noResultContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('🚫 **No Results Found**\n\n' +
                                   `Sorry, I couldn't find anything about **"${query}"** on Wikipedia.\n\n` +
                                   '**💡 Suggestions**\n' +
                                   '• Check your spelling\n' +
                                   '• Try different keywords\n' +
                                   '• Use more general terms\n' +
                                   '• Try searching in English')
                );
            
            return await interaction.editReply({
                components: [noResultContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Get detailed data for first result
        let page = await wikiInstance.page(searchResults.results[0]);
        let summary = await page.summary();
        let pageUrl = page.url();
        
        // Get detailed data
        let mainImage = null;
        let categories = [];
        let coordinates = null;
        let images = [];
        let references = [];
        let langlinks = [];
        
        try { mainImage = await page.mainImage(); } catch (e) { console.log('No main image'); }
        try { categories = await page.categories(); } catch (e) { console.log('No categories'); }
        try { coordinates = await page.coordinates(); } catch (e) { console.log('No coordinates'); }
        try { 
            let allImages = await page.images(); 
            const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            images = allImages.filter(imageUrl => {
                let lowerUrl = imageUrl.toLowerCase();
                return supportedFormats.some(format => lowerUrl.includes(format));
            });
        } catch (e) { console.log('No images'); }
        try { references = await page.references(); } catch (e) { console.log('No references'); }
        try { langlinks = await page.langlinks(); } catch (e) { console.log('No langlinks'); }

        // Process summary for pagination
        let cleanSummary = summary
            .replace(/\n\n+/g, '\n\n')
            .replace(/\([^)]*\)/g, '')
            .trim();

        // Text chunking intelligently - by paragraphs
        let paragraphs = cleanSummary.split('\n\n');
        let chunks = [];
        let currentChunk = '';
        
        for (let paragraph of paragraphs) {
            if ((currentChunk + paragraph).length > 1500) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = paragraph;
                } else {
                    let sentences = paragraph.split('. ');
                    let sentenceChunk = '';
                    for (let sentence of sentences) {
                        if ((sentenceChunk + sentence).length > 1500) {
                            if (sentenceChunk) {
                                chunks.push(sentenceChunk.trim() + '.');
                                sentenceChunk = sentence;
                            } else {
                                chunks.push(sentence.substring(0, 1500) + '...');
                            }
                        } else {
                            sentenceChunk += (sentenceChunk ? '. ' : '') + sentence;
                        }
                    }
                    if (sentenceChunk) currentChunk = sentenceChunk + '.';
                }
            } else {
                currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
            }
        }
        if (currentChunk) chunks.push(currentChunk.trim());

        // References chunking
        let referencesChunks = [];
        if (references.length > 0) {
            let referencesPerPage = 10;
            for (let i = 0; i < references.length; i += referencesPerPage) {
                referencesChunks.push(references.slice(i, i + referencesPerPage));
            }
        }

        // Container color based on category
        let containerColor = getEmbedColor(interaction.client);
        if (categories.length > 0) {
            let category = categories[0].toLowerCase();
            if (category.includes('people') || category.includes('person') || category.includes('birth')) containerColor = 0xFF6B9D;
            else if (category.includes('place') || category.includes('location') || category.includes('cities')) containerColor = 0x4CAF50;
            else if (category.includes('science') || category.includes('technology')) containerColor = 0x9C27B0;
            else if (category.includes('history') || category.includes('event')) containerColor = 0xFF9800;
            else if (category.includes('culture') || category.includes('art')) containerColor = 0xE91E63;
        }

        // View mode and pagination variables
        let viewMode = 'text';
        let currentPage = 0;
        let totalPages = Math.max(1, chunks.length);
        let imageCurrentPage = 0;
        let imageTotalPages = Math.max(1, images.length);
        let referencesCurrentPage = 0;
        let referencesTotalPages = Math.max(1, referencesChunks.length);

        // Helper function to limit field values
        let limitFieldValue = (text, maxLength = 1020) => {
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength - 3) + '...';
        };

        // Pageable container system
        let generateContainer = (pageIndex, mode = 'text') => {
            const container = new ContainerBuilder()
                .setAccentColor(containerColor);

            if (mode === 'text') {
                // Main wiki content
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`📖 **${page.raw.title}**\n\n[View on Wikipedia](${pageUrl})`)
                );

                container.addSeparatorComponents(separator => separator);
                
                // Content pages
                if (pageIndex < chunks.length) {
                    container.addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(limitFieldValue(chunks[pageIndex], 3500))
                    );
                }

                // Add navigation buttons to container
                if (totalPages > 1) {
                    container.addActionRowComponents(
                        actionRow => actionRow
                            .setComponents(
                                new ButtonBuilder()
                                    .setCustomId('wiki_first')
                                    .setEmoji('⏮️')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(pageIndex === 0),
                                new ButtonBuilder()
                                    .setCustomId('wiki_prev')
                                    .setEmoji('◀️')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(pageIndex === 0),
                                new ButtonBuilder()
                                    .setCustomId('wiki_info')
                                    .setLabel(`${pageIndex + 1}/${totalPages}`)
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(true),
                                new ButtonBuilder()
                                    .setCustomId('wiki_next')
                                    .setEmoji('▶️')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(pageIndex === totalPages - 1),
                                new ButtonBuilder()
                                    .setCustomId('wiki_last')
                                    .setEmoji('⏭️')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(pageIndex === totalPages - 1)
                            )
                    );
                }
                
                // First page - extra information
                if (pageIndex === 0) {
                    // Main image
                    if (mainImage && mainImage.includes('http')) {
                        try {
                            container.addMediaGalleryComponents(
                                new MediaGalleryBuilder()
                                    .addItems(
                                        new MediaGalleryItemBuilder().setURL(mainImage)
                                    )
                            );
                        } catch (error) {
                            console.warn('Failed to add main image:', error);
                        }
                    }
                    
                    // Coordinates
                    if (coordinates && coordinates.lat && coordinates.lon) {
                        container.addSeparatorComponents(separator => separator);
                        container.addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent(`📍 **Coordinates**\n[${coordinates.lat.toFixed(4)}, ${coordinates.lon.toFixed(4)}](https://www.google.com/maps?q=${coordinates.lat},${coordinates.lon})`)
                        );
                    }
                }
                
                // Last page - meta information
                if (pageIndex === totalPages - 1) {
                    // Categories
                    if (categories.length > 0) {
                        container.addSeparatorComponents(separator => separator);
                        let categoryText = '';
                        let maxCategories = 8;
                        
                        for (let i = 0; i < Math.min(categories.length, maxCategories); i++) {
                            let cat = categories[i];
                            let cleanCat = cat.replace('Category:', '').replace('Kategória:', '');
                            let encodedCat = encodeURIComponent(cat);
                            let catLink = `[${cleanCat}](https://${language}.wikipedia.org/wiki/${encodedCat})`;
                            
                            let newText = categoryText ? `${categoryText} • ${catLink}` : catLink;
                            
                            if (newText.length > 900) {
                                if (categories.length > i) {
                                    categoryText += ` • [+${categories.length - i} more categories...](${pageUrl}#catlinks)`;
                                }
                                break;
                            }
                            categoryText = newText;
                        }
                        
                        if (categoryText) {
                            container.addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent(`🏷️ **Categories**\n${limitFieldValue(categoryText)}`)
                            );
                        }
                    }
                    
                    // Additional results
                    if (searchResults.results.length > 1) {
                        container.addSeparatorComponents(separator => separator);
                        let additionalResults = '';
                        let maxResults = 6;
                        
                        for (let i = 1; i < Math.min(searchResults.results.length, maxResults); i++) {
                            let result = searchResults.results[i];
                            let encodedTitle = encodeURIComponent(result.replace(/ /g, '_'));
                            let resultLink = `${i + 1}. [${result}](https://${language}.wikipedia.org/wiki/${encodedTitle})`;
                            
                            let newText = additionalResults ? `${additionalResults}\n${resultLink}` : resultLink;
                            
                            if (newText.length > 1000) {
                                if (searchResults.results.length > i) {
                                    additionalResults += `\n[+${searchResults.results.length - i} more results...](${pageUrl})`;
                                }
                                break;
                            }
                            additionalResults = newText;
                        }
                        
                        if (additionalResults) {
                            container.addTextDisplayComponents(
                                textDisplay => textDisplay
                                    .setContent(`🔍 **Related Articles**\n${limitFieldValue(additionalResults)}`)
                            );
                        }
                    }
                    
                    // Images and references count
                    if (images.length > 0 || references.length > 0) {
                        container.addSeparatorComponents(separator => separator);
                        let metaText = '';
                        if (images.length > 0) {
                            metaText += `🖼️ [${images.length} images on Wikipedia](${pageUrl}#/media/)`;
                        }
                        if (references.length > 0) {
                            if (metaText) metaText += '\n';
                            metaText += `📚 [${references.length} references](${pageUrl}#References)`;
                        }
                        
                        container.addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent(metaText)
                        );
                    }
                }

                container.addSeparatorComponents(separator => separator);
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`*Wikipedia (${language.toUpperCase()}) • Page ${pageIndex + 1}/${totalPages} • Requested by ${interaction.user.tag || interaction.user.id}*`)
                );

            } else if (mode === 'images') {
                // Images mode
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`🖼️ **Images: ${page.raw.title}**\n\n[View on Wikipedia](${pageUrl})`)
                );

                container.addSeparatorComponents(separator => separator);
                
                if (images.length > 0 && imageCurrentPage < images.length) {
                    let currentImage = images[imageCurrentPage];
                    container.addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**Image ${imageCurrentPage + 1} of ${images.length}**\n\n[View full size image](${currentImage})\n[All images on Wikipedia](${pageUrl}#/media/)`)
                    );

                    try {
                        container.addMediaGalleryComponents(
                            new MediaGalleryBuilder()
                                .addItems(
                                    new MediaGalleryItemBuilder().setURL(currentImage)
                                )
                        );
                    } catch (error) {
                        console.warn('Failed to add current image:', error);
                    }
                } else {
                    container.addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('No images available for this article.')
                    );
                }

                // Add image navigation buttons to container
                if (images.length > 1) {
                    container.addActionRowComponents(
                        actionRow => actionRow
                            .setComponents(
                                new ButtonBuilder()
                                    .setCustomId('wiki_img_first')
                                    .setEmoji('⏮️')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(imageCurrentPage === 0),
                                new ButtonBuilder()
                                    .setCustomId('wiki_img_prev')
                                    .setEmoji('◀️')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(imageCurrentPage === 0),
                                new ButtonBuilder()
                                    .setCustomId('wiki_img_info')
                                    .setLabel(`${imageCurrentPage + 1}/${imageTotalPages}`)
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(true),
                                new ButtonBuilder()
                                    .setCustomId('wiki_img_next')
                                    .setEmoji('▶️')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(imageCurrentPage === imageTotalPages - 1),
                                new ButtonBuilder()
                                    .setCustomId('wiki_img_last')
                                    .setEmoji('⏭️')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(imageCurrentPage === imageTotalPages - 1)
                            )
                    );
                }

                container.addSeparatorComponents(separator => separator);
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`*Wikipedia Images (${language.toUpperCase()}) • Image ${imageCurrentPage + 1}/${imageTotalPages} • Requested by ${interaction.user.tag || interaction.user.id}*`)
                );

            } else if (mode === 'references') {
                // References mode
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`📚 **References: ${page.raw.title}**\n\n[View on Wikipedia](${pageUrl})`)
                );

                container.addSeparatorComponents(separator => separator);
                
                if (referencesChunks.length > 0 && referencesCurrentPage < referencesChunks.length) {
                    let currentReferences = referencesChunks[referencesCurrentPage];
                    
                    let referencesText = currentReferences
                        .map((ref, index) => {
                            let refIndex = (referencesCurrentPage * 10) + index + 1;
                            
                            if (ref.startsWith('http')) {
                                let linkName = extractSmartLinkName(ref);
                                return `${refIndex}. [${linkName}](${ref})`;
                            } else {
                                let processedRef = extractTitleFromText(ref);
                                return `${refIndex}. ${processedRef}`;
                            }
                        })
                        .join('\n');
                    
                    let description = `**References ${(referencesCurrentPage * 10) + 1}-${Math.min((referencesCurrentPage + 1) * 10, references.length)} of ${references.length}**\n\n${referencesText}\n\n[View all references on Wikipedia](${pageUrl}#References)`;
                    
                    container.addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(limitFieldValue(description, 3500))
                    );
                } else {
                    container.addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('No references available for this article.')
                    );
                }

                // Add references navigation buttons to container
                if (referencesTotalPages > 1) {
                    container.addActionRowComponents(
                        actionRow => actionRow
                            .setComponents(
                                new ButtonBuilder()
                                    .setCustomId('wiki_ref_first')
                                    .setEmoji('⏮️')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(referencesCurrentPage === 0),
                                new ButtonBuilder()
                                    .setCustomId('wiki_ref_prev')
                                    .setEmoji('◀️')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(referencesCurrentPage === 0),
                                new ButtonBuilder()
                                    .setCustomId('wiki_ref_info')
                                    .setLabel(`${referencesCurrentPage + 1}/${referencesTotalPages}`)
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(true),
                                new ButtonBuilder()
                                    .setCustomId('wiki_ref_next')
                                    .setEmoji('▶️')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(referencesCurrentPage === referencesTotalPages - 1),
                                new ButtonBuilder()
                                    .setCustomId('wiki_ref_last')
                                    .setEmoji('⏭️')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(referencesCurrentPage === referencesTotalPages - 1)
                            )
                    );
                }

                container.addSeparatorComponents(separator => separator);
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`*Wikipedia References (${language.toUpperCase()}) • Page ${referencesCurrentPage + 1}/${referencesTotalPages} • Requested by ${interaction.user.tag || interaction.user.id}*`)
                );

            } else if (mode === 'summary') {
                // Summary mode
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`📄 **Summary: ${page.raw.title}**\n\n[View on Wikipedia](${pageUrl})`)
                );

                container.addSeparatorComponents(separator => separator);
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(limitFieldValue(cleanSummary.substring(0, 1000) + (cleanSummary.length > 1000 ? '...' : ''), 3500))
                );
                
                // Basic statistics
                container.addSeparatorComponents(separator => separator);
                let statsText = `**📊 Article Statistics**\n**Length:** [${cleanSummary.length} characters](${pageUrl})\n**Pages:** [${totalPages} pages](${pageUrl})\n**Categories:** [${categories.length} categories](${pageUrl}#Categories)`;
                let mediaText = `**📈 Media & References**\n**Images:** [${images.length} available](${pageUrl}#/media/)\n**References:** [${references.length} sources](${pageUrl}#References)\n**Languages:** [${langlinks.length} available](${pageUrl}#Languages)`;
                
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(statsText)
                );

                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(mediaText)
                );
                
                // Additional results
                if (searchResults.results.length > 1) {
                    container.addSeparatorComponents(separator => separator);
                    let additionalResults = '';
                    let maxResults = 6;
                    
                    for (let i = 1; i < Math.min(searchResults.results.length, maxResults); i++) {
                        let result = searchResults.results[i];
                        let encodedTitle = encodeURIComponent(result.replace(/ /g, '_'));
                        let resultLink = `${i + 1}. [${result}](https://${language}.wikipedia.org/wiki/${encodedTitle})`;
                        
                        let newText = additionalResults ? `${additionalResults}\n${resultLink}` : resultLink;
                        
                        if (newText.length > 1000) {
                            if (searchResults.results.length > i) {
                                additionalResults += `\n[+${searchResults.results.length - i} more results...](${pageUrl})`;
                            }
                            break;
                        }
                        additionalResults = newText;
                    }
                    
                    if (additionalResults) {
                        container.addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent(`🔍 **Related Articles**\n${limitFieldValue(additionalResults)}`)
                        );
                    }
                }

                container.addSeparatorComponents(separator => separator);
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`*Wikipedia Summary (${language.toUpperCase()}) • Requested by ${interaction.user.tag || interaction.user.id}*`)
                );
            }

            // Add mode switching buttons to all containers
            container.addActionRowComponents(
                actionRow => actionRow
                    .setComponents(
                        new ButtonBuilder()
                            .setCustomId('wiki_home')
                            .setLabel('Home')
                            .setEmoji('🏠')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(mode === 'text'),
                        new ButtonBuilder()
                            .setCustomId('wiki_images')
                            .setLabel('Images')
                            .setEmoji('🖼️')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(images.length === 0 || mode === 'images'),
                        new ButtonBuilder()
                            .setCustomId('wiki_references')
                            .setLabel('References')
                            .setEmoji('📚')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(references.length === 0 || mode === 'references'),
                        new ButtonBuilder()
                            .setCustomId('wiki_summary')
                            .setLabel('Summary')
                            .setEmoji('📄')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(mode === 'summary')
                    )
            );

            return container;
        };

        let generateButtons = (pageIndex, mode = 'text') => {
            let row = new ActionRowBuilder();
            
            if (mode === 'text') {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('wiki_first')
                        .setEmoji('⏮️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(pageIndex === 0),
                    new ButtonBuilder()
                        .setCustomId('wiki_prev')
                        .setEmoji('◀️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(pageIndex === 0),
                    new ButtonBuilder()
                        .setCustomId('wiki_info')
                        .setLabel(`${pageIndex + 1}/${totalPages}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('wiki_next')
                        .setEmoji('▶️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(pageIndex === totalPages - 1),
                    new ButtonBuilder()
                        .setCustomId('wiki_last')
                        .setEmoji('⏭️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(pageIndex === totalPages - 1)
                );
            } else if (mode === 'images') {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('wiki_img_first')
                        .setEmoji('⏮️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(imageCurrentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('wiki_img_prev')
                        .setEmoji('◀️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(imageCurrentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('wiki_img_info')
                        .setLabel(`${imageCurrentPage + 1}/${imageTotalPages}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('wiki_img_next')
                        .setEmoji('▶️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(imageCurrentPage === imageTotalPages - 1),
                    new ButtonBuilder()
                        .setCustomId('wiki_img_last')
                        .setEmoji('⏭️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(imageCurrentPage === imageTotalPages - 1)
                );
            } else if (mode === 'references') {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('wiki_ref_first')
                        .setEmoji('⏮️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(referencesCurrentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('wiki_ref_prev')
                        .setEmoji('◀️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(referencesCurrentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('wiki_ref_info')
                        .setLabel(`${referencesCurrentPage + 1}/${referencesTotalPages}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('wiki_ref_next')
                        .setEmoji('▶️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(referencesCurrentPage === referencesTotalPages - 1),
                    new ButtonBuilder()
                        .setCustomId('wiki_ref_last')
                        .setEmoji('⏭️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(referencesCurrentPage === referencesTotalPages - 1)
                );
            } else {
                // Summary mode - no navigation needed
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('wiki_placeholder')
                        .setLabel('Summary View')
                        .setEmoji('📄')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true)
                );
            }

            let row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('wiki_home')
                        .setLabel('Home')
                        .setEmoji('🏠')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(mode === 'text'),
                    new ButtonBuilder()
                        .setCustomId('wiki_images')
                        .setLabel('Images')
                        .setEmoji('🖼️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(images.length === 0 || mode === 'images'),
                    new ButtonBuilder()
                        .setCustomId('wiki_references')
                        .setLabel('References')
                        .setEmoji('📚')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(references.length === 0 || mode === 'references'),
                    new ButtonBuilder()
                        .setCustomId('wiki_summary')
                        .setLabel('Summary')
                        .setEmoji('📄')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(mode === 'summary')
                );

            return [row, row2];
        };

        // Send initial response
        let message = await interaction.editReply({
            components: [generateContainer(currentPage, viewMode)],
            flags: MessageFlags.IsComponentsV2
        });

        // Button collector
        let collector = message.createMessageComponentCollector({
            filter: (componentInteraction) => {
                return componentInteraction.customId.startsWith('wiki_');
            },
            time: 300000 // 5 minutes
        });

        collector.on('collect', async (componentInteraction) => {
            try {

                // View mode switching buttons
                if (componentInteraction.customId === 'wiki_home' ||
                    componentInteraction.customId === 'wiki_images' ||
                    componentInteraction.customId === 'wiki_references' ||
                    componentInteraction.customId === 'wiki_summary') {
                    
                    await componentInteraction.deferUpdate();
                    
                    switch (componentInteraction.customId) {
                        case 'wiki_home':
                            viewMode = 'text';
                            break;
                        case 'wiki_images':
                            viewMode = 'images';
                            imageCurrentPage = 0;
                            break;
                        case 'wiki_references':
                            viewMode = 'references';
                            referencesCurrentPage = 0;
                            break;
                        case 'wiki_summary':
                            viewMode = 'summary';
                            break;
                    }

                    await message.edit({
                        components: [generateContainer(currentPage, viewMode)],
                        flags: MessageFlags.IsComponentsV2
                    });
                    return;
                }

                // Navigation buttons
                await componentInteraction.deferUpdate();

                if (viewMode === 'text') {
                    switch (componentInteraction.customId) {
                        case 'wiki_first':
                            currentPage = 0;
                            break;
                        case 'wiki_prev':
                            currentPage = Math.max(0, currentPage - 1);
                            break;
                        case 'wiki_next':
                            currentPage = Math.min(totalPages - 1, currentPage + 1);
                            break;
                        case 'wiki_last':
                            currentPage = totalPages - 1;
                            break;
                    }
                } else if (viewMode === 'images') {
                    switch (componentInteraction.customId) {
                        case 'wiki_img_first':
                            imageCurrentPage = 0;
                            break;
                        case 'wiki_img_prev':
                            imageCurrentPage = Math.max(0, imageCurrentPage - 1);
                            break;
                        case 'wiki_img_next':
                            imageCurrentPage = Math.min(imageTotalPages - 1, imageCurrentPage + 1);
                            break;
                        case 'wiki_img_last':
                            imageCurrentPage = imageTotalPages - 1;
                            break;
                    }
                } else if (viewMode === 'references') {
                    switch (componentInteraction.customId) {
                        case 'wiki_ref_first':
                            referencesCurrentPage = 0;
                            break;
                        case 'wiki_ref_prev':
                            referencesCurrentPage = Math.max(0, referencesCurrentPage - 1);
                            break;
                        case 'wiki_ref_next':
                            referencesCurrentPage = Math.min(referencesTotalPages - 1, referencesCurrentPage + 1);
                            break;
                        case 'wiki_ref_last':
                            referencesCurrentPage = referencesTotalPages - 1;
                            break;
                    }
                }

                await message.edit({
                    components: [generateContainer(currentPage, viewMode)],
                    flags: MessageFlags.IsComponentsV2
                });

            } catch (error) {
                console.error('Component interaction error:', error);
                try {
                    if (!componentInteraction.replied && !componentInteraction.deferred) {
                        await componentInteraction.reply({ 
                            content: '❌ An error occurred while processing your request.', 
                            ephemeral: true 
                        });
                    }
                } catch (e) {
                    console.error('Error reply failed:', e);
                }
            }
        });

        

        collector.on('end', () => {
            try {
                // Create a disabled version of the container
                const disabledContainer = generateContainer(currentPage, viewMode);
                
                message.edit({ 
                    components: [disabledContainer],
                    flags: MessageFlags.IsComponentsV2
                }).catch((error) => {
                    console.error('Error disabling components after timeout:', error);
                });
            } catch (error) {
                console.error('Collector end error:', error);
            }
        });

    } catch (error) {
        console.error('Wikipedia search error:', error);
        
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`❌ **Search Error**\n\nAn error occurred while searching for **"${query}"** on Wikipedia.\n\n` +
                               `🔧 **Error Details**\nLanguage: ${language}\nError: ${error.message || 'Unknown error'}\n\n` +
                               `💡 **What to try**\n• Try searching in English\n• Use different search terms\n• Check your spelling\n• Try again in a few moments`)
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}
