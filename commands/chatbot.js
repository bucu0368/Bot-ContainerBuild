
const { SlashCommandBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Helper function to get colors from config
function getEmbedColor(client) {
    return client.config?.EmbedColor || '#0099ff';
}

function getErrorColor(client) {
    return client.config?.ErrorColor || '#ff0000';
}

const GROQ_API_KEY = 'apikey here';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chatbot')
        .setDescription('Chat with AI using Groq API')
        .addStringOption(option =>
            option
                .setName('prompt')
                .setDescription('Your message to the AI')
                .setRequired(true)),

    async execute(interaction) {
        const prompt = interaction.options.getString('prompt');

        await interaction.deferReply();

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'openai/gpt-oss-20b',
                    messages: [{
                        role: 'user',
                        content: prompt
                    }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0]?.message?.content || 'No response generated.';

            const { editReplyV2 } = require('../utils/sendV2');
            
            // Split response if it's too long for Discord embed field limit
            const maxLength = 1024;
            const chunks = [];
            
            if (aiResponse.length <= maxLength) {
                chunks.push(aiResponse);
            } else {
                for (let i = 0; i < aiResponse.length; i += maxLength) {
                    chunks.push(aiResponse.substring(i, i + maxLength));
                }
            }

            const fields = [
                {
                    name: '❓ Your Question',
                    value: prompt.length > maxLength ? prompt.substring(0, maxLength - 3) + '...' : prompt,
                    inline: false
                }
            ];

            // Add response chunks as separate fields
            chunks.forEach((chunk, index) => {
                const fieldName = chunks.length > 1 ? `🤖 AI Response (Part ${index + 1})` : '🤖 AI Response';
                fields.push({
                    name: fieldName,
                    value: chunk,
                    inline: false
                });
            });

            const embedShape = {
                title: '🤖 AI Chatbot',
                color: getEmbedColor(interaction.client),
                fields: fields,
                footer: { 
                    text: `Requested by: ${interaction.user.username}`
                },
                timestamp: new Date()
            };

            await editReplyV2(interaction, { embed: embedShape });

        } catch (error) {
            console.error('Error with chatbot:', error);

            let errorMessage = 'Sorry, I couldn\'t process your request. Please try again later.';

            if (error.message.includes('401')) {
                errorMessage = 'API key is invalid or missing. Please check the GROQ_API_KEY.';
            } else if (error.message.includes('429')) {
                errorMessage = 'Rate limit exceeded. Please try again later.';
            } else if (error.message.includes('400')) {
                errorMessage = 'Invalid request. Please check your prompt and try again.';
            }

            const { editReplyV2 } = require('../utils/sendV2');
            
            const errorEmbed = {
                title: '❌ Chatbot Error',
                description: errorMessage,
                color: getErrorColor(interaction.client),
                timestamp: new Date()
            };

            await editReplyV2(interaction, { embed: errorEmbed });
        }
    },
};
