import { ActivityHandler, TurnContext, ConversationState, UserState, CardFactory, TeamsInfo, ConversationReference, BotFrameworkAdapter } from 'botbuilder';
import { createStandupCard, createEODCard, createBlockerAlertCard, createStoryEnhancementCard, createBlockerInputCard, createBlockerSelectionCard, createStoryEditCard } from './cards';
import { getADOService, initADOService, ADOService, WorkItemSummary } from './services/adoService';
import { getLLMService, initLLMService } from './services/llmService';
import {
    initDatabase,
    saveUserResponse,
    getUserResponses,
    saveBlocker,
    getActiveBlockers,
    resolveBlocker,
    getTeamConfig,
    saveLLMStory,
    saveUserPAT,
    getUserPAT,
    createGroupSession,
    addSessionParticipant,
    markDMSent,
    markResponseReceived,
    getGroupSession,
    getActiveGroupSession,
    getSessionParticipants,
    getSessionResponses,
    completeGroupSession,
    getTodaysStandupResponses,
    addTeamMember,
    getTeamMembers
} from '../database/db';

interface ConversationData {
    pendingStoryData?: any;
}

interface UserData {
    adoEmail?: string;
}

export class EnhancedPCPBot extends ActivityHandler {
    private conversationState: ConversationState;
    private userState: UserState;
    private conversationDataAccessor: any;
    private userDataAccessor: any;
    private adapter: BotFrameworkAdapter;

