import express from 'express';
import { BotFrameworkAdapter, MemoryStorage, ConversationState, UserState, TurnContext } from 'botbuilder';
import { EnhancedPCPBot } from './enhancedBot';
import { initADOService } from './services/adoService';
import { initLLMService } from './services/llmService';
import { initDatabase } from '../database/db';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
app.use(express.json());
const port = process.env.PORT || 3978;

// Create adapter
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    channelAuthTenant: process.env.MicrosoftAppTenantId
});

// Error handler
adapter.onTurnError = async (context: TurnContext, error: Error) => {
    console.error(`\n [onTurnError] unhandled error: ${error}`);
    console.error(error.stack);

    try {
        await context.sendActivity('Sorry, the bot encountered an error. Please try again.');
    } catch (sendError) {
        console.error('Failed to send error message:', sendError);
    }
};

// Create conversation and user state
const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

// Initialize services
async function initializeServices() {
    try {
        // Initialize database
        await initDatabase();
        console.log('✅ Database initialized');

        // Initialize ADO service (if configured)
        if (process.env.ADO_ORGANIZATION && process.env.ADO_PROJECT && process.env.ADO_PAT) {
            initADOService({
                organization: process.env.ADO_ORGANIZATION,
                project: process.env.ADO_PROJECT,
                pat: process.env.ADO_PAT
            });
            console.log('✅ ADO service initialized');
        } else {
            console.log('⚠️  ADO service not configured (set ADO_ORGANIZATION, ADO_PROJECT, ADO_PAT in .env)');
        }

        // Initialize LLM service (if configured)
        if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
            initLLMService(
                process.env.AZURE_OPENAI_ENDPOINT,
                process.env.AZURE_OPENAI_API_KEY,
                process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4'
            );
            console.log('✅ LLM service initialized');
        } else {
            console.log('⚠️  LLM service not configured (set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY in .env)');
        }
    } catch (error) {
        console.error('Error initializing services:', error);
    }
}

// Create bot
const bot = new EnhancedPCPBot(conversationState, userState, adapter);

// Listen for incoming requests
app.post('/api/messages', async (req, res) => {
    await adapter.process(req, res, async (context) => {
        await bot.run(context);
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            ado: !!process.env.ADO_ORGANIZATION,
            llm: !!process.env.AZURE_OPENAI_ENDPOINT
        }
    });
});

// Start server
initializeServices().then(() => {
    app.listen(port, () => {
        console.log(`\n🤖 PCP Bot is running on port ${port}`);
        console.log(`📡 Connect Bot Framework Emulator to: http://localhost:${port}/api/messages`);
        console.log(`\n🔧 Configuration:`);
        console.log(`   ADO Integration: ${process.env.ADO_ORGANIZATION ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`   LLM Integration: ${process.env.AZURE_OPENAI_ENDPOINT ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`\n💡 Tip: Configure ADO and LLM in .env file for full features`);
    });
});