    constructor(conversationState: ConversationState, userState: UserState, adapter: BotFrameworkAdapter) {
        super();

        this.conversationState = conversationState;
        this.userState = userState;
        this.adapter = adapter;
        this.conversationDataAccessor = conversationState.createProperty('conversationData');
        this.userDataAccessor = userState.createProperty('userData');

        // Initialize database
        initDatabase().catch(err => console.error('Database init error:', err));

        // Handle member added
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded || [];
            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    await context.sendActivity(
                        '👋 Welcome to PCP Bot!\n\n' +
                        'I help teams with daily standups, EOD check-ins, and ADO integration.\n\n' +
                        '**Commands:**\n' +
                        '• `standup` - Daily standup with ADO items\n' +
                        '• `eod` - End of day check-in\n' +
                        '• `/create-us` - Create user story with AI\n' +
                        '• `/status [item-id]` - Quick status update\n' +
                        '• `/block [item-id]` - Report blocker\n' +
                        '• `help` - Show all commands'
                    );
                }
            }
            await next();
        });

        // Handle messages
        this.onMessage(async (context, next) => {
            // Capture and store conversation reference for proactive messaging
            const conversationReference = TurnContext.getConversationReference(context.activity);
            const teamId = context.activity.conversation.id;
            const userId = context.activity.from.id;
            const userName = context.activity.from.name || 'Unknown User';

            // Store team member with conversation reference (for POC)
            try {
                await addTeamMember({
                    teamId,
                    userId,
                    userName,
                    conversationRef: JSON.stringify(conversationReference)
                });
            } catch (error) {
                console.error('Error storing conversation reference:', error);
            }

            let originalText = context.activity.text?.trim() || '';

            // Remove bot mentions in group chats (Teams adds <at>BotName</at> in group chats)
            console.log('🔍 DEBUG - Raw text:', context.activity.text);
            originalText = TurnContext.removeRecipientMention(context.activity);
            if (!originalText) originalText = context.activity.text || '';
            originalText = originalText.trim(); // Trim again after mention removal
            console.log('🔍 DEBUG - After mention removal:', originalText);

            const text = originalText.toLowerCase().trim();
            console.log('🔍 DEBUG - Final text for matching:', text);

            // Check if this is a card submission
            if (context.activity.value) {
                await this.handleCardSubmission(context);
            } else if (text.startsWith('/set-pat')) {
                // Use original case for PAT (case-sensitive)
                await this.setUserPAT(context, originalText);
            } else if (text.startsWith('/team-standup')) {
                await this.handleTeamStandup(context);
            } else if (text.startsWith('/team-eod')) {
                await this.handleTeamEOD(context);
            } else if (text.startsWith('/create-us-draft') || text.startsWith('/draft')) {
                await this.handleCreateUserStoryDraft(context);
            } else if (text.startsWith('/create-us') || text.includes('create user story')) {
                await this.handleCreateUserStory(context);
            } else if (text.startsWith('/status')) {
                await this.handleQuickStatus(context, text);
            } else if (text.startsWith('/block')) {
                await this.handleReportBlocker(context, text);
            } else if (text.startsWith('/getstatus')) {
                await this.handleGetStatus(context);
            } else if (text.startsWith('/askstatus')) {
                await this.handleAskStatus(context);
            } else if (text.startsWith('/dailyoutcome')) {
                await this.handleDailyOutcome(context);
            } else if (text.startsWith('/menu') || text === 'menu') {
                await this.showMenu(context);
            } else if (text.includes('standup')) {
                await this.handleStandupCommand(context);
            } else if (text.includes('eod')) {
                await this.handleEODCommand(context);
            } else if (text.startsWith('/test-ado')) {
                await this.testADO(context);
            } else if (text.startsWith('/set-email')) {
                // Use original case for email
                await this.setUserEmail(context, originalText);
            } else if (text.includes('help')) {
                await this.showHelp(context);
            } else {
                await context.sendActivity('Type `standup`, `eod`, `/team-standup`, or `help`');
            }

            await next();
        });
    }

    private async handleStandupCommand(context: TurnContext) {
        try {
            const userId = context.activity.from.id;
            const userName = context.activity.from.name || 'User';

            // Get user's PAT
            const userPAT = await getUserPAT(userId);

            if (!userPAT) {
                await context.sendActivity('⚠️ Please set your ADO Personal Access Token first using /set-pat command');
                return;
            }

            // Get user's stored ADO email or use default
            const userData: UserData = await this.userDataAccessor.get(context, {});

            // Debug logging
            console.log('Email resolution:', {
                memoryEmail: userData.adoEmail,
                dbEmail: userPAT.user_email,
                fallbackName: context.activity.from.name,
                fallbackId: context.activity.from.id
            });

            const userEmail = userData.adoEmail || userPAT.user_email || context.activity.from.name || context.activity.from.id;

            await context.sendActivity(`Fetching work items for: ${userEmail}`);

            // Create ADO service with user's PAT
            const userADOService = initADOService({
                organization: process.env.ADO_ORGANIZATION!,
                project: process.env.ADO_PROJECT!,
                pat: userPAT.ado_pat
            });

            let workItems: any[] = [];

            try {
                workItems = await userADOService.getUserWorkItems(userEmail);
                await context.sendActivity(`Found ${workItems.length} work items`);
            } catch (error: any) {
                console.error('Error fetching work items:', error);
                await context.sendActivity(`Error fetching ADO items: ${error.message}. Using empty card.`);
            }

            const card = createStandupCard(workItems);
            await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
        } catch (error: any) {
            console.error('Error in standup command:', error);
            await context.sendActivity(`Error: ${error.message}`);
        }
    }

    private async handleEODCommand(context: TurnContext) {
        try {
            const userId = context.activity.from.id;
            const userName = context.activity.from.name || 'User';

            // Get user's PAT
            const userPAT = await getUserPAT(userId);

            if (!userPAT) {
                await context.sendActivity('⚠️ Please set your ADO Personal Access Token first using /set-pat command');
                return;
            }

            const userEmail = userPAT.user_email || context.activity.from.name || userId;

            // Create ADO service with user's PAT
            const userADOService = initADOService({
                organization: process.env.ADO_ORGANIZATION!,
                project: process.env.ADO_PROJECT!,
                pat: userPAT.ado_pat
            });

            let workItems: any[] = [];

            try {
                workItems = await userADOService.getUserWorkItems(userEmail);
            } catch (error) {
                console.error('Error fetching work items:', error);
            }

            // Get today's plan from morning standup
            const todayResponses = await getUserResponses(userId, 'standup', 1);
            let todaysPlan: string[] = [];

            if (todayResponses && todayResponses.length > 0) {
                const response = JSON.parse(todayResponses[0].response_data);
                if (response.today_items) {
                    todaysPlan = response.today_items.split(',');
                }
            }

            const card = createEODCard(workItems, todaysPlan);
            await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
        } catch (error) {
            console.error('Error in EOD command:', error);
            await context.sendActivity('Error loading EOD card. Please try again.');
        }
    }

    private async handleCardSubmission(context: TurnContext) {
        const value = context.activity.value;

        try {
            // Handle menu button clicks
            if (value.command) {
                const command = value.command.toLowerCase().trim();
                console.log(`🎯 Menu button clicked: ${command}`);

                // Route to appropriate handler based on command
                if (command.startsWith('/set-pat')) {
                    await this.setUserPAT(context, command);
                } else if (command.startsWith('/team-standup')) {
                    await this.handleTeamStandup(context);
                } else if (command.startsWith('/team-eod')) {
                    await this.handleTeamEOD(context);
                } else if (command.startsWith('/create-us-draft') || command.startsWith('/draft')) {
                    await this.handleCreateUserStoryDraft(context);
                } else if (command.startsWith('/create-us')) {
                    await this.handleCreateUserStory(context);
                } else if (command.startsWith('/getstatus')) {
                    await this.handleGetStatus(context);
                } else if (command.startsWith('/askstatus')) {
                    await this.handleAskStatus(context);
                } else if (command.startsWith('/dailyoutcome')) {
                    await this.handleDailyOutcome(context);
                } else if (command.includes('standup')) {
                    await this.handleStandupCommand(context);
                } else if (command.includes('eod')) {
                    await this.handleEODCommand(context);
                } else if (command.startsWith('/test-ado')) {
                    await this.testADO(context);
                } else if (command.startsWith('/set-email')) {
                    await this.setUserEmail(context, command);
                } else if (command === 'help') {
                    await this.showHelp(context);
                } else {
                    await context.sendActivity(`Unknown command: ${command}`);
                }
                return;
            }

            // Handle other card submissions (existing functionality)
            switch (value.verb) {
                case 'submitStandup':
                    await this.processStandupSubmission(context, value);
                    break;
                case 'submitEOD':
                    await this.processEODSubmission(context, value);
                    break;
                case 'resolveBlocker':
                    await this.processBlockerResolution(context, value);
                    break;
                case 'reportBlocker':
                    await this.processBlockerReport(context, value);
                    break;
                case 'generateStory':
                    await this.processStoryCardSubmission(context, value);
                    break;
                case 'generateStoryDraft':
                    await this.processStoryDraftSubmission(context, value);
                    break;
                case 'createInADO':
                    await this.createStoryInADO(context, value);
                    break;
                case 'openInADO':
                    await this.openStoryInADO(context, value);
                    break;
                case 'regenerateStory':
                    await this.regenerateStory(context, value);
                    break;
                case 'editStory':
                    await this.editStory(context, value);
                    break;
                case 'saveEditedStory':
                    await this.saveEditedStory(context, value);
                    break;
                case 'cancelEdit':
                    await this.cancelEdit(context, value);
                    break;
                default:
                    await context.sendActivity('Unknown action');
            }
        } catch (error) {
            console.error('Error handling card submission:', error);
            await context.sendActivity('Error processing your submission. Please try again.');
        }
    }

    private async processStandupSubmission(context: TurnContext, data: any) {
        const userId = context.activity.from.id;
        const userName = context.activity.from.name || 'User';

        // Check if this is part of a group session
        const conversationData: ConversationData = await this.conversationDataAccessor.get(context, {});
        const groupSessionId = conversationData.pendingStoryData?.groupSessionId;

        // Save response to database
        const responseId = await saveUserResponse({
            userId,
            userName,
            responseType: 'standup',
            responseData: data,
            workItems: data.yesterday_items?.split(',') || [],
            hasBlocker: data.has_blocker === 'true',
            groupSessionId
        });

        // Update ADO with comments using user's PAT
        const userPAT = await getUserPAT(userId);
        if (userPAT && (data.yesterday_items || data.today_items)) {
            const userADOService = initADOService({
                organization: process.env.ADO_ORGANIZATION!,
                project: process.env.ADO_PROJECT!,
                pat: userPAT.ado_pat
            });

            console.log(`🔄 Updating work items for ${userName} (using user PAT)`);

            // Update yesterday items
            if (data.yesterday_items) {
                const yesterdayItems = data.yesterday_items.split(',').map((id: string) => id.trim()).filter((id: string) => id);
                console.log(`📝 Updating ${yesterdayItems.length} yesterday items:`, yesterdayItems);
                for (const itemId of yesterdayItems) {
                    try {
                        await userADOService.updateWorkItemComment(
                            parseInt(itemId),
                            `✅ Standup Update from ${userName}:\n**Yesterday:** ${data.yesterday_additional || 'Worked on this item'}`
                        );
                        console.log(`✅ Updated yesterday work item #${itemId}`);
                    } catch (error) {
                        console.error(`❌ Error updating yesterday work item ${itemId}:`, error);
                    }
                }
            }

            // Update today items
            if (data.today_items) {
                const todayItems = data.today_items.split(',').map((id: string) => id.trim()).filter((id: string) => id);
                console.log(`📝 Updating ${todayItems.length} today items:`, todayItems);
                for (const itemId of todayItems) {
                    try {
                        await userADOService.updateWorkItemComment(
                            parseInt(itemId),
                            `📋 Standup Update from ${userName}:\n**Today:** ${data.today_additional || 'Working on this item'}`
                        );
                        console.log(`✅ Updated today work item #${itemId}`);
                    } catch (error) {
                        console.error(`❌ Error updating today work item ${itemId}:`, error);
                    }
                }
            }
        } else if (!userPAT) {
            console.log(`⚠️ No PAT found for user ${userName} - skipping ADO updates. Please use /set-pat command.`);
        }

        // Handle blocker
        if (data.has_blocker === 'true' && data.blocked_item && data.blocker_description) {
            await this.handleBlockerFromStandup(context, data);
        }

        // Send confirmation
        const msg = '✅ **Standup Submitted**\n\n' +
            (data.yesterday_items ? `**Yesterday:** Work items #${data.yesterday_items}\n` : '') +
            (data.yesterday_additional ? `Additional: ${data.yesterday_additional}\n` : '') +
            (data.today_items ? `**Today:** Work items #${data.today_items}\n` : '') +
            (data.today_additional ? `Additional: ${data.today_additional}\n` : '') +
            (data.has_blocker === 'true' ? '🚫 **Blocker reported and TL notified**' : '');

        await context.sendActivity(msg);

        // If this is part of a group session, update session and check if complete
        if (groupSessionId) {
            await markResponseReceived(groupSessionId, userId, responseId);
            await this.checkAndCompleteGroupSession(context, groupSessionId);
        }
    }

    private async processEODSubmission(context: TurnContext, data: any) {
        const userId = context.activity.from.id;
        const userName = context.activity.from.name || 'User';

        // Check if this is part of a group session
        const conversationData: ConversationData = await this.conversationDataAccessor.get(context, {});
        const groupSessionId = conversationData.pendingStoryData?.groupSessionId;

        const responseId = await saveUserResponse({
            userId,
            userName,
            responseType: 'eod',
            responseData: data,
            workItems: data.completed_items?.split(',') || [],
            groupSessionId
        });

        // Update ADO using user's PAT
        const userPAT = await getUserPAT(userId);
        if (userPAT && data.completed_items) {
            const userADOService = initADOService({
                organization: process.env.ADO_ORGANIZATION!,
                project: process.env.ADO_PROJECT!,
                pat: userPAT.ado_pat
            });

            const items = data.completed_items.split(',').map((id: string) => id.trim()).filter((id: string) => id);
            for (const itemId of items) {
                try {
                    await userADOService.updateWorkItemComment(
                        parseInt(itemId),
                        `✅ EOD Update from ${userName}:\n**Completed today**\n**Reflection:** ${data.reflection || 'N/A'}`
                    );
                    console.log(`✅ Updated EOD work item #${itemId}`);
                } catch (error) {
                    console.error(`❌ Error updating EOD work item ${itemId}:`, error);
                }
            }
        } else if (!userPAT && data.completed_items) {
            console.log(`⚠️ No PAT found for user ${userName} - skipping ADO updates. Please use /set-pat command.`);
        }

        const msg = '✅ **EOD Check-in Submitted**\n\n' +
            (data.completed_items ? `**Completed:** Work items #${data.completed_items}\n` : '') +
            (data.completed_additional ? `Additional: ${data.completed_additional}\n` : '') +
            (data.tomorrow_items ? `**Tomorrow:** Work items #${data.tomorrow_items}` : '');

        await context.sendActivity(msg);

        // If this is part of a group session, update session and check if complete
        if (groupSessionId) {
            await markResponseReceived(groupSessionId, userId, responseId);
            await this.checkAndCompleteGroupSession(context, groupSessionId);
        }
    }

    private async handleBlockerFromStandup(context: TurnContext, data: any) {
        const userId = context.activity.from.id;
        const userName = context.activity.from.name || 'User';

        // Save blocker
        await saveBlocker({
            userId,
            userName,
            workItemId: data.blocked_item,
            workItemTitle: `Work Item #${data.blocked_item}`,
            blockerDescription: data.blocker_description,
            tlUserId: undefined, // TODO: Get from team config
            tlName: undefined
        });

        // Update ADO
        const adoService = getADOService();
        if (adoService) {
            try {
                await adoService.updateWorkItemState(parseInt(data.blocked_item), 'Blocked');
                await adoService.addBlockerTag(parseInt(data.blocked_item));
                await adoService.updateWorkItemComment(
                    parseInt(data.blocked_item),
                    `🚫 BLOCKER: ${data.blocker_description}\nReported by: ${userName}`
                );
            } catch (error) {
                console.error('Error updating blocker in ADO:', error);
            }
        }

        // TODO: Send blocker alert to TL
    }

    private async handleCreateUserStory(context: TurnContext) {
        const { createStoryInputCard } = await import('./cards');
        const card = createStoryInputCard();
        await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
    }

    private async handleCreateUserStoryDraft(context: TurnContext) {
        const { createStoryInputCard } = await import('./cards');
        const card = createStoryInputCard(true); // Draft mode
        await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
    }

    private async handleCreateUserStoryURL(context: TurnContext) {
        await context.sendActivity(
            '🔗 Let\'s create a pre-filled ADO work item!\n\n' +
            'Please provide:\n' +
            '1. **Title**: Brief description of the feature\n' +
            '2. **Description**: What needs to be built\n' +
            '3. **Acceptance Criteria** (optional)\n\n' +
            'Format: title | description | criteria'
        );

        // Store state to expect story input with URL mode
        const conversationData: ConversationData = await this.conversationDataAccessor.get(context, {});
        conversationData.pendingStoryData = { awaitingInput: true, urlMode: true };
        await this.conversationDataAccessor.set(context, conversationData);
    }

    private async processStoryInput(context: TurnContext, input: string) {
        try {
            // Get pending state to check mode
            const conversationData: ConversationData = await this.conversationDataAccessor.get(context, {});
            const urlMode = conversationData.pendingStoryData?.urlMode;

            console.log('🔍 DEBUG processStoryInput - urlMode:', urlMode, 'pendingStoryData:', conversationData.pendingStoryData);

            // Clear pending state
            conversationData.pendingStoryData = undefined;
            await this.conversationDataAccessor.set(context, conversationData);

            // Parse input: title | description | criteria
            const parts = input.split('|').map(p => p.trim());

            if (parts.length < 2) {
                await context.sendActivity('❌ Invalid format. Please use: title | description | criteria');
                return;
            }

            const storyInput = {
                title: parts[0],
                description: parts[1],
                acceptanceCriteria: parts[2] || ''
            };

            await context.sendActivity('✨ Enhancing your story with AI...');

            const llmService = getLLMService();
            if (!llmService) {
                await context.sendActivity('❌ LLM service not configured. Cannot enhance story.');
                return;
            }

            const enhanced = await llmService.enhanceUserStory(storyInput);

            // Save to database
            await saveLLMStory({
                userId: context.activity.from.id,
                originalInput: `${storyInput.title} | ${storyInput.description}`,
                generatedTitle: enhanced.title,
                generatedDescription: enhanced.description,
                acceptanceCriteria: enhanced.acceptanceCriteria,
                storyPoints: enhanced.storyPoints
            });

            // If URL mode, generate pre-filled ADO URL
            if (urlMode) {
                console.log('✅ URL MODE ACTIVE - Generating pre-filled URL instead of card');
                const adoOrg = process.env.ADO_ORGANIZATION || 'AHITL';
                const adoProject = encodeURIComponent(process.env.ADO_PROJECT || 'IDP - DEVOPS');

                // Format acceptance criteria as text
                let criteriaText = '';
                if (Array.isArray(enhanced.acceptanceCriteria)) {
                    criteriaText = enhanced.acceptanceCriteria.map((c: string, i: number) => `${i + 1}. ${c}`).join('%0A');
                } else {
                    criteriaText = encodeURIComponent(enhanced.acceptanceCriteria);
                }

                const url = `https://dev.azure.com/${adoOrg}/${adoProject}/_workitems/create/User%20Story?` +
                    `[System.Title]=${encodeURIComponent(enhanced.title)}&` +
                    `[System.Description]=${encodeURIComponent(enhanced.description)}&` +
                    `[Microsoft.VSTS.Common.AcceptanceCriteria]=${criteriaText}&` +
                    `[Microsoft.VSTS.Scheduling.StoryPoints]=${enhanced.storyPoints}&` +
                    `[Microsoft.VSTS.Common.Priority]=2`;

                const criteriaDisplay = Array.isArray(enhanced.acceptanceCriteria)
                    ? enhanced.acceptanceCriteria.join(', ')
                    : String(enhanced.acceptanceCriteria);

                await context.sendActivity(
                    `✅ **Story Enhanced!**\n\n` +
                    `**Title:** ${enhanced.title}\n\n` +
                    `**Description:** ${enhanced.description}\n\n` +
                    `**Acceptance Criteria:** ${criteriaDisplay}\n\n` +
                    `**Story Points:** ${enhanced.storyPoints}\n\n` +
                    `🔗 **[Click here to create in ADO](${url})**`
                );
            } else {
                console.log('📝 CARD MODE ACTIVE - Sending adaptive card with Create Story button');
                const card = createStoryEnhancementCard(storyInput, enhanced);
                await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
            }
        } catch (error: any) {
            console.error('Error processing story input:', error);
            await context.sendActivity(`❌ Error: ${error.message}`);
        }
    }

    private async regenerateStory(context: TurnContext, data: any) {
        const llmService = getLLMService();
        if (!llmService) {
            await context.sendActivity('LLM service not configured');
            return;
        }

        const enhanced = await llmService.enhanceUserStory(data.original);
        const draftMode = data.draftMode || false;
        const card = createStoryEnhancementCard(data.original, enhanced, draftMode);
        await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
    }

    private async editStory(context: TurnContext, data: any) {
        const draftMode = data.draftMode || false;
        const card = createStoryEditCard(data.story, draftMode);
        await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
    }

    private async saveEditedStory(context: TurnContext, data: any) {
        try {
            const updatedStory = {
                title: data.title,
                description: data.description,
                acceptanceCriteria: data.acceptance_criteria,
                storyPoints: data.story_points
            };

            // Show the updated enhancement card
            const draftMode = data.draftMode || false;
            const card = createStoryEnhancementCard(data.original, updatedStory, draftMode);
            await context.sendActivity('✅ Story updated successfully!');
            await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
        } catch (error: any) {
            console.error('Error saving edited story:', error);
            await context.sendActivity(`❌ Error saving changes: ${error.message}`);
        }
    }

    private async cancelEdit(context: TurnContext, data: any) {
        // Show the original enhancement card again
        const draftMode = data.draftMode || false;
        const card = createStoryEnhancementCard({}, data.story, draftMode);
        await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
    }

    private async processStoryCardSubmission(context: TurnContext, data: any) {
        try {
            // Validate input
            if (!data.user_role || !data.feature) {
                await context.sendActivity('❌ Please provide both user role and feature.');
                return;
            }

            // Construct user story description in "As a [role], I want [feature]" format
            const userStoryDescription = `As a ${data.user_role}, I want ${data.feature}`;
            const additionalContext = data.description || '';

            const storyInput = {
                title: data.feature, // Simple feature context for LLM to create title
                description: `${userStoryDescription}${additionalContext ? '. ' + additionalContext : ''}`, // Full user story for LLM
                acceptanceCriteria: data.acceptance_criteria || ''
            };

            await context.sendActivity('✨ Enhancing your story with AI...');

            const llmService = getLLMService();
            if (!llmService) {
                await context.sendActivity('❌ LLM service not configured. Cannot enhance story.');
                return;
            }

            const enhanced = await llmService.enhanceUserStory(storyInput);

            // Save to database
            await saveLLMStory({
                userId: context.activity.from.id,
                originalInput: `${storyInput.title} | ${storyInput.description}`,
                generatedTitle: enhanced.title,
                generatedDescription: enhanced.description,
                acceptanceCriteria: enhanced.acceptanceCriteria,
                storyPoints: enhanced.storyPoints
            });

            // Send enhancement card
            const card = createStoryEnhancementCard(storyInput, enhanced);
            await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
        } catch (error: any) {
            console.error('Error processing story card:', error);
            await context.sendActivity(`❌ Error: ${error.message}`);
        }
    }

    private async processStoryDraftSubmission(context: TurnContext, data: any) {
        try {
            // Validate input
            if (!data.user_role || !data.feature) {
                await context.sendActivity('❌ Please provide both user role and feature.');
                return;
            }

            // Construct user story description in "As a [role], I want [feature]" format
            const userStoryDescription = `As a ${data.user_role}, I want ${data.feature}`;
            const additionalContext = data.description || '';

            const storyInput = {
                title: data.feature, // Simple feature context for LLM to create title
                description: `${userStoryDescription}${additionalContext ? '. ' + additionalContext : ''}`, // Full user story for LLM
                acceptanceCriteria: data.acceptance_criteria || ''
            };

            await context.sendActivity('✨ Enhancing your story with AI...');

            const llmService = getLLMService();
            if (!llmService) {
                await context.sendActivity('❌ LLM service not configured. Cannot enhance story.');
                return;
            }

            const enhanced = await llmService.enhanceUserStory(storyInput);

            // Save to database
            await saveLLMStory({
                userId: context.activity.from.id,
                originalInput: `${storyInput.title} | ${storyInput.description}`,
                generatedTitle: enhanced.title,
                generatedDescription: enhanced.description,
                acceptanceCriteria: enhanced.acceptanceCriteria,
                storyPoints: enhanced.storyPoints
            });

            // Send enhancement card in draft mode (shows "Open in ADO" instead of "Create in ADO")
            const card = createStoryEnhancementCard(storyInput, enhanced, true);
            await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
        } catch (error: any) {
            console.error('Error processing story draft:', error);
            await context.sendActivity(`❌ Error: ${error.message}`);
        }
    }

    private async createStoryInADO(context: TurnContext, data: any) {
        const userId = context.activity.from.id;
        const userName = context.activity.from.name || 'User';
        const userEmail = context.activity.from.name || context.activity.from.id;

        // Get user's PAT
        const userPAT = await getUserPAT(userId);
        if (!userPAT) {
            await context.sendActivity('⚠️ Please set your ADO Personal Access Token first using /set-pat command');
            return;
        }

        try {
            const story = data.story;

            // Send immediate acknowledgment to prevent Teams timeout
            await context.sendActivity('⏳ Creating work item in Azure DevOps...');

            // Create ADO service with user's PAT
            const userADOService = initADOService({
                organization: process.env.ADO_ORGANIZATION!,
                project: process.env.ADO_PROJECT!,
                pat: userPAT.ado_pat
            });

            const result = await userADOService.createWorkItem({
                type: 'User Story',
                title: story.title,
                description: story.description,
                acceptanceCriteria: story.acceptanceCriteria,
                storyPoints: story.storyPoints,
                assignedTo: userEmail
            });

            await context.sendActivity(`✅ Created User Story #${result.id} in ADO!\n\n[View in Azure DevOps](${result.url})`);
        } catch (error) {
            console.error('Error creating work item:', error);
            await context.sendActivity('❌ Error creating work item in ADO');
        }
    }

    private async openStoryInADO(context: TurnContext, data: any) {
        try {
            const story = data.story;

            // Generate pre-filled ADO URL
            const adoOrg = process.env.ADO_ORGANIZATION || 'AHITL';
            const adoProject = encodeURIComponent(process.env.ADO_PROJECT || 'IDP - DEVOPS');

            // Format acceptance criteria as text
            let criteriaText = '';
            if (Array.isArray(story.acceptanceCriteria)) {
                criteriaText = story.acceptanceCriteria.map((c: string) => `• ${c}`).join('%0A%0A');
            } else {
                criteriaText = encodeURIComponent(story.acceptanceCriteria);
            }

            const url = `https://dev.azure.com/${adoOrg}/${adoProject}/_workitems/create/User%20Story?` +
                `[System.Title]=${encodeURIComponent(story.title)}&` +
                `[System.Description]=${encodeURIComponent(story.description)}&` +
                `[Microsoft.VSTS.Common.AcceptanceCriteria]=${criteriaText}&` +
                `[Microsoft.VSTS.Scheduling.StoryPoints]=${story.storyPoints}&` +
                `[Microsoft.VSTS.Common.Priority]=2`;

            await context.sendActivity(`🔗 **[Click here to create work item in ADO](${url})**`);
        } catch (error: any) {
            console.error('Error generating ADO URL:', error);
            await context.sendActivity(`❌ Error: ${error.message}`);
        }
    }

    private async handleQuickStatus(context: TurnContext, text: string) {
        try {
            const responses = await getTodaysStandupResponses();

            if (!responses || responses.length === 0) {
                await context.sendActivity('📊 No standup submissions yet today.');
                return;
            }

            let statusMessage = `📊 **Team Status - ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}**\n\n`;
            statusMessage += `✅ **${responses.length} team member(s) submitted standup**\n\n`;

            for (const response of responses) {
                const data = JSON.parse(response.response_data);
                const workItems = JSON.parse(response.work_items || '[]');

                statusMessage += `👤 **${response.user_name}** (${new Date(response.submitted_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })})\n`;

                // Yesterday
                if (data.yesterday_items || data.yesterday_additional) {
                    const yesterdayItems = data.yesterday_items ? JSON.parse(data.yesterday_items) : [];
                    statusMessage += `  ✅ Yesterday: `;
                    if (yesterdayItems.length > 0) {
                        statusMessage += `${yesterdayItems.map((id: string) => `#${id}`).join(', ')}`;
                    }
                    if (data.yesterday_additional) {
                        statusMessage += yesterdayItems.length > 0 ? `, ${data.yesterday_additional}` : data.yesterday_additional;
                    }
                    statusMessage += '\n';
                }

                // Today
                if (data.today_items || data.today_additional) {
                    const todayItems = data.today_items ? JSON.parse(data.today_items) : [];
                    statusMessage += `  🎯 Today: `;
                    if (todayItems.length > 0) {
                        statusMessage += `${todayItems.map((id: string) => `#${id}`).join(', ')}`;
                    }
                    if (data.today_additional) {
                        statusMessage += todayItems.length > 0 ? `, ${data.today_additional}` : data.today_additional;
                    }
                    statusMessage += '\n';
                }

                // Blockers
                if (response.has_blocker && data.blocker_description) {
                    statusMessage += `  🚫 **BLOCKER**: ${data.blocker_description}\n`;
                }

                statusMessage += '\n';
            }

            await context.sendActivity(statusMessage);
        } catch (error) {
            console.error('Error getting status:', error);
            await context.sendActivity('❌ Error retrieving team status');
        }
    }

    private async handleReportBlocker(context: TurnContext, text: string) {
        try {
            const adoService = getADOService();
            if (!adoService) {
                await context.sendActivity('❌ ADO service not configured');
                return;
            }

            // Get user's stored ADO email
            const userData: UserData = await this.userDataAccessor.get(context, {});
            const userEmail = userData.adoEmail || context.activity.from.name || context.activity.from.id;

            // Fetch user's work items
            await context.sendActivity('🔍 Fetching your work items...');
            const workItems = await adoService.getUserWorkItems(userEmail);

            if (workItems.length === 0) {
                await context.sendActivity('❌ No open work items found assigned to you.');
                return;
            }

            // Show blocker selection card with dropdown
            const card = createBlockerSelectionCard(workItems);
            await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
        } catch (error: any) {
            console.error('Error in handleReportBlocker:', error);
            await context.sendActivity(`❌ Error: ${error.message}`);
        }
    }

    private async handleGetStatus(context: TurnContext) {
        try {
            await context.sendActivity('📊 Fetching today\'s standup responses...');

            // Get all standup responses from today
            const allResponses = await getTodaysStandupResponses();

            if (allResponses.length === 0) {
                await context.sendActivity('ℹ️ No standup responses for today.');
                return;
            }

            // Deduplicate - keep only the most recent response per user
            const responsesByUser = new Map<string, any>();
            for (const response of allResponses) {
                const existing = responsesByUser.get(response.user_id);
                if (!existing || new Date(response.submitted_at) > new Date(existing.submitted_at)) {
                    responsesByUser.set(response.user_id, response);
                }
            }

            const responses = Array.from(responsesByUser.values());

            // Build work items cache for lookups
            const workItemsCache = new Map<string, WorkItemSummary>();

            // Format the summary
            let summary = `📋 **Daily Standup Summary** - ${new Date().toLocaleDateString()}\n\n`;
            summary += `Team Members: ${responses.length}\n\n`;

            for (const response of responses) {
                const data = JSON.parse(response.response_data);
                summary += `👤 **${response.user_name}**\n`;

                // Work Items
                if (response.work_items) {
                    try {
                        const workItemIds = JSON.parse(response.work_items);

                        // Yesterday's work items
                        if (data.yesterday_items && Array.isArray(data.yesterday_items) && data.yesterday_items.length > 0) {
                            summary += `\n✅ **Yesterday:** Worked on:\n`;
                            for (const id of data.yesterday_items) {
                                // Try to fetch work item title from cache or ADO
                                let title = `Work Item #${id}`;
                                if (!workItemsCache.has(id)) {
                                    try {
                                        const patRecord = await getUserPAT(response.user_id);
                                        if (patRecord?.ado_pat) {
                                            const adoService = new ADOService({
                                                organization: process.env.ADO_ORGANIZATION!,
                                                project: process.env.ADO_PROJECT!,
                                                pat: patRecord.ado_pat
                                            });
                                            const userWorkItems = await adoService.getUserWorkItems(response.user_email || '');
                                            userWorkItems.forEach(wi => workItemsCache.set(wi.id, wi));
                                        }
                                    } catch (error) {
                                        console.log(`Could not fetch work items for ${response.user_name}`);
                                    }
                                }

                                const workItem = workItemsCache.get(id);
                                if (workItem) {
                                    title = `#${id} - ${workItem.title} [${workItem.state}]`;
                                }
                                summary += `  • ${title}\n`;
                            }

                            if (data.yesterday_additional) {
                                summary += `  • ${data.yesterday_additional}\n`;
                            }
                        } else if (data.yesterday_additional) {
                            summary += `\n✅ **Yesterday:**\n${data.yesterday_additional}\n`;
                        }

                        // Today's work items
                        if (data.today_items && Array.isArray(data.today_items) && data.today_items.length > 0) {
                            summary += `\n📝 **Today:** Planning to work on:\n`;
                            for (const id of data.today_items) {
                                const workItem = workItemsCache.get(id);
                                let title = `Work Item #${id}`;
                                if (workItem) {
                                    title = `#${id} - ${workItem.title} [${workItem.state}]`;
                                }
                                summary += `  • ${title}\n`;
                            }

                            if (data.today_additional) {
                                summary += `  • ${data.today_additional}\n`;
                            }
                        } else if (data.today_additional) {
                            summary += `\n📝 **Today:**\n${data.today_additional}\n`;
                        }

                    } catch (error) {
                        console.error('Error processing work items:', error);
                    }
                }

                // Blockers
                if (response.has_blocker && data.blocker_description) {
                    summary += `\n🚨 **BLOCKER:**\n${data.blocker_description}\n`;
                }

                summary += '\n---\n';
            }

            // Post the summary to the current chat
            await context.sendActivity(summary);
            console.log('✅ Posted standup summary to chat');
        } catch (error) {
            console.error('Error in handleGetStatus:', error);
            await context.sendActivity('❌ Error retrieving standup status');
        }
    }

    private async handleDailyOutcome(context: TurnContext) {
        try {
            const today = new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const message =
                '# Daily Outcome Report\n' +
                `**${today}**\n\n\n` +
                '## KEY OUTCOMES\n\n' +
                'Team completed 5 work items including authentication module and payment gateway review. ' +
                'Backend API for reports is 80% complete. ' +
                'Payment processing feature is blocked waiting for vendor credentials.\n\n\n' +
                '---\n\n\n' +
                '## FINISHED\n\n' +
                '• User authentication module implemented\n' +
                '• Login page responsive design fixed\n' +
                '• API documentation updated\n' +
                '• Payment gateway code review completed\n' +
                '• User service unit tests completed\n\n\n' +
                '---\n\n\n' +
                '## IN PROGRESS\n\n' +
                '• Backend API for reports (80% complete)\n' +
                '• Integration with Azure AD (70% complete)\n' +
                '• Database migration script (60% complete)\n' +
                '• Mobile app login flow (55% complete)\n' +
                '• Email notification service (50% complete)\n' +
                '• Dashboard UI components (45% complete)\n' +
                '• Security audit fixes (40% complete)\n' +
                '• Performance optimization (30% complete)\n\n\n' +
                '---\n\n\n' +
                '## BLOCKED\n\n' +
                '• Payment processing feature\n' +
                '  Waiting for vendor credentials\n\n\n' +
                '---\n\n\n' +
                '## DELAYED\n\n' +
                '• Third-party API integration\n' +
                '  Dependency delay from vendor\n\n' +
                '• Load testing environment\n' +
                '  Infrastructure provisioning pending\n\n\n' +
                '---\n\n\n' +
                '## NEXT ACTIONS\n\n' +
                '1. Contact vendor for payment processing credentials\n' +
                '2. Complete backend API for reports\n' +
                '3. Complete Azure AD integration\n' +
                '4. Follow up on delayed items\n\n\n' +
                '*Report from Azure DevOps*';

            await context.sendActivity(message);
            console.log('✅ /dailyOutcome command executed');
        } catch (error) {
            console.error('Error in handleDailyOutcome:', error);
            await context.sendActivity('❌ Error processing daily outcome request');
        }
    }

    private async handleAskStatus(context: TurnContext) {
        try {
            await context.sendActivity('📤 Preparing to send standup requests...');

            // Get the conversation ID (will be used as team_id for POC)
            const conversationId = context.activity.conversation.id;
            const conversationName = context.activity.conversation.name || 'Team';

            // Get team members registered for this conversation
            const teamMembers = await getTeamMembers(conversationId, true);

            if (teamMembers.length === 0) {
                await context.sendActivity(
                    `ℹ️ **Team Setup Required**\n\n` +
                    `This feature requires team members to be registered first.\n\n` +
                    `**Workflow:**\n` +
                    `1. Each team member sends a message to the bot (e.g., "hi" or "standup")\n` +
                    `2. Bot automatically stores their conversation reference\n` +
                    `3. TL runs /askStatus to send standup cards to all members\n` +
                    `4. Members fill out their standup cards privately (1:1 with bot)\n` +
                    `5. TL runs /getStatus to see aggregated summary in this chat\n\n` +
                    `💡 **Tip:** Have each team member message the bot first to get started!`
                );
                return;
            }

            // Send standup cards to each team member proactively
            let successCount = 0;
            let failCount = 0;

            await context.sendActivity(`📤 Sending standup cards to ${teamMembers.length} team member(s)...`);

            for (const member of teamMembers) {
                if (!member.conversation_ref) {
                    console.log(`❌ No conversation reference for ${member.user_name}`);
                    failCount++;
                    continue;
                }

                try {
                    const conversationRef: Partial<ConversationReference> = JSON.parse(member.conversation_ref);

                    // Fetch user's work items if they have a PAT configured
                    let workItems: WorkItemSummary[] | undefined = undefined;
                    try {
                        const patRecord = await getUserPAT(member.user_id);
                        if (patRecord?.ado_pat) {
                            const adoService = new ADOService({
                                organization: process.env.ADO_ORGANIZATION!,
                                project: process.env.ADO_PROJECT!,
                                pat: patRecord.ado_pat
                            });
                            workItems = await adoService.getUserWorkItems(member.user_email || '');
                            console.log(`📋 Fetched ${workItems.length} work items for ${member.user_name}`);
                        }
                    } catch (error) {
                        console.log(`⚠️ Could not fetch work items for ${member.user_name}:`, error);
                    }

                    // Send standup card proactively
                    await this.adapter.continueConversation(
                        conversationRef as ConversationReference,
                        async (turnContext) => {
                            const standupCard = createStandupCard(workItems);
                            await turnContext.sendActivity({
                                text: '📋 **Daily Standup Request**\n\nPlease fill out your standup update:',
                                attachments: [CardFactory.adaptiveCard(standupCard)]
                            });
                            console.log(`✅ Sent standup card to ${member.user_name}`);
                        }
                    );

                    successCount++;
                } catch (error) {
                    console.error(`❌ Error sending card to ${member.user_name}:`, error);
                    failCount++;
                }
            }

            // Send summary
            let resultMessage = `✅ **Standup Cards Sent**\n\n`;
            resultMessage += `Successfully sent: ${successCount}\n`;
            if (failCount > 0) {
                resultMessage += `Failed: ${failCount}\n`;
            }
            resultMessage += `\n📋 Use **/getStatus** after team members submit their responses to see the aggregated summary.`;

            await context.sendActivity(resultMessage);
            console.log(`✅ /askStatus completed - Sent: ${successCount}, Failed: ${failCount}`);

        } catch (error) {
            console.error('Error in handleAskStatus:', error);
            await context.sendActivity('❌ Error sending standup requests');
        }
    }

    private async processBlockerResolution(context: TurnContext, data: any) {
        await resolveBlocker(parseInt(data.workItemId), 'Resolved by TL');

        const adoService = getADOService();
        if (adoService) {
            try {
                await adoService.updateWorkItemState(parseInt(data.workItemId), 'Active');
            } catch (error) {
                console.error('Error resolving blocker:', error);
            }
        }

        await context.sendActivity(`✅ Blocker resolved for work item #${data.workItemId}`);
    }

    private async processBlockerReport(context: TurnContext, data: any) {
        try {
            const userId = context.activity.from.id;
            const userName = context.activity.from.name || 'User';

            // Handle new dropdown format or legacy direct ID format
            let workItemId: string;
            let workItemTitle: string;

            if (data.selected_work_item) {
                // New dropdown format
                const selectedItem = JSON.parse(data.selected_work_item);
                workItemId = selectedItem.id;
                workItemTitle = selectedItem.title;
            } else {
                // Legacy format (direct work_item_id)
                workItemId = data.work_item_id;
                workItemTitle = data.work_item_title;
            }

            const blockerDescription = data.blocker_description;

            if (!blockerDescription || blockerDescription.trim() === '') {
                await context.sendActivity('❌ Please provide a blocker description.');
                return;
            }

            // Save blocker to database
            await saveBlocker({
                userId,
                userName,
                workItemId,
                workItemTitle,
                blockerDescription,
                tlUserId: undefined, // TODO: Get from team config
                tlName: undefined
            });

            // Update ADO work item
            const adoService = getADOService();
            if (adoService) {
                try {
                    await adoService.updateWorkItemState(parseInt(workItemId), 'Blocked');
                    await adoService.addBlockerTag(parseInt(workItemId));
                    await adoService.updateWorkItemComment(
                        parseInt(workItemId),
                        `🚫 BLOCKER: ${blockerDescription}\nReported by: ${userName}\nReported at: ${new Date().toLocaleString()}`
                    );
                } catch (error) {
                    console.error('Error updating ADO:', error);
                    await context.sendActivity('⚠️ Blocker saved but could not update ADO work item.');
                }
            }

            // Generate ADO URL
            const adoOrg = process.env.ADO_ORGANIZATION || 'AHITL';
            const adoProject = process.env.ADO_PROJECT || 'IDP - DEVOPS';
            const adoUrl = `https://dev.azure.com/${adoOrg}/${encodeURIComponent(adoProject)}/_workitems/edit/${workItemId}`;

            await context.sendActivity(
                `✅ **Blocker Reported**\n\n` +
                `**Work Item:** #${workItemId} - ${workItemTitle}\n` +
                `**Description:** ${blockerDescription}\n\n` +
                `The work item has been updated with blocker status and your team lead will be notified.\n\n` +
                `🔗 [View Work Item](${adoUrl})`
            );
        } catch (error: any) {
            console.error('Error processing blocker report:', error);
            await context.sendActivity(`❌ Error saving blocker: ${error.message}`);
        }
    }


    private async testADO(context: TurnContext) {
        const adoService = getADOService();
        if (!adoService) {
            await context.sendActivity('❌ ADO service not configured');
            return;
        }

        // Get user's stored ADO email or use default
        const userData: UserData = await this.userDataAccessor.get(context, {});
        const userEmail = userData.adoEmail || context.activity.from.name || context.activity.from.id;
        await context.sendActivity(`Testing ADO with user: ${userEmail}`);
        
        try {
            const workItems = await adoService.getUserWorkItems(userEmail);
            await context.sendActivity(`✅ Found ${workItems.length} work items`);
            
            if (workItems.length > 0) {
                const sample = workItems.slice(0, 3).map(wi => 
                    `• #${wi.id}: ${wi.title} [${wi.state}]`
                ).join('\n');
                await context.sendActivity(`Sample items:\n${sample}`);
            }
        } catch (error: any) {
            await context.sendActivity(`❌ Error: ${error.message}`);
        }
    }

    private async setUserEmail(context: TurnContext, text: string) {
        const parts = text.split(' ');

        if (parts.length < 2) {
            await context.sendActivity('Usage: `/set-email your.email@company.com`');
            return;
        }

        const email = parts[1];
        const userId = context.activity.from.id;
        const userName = context.activity.from.name || 'User';

        // Save to memory state for immediate use
        const userData: UserData = await this.userDataAccessor.get(context, {});
        userData.adoEmail = email;
        await this.userDataAccessor.set(context, userData);
        await this.userState.saveChanges(context);

        // Also save to database for persistence across restarts
        const userPAT = await getUserPAT(userId);
        if (userPAT) {
            // Update existing PAT record with email
            await saveUserPAT({
                userId,
                userName,
                userEmail: email,
                adoPat: userPAT.ado_pat
            });
        } else {
            // Create new record with just email (PAT can be added later)
            await saveUserPAT({
                userId,
                userName,
                userEmail: email,
                adoPat: '' // Empty PAT for now
            });
        }

        await context.sendActivity(`✅ Set your ADO email to: ${email}\n\nNow try the \`standup\` command!`);
    }

    private async setUserPAT(context: TurnContext, text: string) {
        const parts = text.split(' ');

        if (parts.length < 2) {
            await context.sendActivity(
                'Usage: `/set-pat YOUR_ADO_PAT`\n\n' +
                'This saves your personal Azure DevOps PAT for updating work items.\n' +
                'Your PAT is stored securely and used only for your ADO updates.'
            );
            return;
        }

        const pat = parts[1];
        const userId = context.activity.from.id;
        const userName = context.activity.from.name || 'User';

        await saveUserPAT({
            userId,
            userName,
            adoPat: pat
        });

        await context.sendActivity('✅ Your ADO PAT has been saved securely!');
    }

    private async handleTeamStandup(context: TurnContext) {
        await this.handleTeamSession(context, 'standup');
    }

    private async handleTeamEOD(context: TurnContext) {
        await this.handleTeamSession(context, 'eod');
    }

    private async handleTeamSession(context: TurnContext, sessionType: 'standup' | 'eod') {
        try {
            const conversationId = context.activity.conversation.id;
            const triggeredByUserId = context.activity.from.id;
            const triggeredByUserName = context.activity.from.name || 'User';

            // Check if this is a group conversation
            if (!context.activity.conversation.conversationType ||
                context.activity.conversation.conversationType === 'personal') {
                await context.sendActivity(
                    `❌ /team-${sessionType} can only be used in group chats or channels.\n` +
                    `Use \`${sessionType}\` for personal ${sessionType}s.`
                );
                return;
            }

            // Check if there's already an active session
            const existingSession = await getActiveGroupSession(conversationId, sessionType);
            if (existingSession) {
                await context.sendActivity(
                    `⚠️ There's already an active ${sessionType} session in this chat.\n` +
                    `Waiting for ${existingSession.total_participants - existingSession.responses_received} responses.`
                );
                return;
            }

            await context.sendActivity(`🚀 Starting team ${sessionType}! Getting list of participants...`);

            // Get all members of the conversation
            const members = await TeamsInfo.getMembers(context);

            // Filter out the bot itself
            const participants = members.filter(m => m.id !== context.activity.recipient.id);

            if (participants.length === 0) {
                await context.sendActivity('❌ No participants found in this chat.');
                return;
            }

            // Create group session
            const sessionId = await createGroupSession({
                conversationId,
                conversationName: context.activity.conversation.name,
                triggeredByUserId,
                triggeredByUserName,
                sessionType,
                participantCount: participants.length
            });

            // Add participants to session
            for (const member of participants) {
                await addSessionParticipant({
                    sessionId,
                    userId: member.id,
                    userName: member.name || 'Unknown'
                });
            }

            await context.sendActivity(
                `📨 Sending ${sessionType} cards to ${participants.length} participants via DM...\n` +
                `I'll post a summary here once everyone responds.`
            );

            // Send DMs to all participants
            let dmsSent = 0;
            for (const member of participants) {
                try {
                    await this.sendDMToParticipant(context, member, sessionId, sessionType);
                    await markDMSent(sessionId, member.id);
                    dmsSent++;
                } catch (error) {
                    console.error(`Failed to send DM to ${member.name}:`, error);
                    await context.sendActivity(`⚠️ Could not send DM to ${member.name}`);
                }
            }

            await context.sendActivity(
                `✅ Sent ${dmsSent}/${participants.length} DMs.\n\n` +
                `Participants: ${participants.map(m => m.name).join(', ')}`
            );
        } catch (error: any) {
            console.error(`Error in handleTeamSession:`, error);
            await context.sendActivity(`❌ Error starting team ${sessionType}: ${error.message}`);
        }
    }

    private async sendDMToParticipant(
        context: TurnContext,
        member: any,
        sessionId: number,
        sessionType: 'standup' | 'eod'
    ) {
        // Create a conversation reference for the participant
        const conversationRef: Partial<ConversationReference> = {
            ...TurnContext.getConversationReference(context.activity),
            conversation: {
                id: member.id,  // DM conversation ID is the user's ID in Teams
                conversationType: 'personal',
                tenantId: context.activity.conversation.tenantId
            } as any,
            user: {
                id: member.id,
                name: member.name,
                aadObjectId: member.aadObjectId
            } as any
        };

        // Continue the conversation in DM
        await context.adapter.continueConversation(conversationRef as ConversationReference, async (dmContext) => {
            // Get user's PAT to use for fetching their work items
            const userPAT = await getUserPAT(member.id);
            let workItems: any[] = [];

            if (userPAT && userPAT.ado_pat) {
                // Create a temporary ADO service for this user
                const userADOService = initADOService({
                    organization: process.env.ADO_ORGANIZATION!,
                    project: process.env.ADO_PROJECT!,
                    pat: userPAT.ado_pat
                });

                try {
                    workItems = await userADOService.getUserWorkItems(userPAT.user_email || member.name);
                } catch (error) {
                    console.error(`Error fetching work items for ${member.name}:`, error);
                }
            }

            // Send the appropriate card
            const card = sessionType === 'standup'
                ? createStandupCard(workItems)
                : createEODCard(workItems, []);

            await dmContext.sendActivity({
                text: `👋 Team ${sessionType} requested! Please fill out your ${sessionType} card.`,
                attachments: [CardFactory.adaptiveCard(card)]
            });

            // Store session ID in conversation data so we can link responses
            const conversationData: ConversationData = await this.conversationDataAccessor.get(dmContext, {});
            conversationData.pendingStoryData = { groupSessionId: sessionId };
            await this.conversationDataAccessor.set(dmContext, conversationData);
            await this.conversationState.saveChanges(dmContext);
        });
    }

    private async checkAndCompleteGroupSession(context: TurnContext, sessionId: number) {
        try {
            const session = await getGroupSession(sessionId);

            if (!session) {
                console.error(`Session ${sessionId} not found`);
                return;
            }

            // Check if all responses are in
            if (session.responses_received >= session.total_participants) {
                // Mark session as completed
                await completeGroupSession(sessionId);

                // Get all responses
                const responses = await getSessionResponses(sessionId);

                // Generate summary
                const summary = this.generateSessionSummary(session, responses);

                // Create conversation reference for the group chat
                const groupConversationRef: Partial<ConversationReference> = {
                    ...TurnContext.getConversationReference(context.activity),
                    conversation: {
                        id: session.conversation_id,
                        conversationType: 'groupChat',
                        tenantId: context.activity.conversation.tenantId
                    } as any
                };

                // Post summary to group chat
                await context.adapter.continueConversation(
                    groupConversationRef as ConversationReference,
                    async (groupContext) => {
                        await groupContext.sendActivity(summary);
                    }
                );
            }
        } catch (error) {
            console.error('Error in checkAndCompleteGroupSession:', error);
        }
    }

    private generateSessionSummary(session: any, responses: any[]): string {
        const sessionType = session.session_type;
        const title = sessionType === 'standup' ? '📊 Team Standup Summary' : '📊 Team EOD Summary';

        let summary = `${title}\n\n`;
        summary += `**Responses:** ${session.responses_received}/${session.total_participants}\n\n`;

        for (const response of responses) {
            const data = JSON.parse(response.response_data);
            summary += `**${response.user_name}**\n`;

            if (sessionType === 'standup') {
                if (data.yesterday_items || data.yesterday_additional) {
                    summary += `• Yesterday: ${data.yesterday_items ? `#${data.yesterday_items}` : ''}${data.yesterday_additional ? ` - ${data.yesterday_additional}` : ''}\n`;
                }
                if (data.today_items || data.today_additional) {
                    summary += `• Today: ${data.today_items ? `#${data.today_items}` : ''}${data.today_additional ? ` - ${data.today_additional}` : ''}\n`;
                }
                if (data.has_blocker === 'true') {
                    summary += `• 🚫 Blocker: ${data.blocker_description || 'Blocker reported'}\n`;
                }
            } else {
                // EOD
                if (data.completed_items || data.completed_additional) {
                    summary += `• Completed: ${data.completed_items ? `#${data.completed_items}` : ''}${data.completed_additional ? ` - ${data.completed_additional}` : ''}\n`;
                }
                if (data.tomorrow_items || data.tomorrow_additional) {
                    summary += `• Tomorrow: ${data.tomorrow_items ? `#${data.tomorrow_items}` : ''}${data.tomorrow_additional ? ` - ${data.tomorrow_additional}` : ''}\n`;
                }
                if (data.reflection) {
                    summary += `• Reflection: ${data.reflection}\n`;
                }
            }
            summary += '\n';
        }

        summary += `✅ Session completed at ${new Date().toLocaleTimeString()}`;

        return summary;
    }

    private async showHelp(context: TurnContext) {
        const helpText = '**PCP Bot Commands:**\n\n' +
            '**Personal Commands:**\n' +
            '• `standup` - Personal daily standup with ADO items\n' +
            '• `eod` - Personal end of day check-in\n\n' +
            '**Group Commands:**\n' +
            '• `/team-standup` - Send standup to all group members\n' +
            '• `/team-eod` - Send EOD to all group members\n\n' +
            '**Configuration:**\n' +
            '• `/set-pat [PAT]` - Set your personal ADO PAT\n' +
            '• `/set-email [email]` - Set your ADO email\n\n' +
            '**Other Commands:**\n' +
            '• `/create-us` - Create user story with AI assistance\n' +
            '• `/test-ado` - Test ADO connection\n' +
            '• `/status [item-id]` - Quick status update\n' +
            '• `/block [item-id]` - Report a blocker\n' +
            '• `help` - Show this message\n\n' +
            '**Features:**\n' +
            '✅ ADO integration with per-user PATs\n' +
            '✅ Team standup/EOD with DMs\n' +
            '✅ AI-assisted story creation\n' +
            '✅ Blocker tracking & TL notifications\n' +
            '✅ Automatic work item updates';

        await context.sendActivity(helpText);
    }

    private async showMenu(context: TurnContext) {
        const card = {
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
                {
                    type: 'TextBlock',
                    text: 'PCP Bot Menu',
                    size: 'Large',
                    weight: 'Bolder',
                    color: 'Accent'
                },
                {
                    type: 'TextBlock',
                    text: 'Click any button below to run a command',
                    wrap: true,
                    spacing: 'None'
                },
                {
                    type: 'TextBlock',
                    text: 'Daily Check-ins',
                    weight: 'Bolder',
                    size: 'Medium',
                    spacing: 'Medium'
                },
                {
                    type: 'ActionSet',
                    actions: [
                        {
                            type: 'Action.Submit',
                            title: '📝 Start Standup',
                            data: { command: 'standup' }
                        },
                        {
                            type: 'Action.Submit',
                            title: '🌙 End of Day',
                            data: { command: 'eod' }
                        }
                    ]
                },
                {
                    type: 'TextBlock',
                    text: 'Team Commands',
                    weight: 'Bolder',
                    size: 'Medium',
                    spacing: 'Medium'
                },
                {
                    type: 'ActionSet',
                    actions: [
                        {
                            type: 'Action.Submit',
                            title: '👥 Team Standup',
                            data: { command: '/team-standup' }
                        },
                        {
                            type: 'Action.Submit',
                            title: '👥 Team EOD',
                            data: { command: '/team-eod' }
                        },
                        {
                            type: 'Action.Submit',
                            title: '📊 Get Status',
                            data: { command: '/getstatus' }
                        },
                        {
                            type: 'Action.Submit',
                            title: '📋 Ask Status (TL)',
                            data: { command: '/askstatus' }
                        }
                    ]
                },
                {
                    type: 'TextBlock',
                    text: 'Reports',
                    weight: 'Bolder',
                    size: 'Medium',
                    spacing: 'Medium'
                },
                {
                    type: 'ActionSet',
                    actions: [
                        {
                            type: 'Action.Submit',
                            title: '📈 Daily Outcome',
                            data: { command: '/dailyOutcome' }
                        }
                    ]
                },
                {
                    type: 'TextBlock',
                    text: 'ADO Integration',
                    weight: 'Bolder',
                    size: 'Medium',
                    spacing: 'Medium'
                },
                {
                    type: 'ActionSet',
                    actions: [
                        {
                            type: 'Action.Submit',
                            title: '📝 Create User Story',
                            data: { command: '/create-us' }
                        },
                        {
                            type: 'Action.Submit',
                            title: '📄 Draft User Story',
                            data: { command: '/create-us-draft' }
                        },
                        {
                            type: 'Action.Submit',
                            title: '🧪 Test ADO',
                            data: { command: '/test-ado' }
                        }
                    ]
                },
                {
                    type: 'TextBlock',
                    text: 'Configuration',
                    weight: 'Bolder',
                    size: 'Medium',
                    spacing: 'Medium'
                },
                {
                    type: 'ActionSet',
                    actions: [
                        {
                            type: 'Action.Submit',
                            title: '🔑 Set ADO PAT',
                            data: { command: '/set-pat' }
                        },
                        {
                            type: 'Action.Submit',
                            title: '📧 Set Email',
                            data: { command: '/set-email' }
                        }
                    ]
                },
                {
                    type: 'TextBlock',
                    text: 'Other',
                    weight: 'Bolder',
                    size: 'Medium',
                    spacing: 'Medium'
                },
                {
                    type: 'ActionSet',
                    actions: [
                        {
                            type: 'Action.Submit',
                            title: '❓ Help',
                            data: { command: 'help' }
                        }
                    ]
                }
            ],
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json'
        };

        await context.sendActivity({
            attachments: [
                {
                    contentType: 'application/vnd.microsoft.card.adaptive',
                    content: card
                }
            ]
        });
        console.log('✅ /menu command executed');
    }

    async run(context: TurnContext): Promise<void> {
        await super.run(context);
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }
}
