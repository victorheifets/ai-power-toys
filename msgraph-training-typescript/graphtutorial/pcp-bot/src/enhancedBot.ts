import { ActivityHandler, TurnContext, ConversationState, UserState, CardFactory, TeamsInfo, ConversationReference } from 'botbuilder';
import { createStandupCard, createEODCard, createBlockerAlertCard, createStoryEnhancementCard } from './cards';
import { getADOService, initADOService } from './services/adoService';
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
    completeGroupSession
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

    constructor(conversationState: ConversationState, userState: UserState) {
        super();

        this.conversationState = conversationState;
        this.userState = userState;
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
            const text = context.activity.text?.toLowerCase().trim() || '';

            // Check for pending story input
            const conversationData: ConversationData = await this.conversationDataAccessor.get(context, {});
            if (conversationData.pendingStoryData?.awaitingInput && !context.activity.value) {
                await this.processStoryInput(context, context.activity.text);
                return await next();
            }

            // Check if this is a card submission
            if (context.activity.value) {
                await this.handleCardSubmission(context);
            } else if (text.startsWith('/set-pat')) {
                await this.setUserPAT(context, text);
            } else if (text.startsWith('/team-standup')) {
                await this.handleTeamStandup(context);
            } else if (text.startsWith('/team-eod')) {
                await this.handleTeamEOD(context);
            } else if (text.startsWith('/create-us-2')) {
                await this.handleCreateUserStoryURL(context);
            } else if (text.startsWith('/create-us') || text.includes('create user story')) {
                await this.handleCreateUserStory(context);
            } else if (text.startsWith('/status')) {
                await this.handleQuickStatus(context, text);
            } else if (text.startsWith('/block')) {
                await this.handleReportBlocker(context, text);
            } else if (text.includes('standup')) {
                await this.handleStandupCommand(context);
            } else if (text.includes('eod')) {
                await this.handleEODCommand(context);
            } else if (text.startsWith('/test-ado')) {
                await this.testADO(context);
            } else if (text.startsWith('/set-email')) {
                await this.setUserEmail(context, text);
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
            // Get user's stored ADO email or use default
            const userData: UserData = await this.userDataAccessor.get(context, {});
            const userEmail = userData.adoEmail || context.activity.from.name || context.activity.from.id;
            
            await context.sendActivity(`Fetching work items for: ${userEmail}`);
            
            // Fetch user's ADO work items
            const adoService = getADOService();
            let workItems: any[] = [];
            
            if (adoService) {
                try {
                    workItems = await adoService.getUserWorkItems(userEmail);
                    await context.sendActivity(`Found ${workItems.length} work items`);
                } catch (error: any) {
                    console.error('Error fetching work items:', error);
                    await context.sendActivity(`Error fetching ADO items: ${error.message}. Using empty card.`);
                }
            } else {
                await context.sendActivity('ADO service not configured. Using basic card.');
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
            const userEmail = context.activity.from.name || userId;

            // Fetch work items
            const adoService = getADOService();
            let workItems: any[] = [];
            
            if (adoService) {
                try {
                    workItems = await adoService.getUserWorkItems(userEmail);
                } catch (error) {
                    console.error('Error fetching work items:', error);
                }
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
                case 'createInADO':
                    await this.createStoryInADO(context, value);
                    break;
                case 'regenerateStory':
                    await this.regenerateStory(context, value);
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

        // Update ADO with comments using user's PAT if available
        const userPAT = await getUserPAT(userId);
        if (userPAT && data.yesterday_items) {
            const userADOService = initADOService({
                organization: process.env.ADO_ORGANIZATION!,
                project: process.env.ADO_PROJECT!,
                pat: userPAT.ado_pat
            });

            const items = data.yesterday_items.split(',');
            for (const itemId of items) {
                try {
                    await userADOService.updateWorkItemComment(
                        parseInt(itemId),
                        `Standup Update from ${userName}:\nYesterday: Worked on this item\nToday: ${data.today_additional || 'Continuing work'}`
                    );
                } catch (error) {
                    console.error(`Error updating work item ${itemId}:`, error);
                }
            }
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

        // Update ADO using user's PAT if available
        const userPAT = await getUserPAT(userId);
        if (userPAT && data.completed_items) {
            const userADOService = initADOService({
                organization: process.env.ADO_ORGANIZATION!,
                project: process.env.ADO_PROJECT!,
                pat: userPAT.ado_pat
            });

            const items = data.completed_items.split(',');
            for (const itemId of items) {
                try {
                    await userADOService.updateWorkItemComment(
                        parseInt(itemId),
                        `EOD Update from ${userName}:\nCompleted today\nReflection: ${data.reflection || 'N/A'}`
                    );
                } catch (error) {
                    console.error(`Error updating work item ${itemId}:`, error);
                }
            }
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
                await adoService.updateWorkItemState(parseInt(data.blocked_item), 'Awaiting for Info');
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
        await context.sendActivity(
            '🤖 Let\'s create a user story!\n\n' +
            'Please provide:\n' +
            '1. **Title**: Brief description of the feature\n' +
            '2. **Description**: What needs to be built\n' +
            '3. **Acceptance Criteria** (optional)\n\n' +
            'Format: title | description | criteria'
        );

        // Store state to expect story input
        const conversationData: ConversationData = await this.conversationDataAccessor.get(context, {});
        conversationData.pendingStoryData = { awaitingInput: true };
        await this.conversationDataAccessor.set(context, conversationData);
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
        const card = createStoryEnhancementCard(data.original, enhanced);
        await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
    }

    private async createStoryInADO(context: TurnContext, data: any) {
        const adoService = getADOService();
        if (!adoService) {
            await context.sendActivity('ADO service not configured');
            return;
        }

        try {
            const story = data.story;
            const workItemId = await adoService.createWorkItem({
                type: 'User Story',
                title: story.title,
                description: story.description,
                acceptanceCriteria: story.acceptanceCriteria,
                storyPoints: story.storyPoints
            });

            await context.sendActivity(`✅ Created User Story #${workItemId} in ADO!`);
        } catch (error) {
            console.error('Error creating work item:', error);
            await context.sendActivity('Error creating work item in ADO');
        }
    }

    private async handleQuickStatus(context: TurnContext, text: string) {
        await context.sendActivity('Quick status update coming soon!');
    }

    private async handleReportBlocker(context: TurnContext, text: string) {
        await context.sendActivity('Blocker reporting coming soon!');
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
        const userData: UserData = await this.userDataAccessor.get(context, {});
        userData.adoEmail = email;
        await this.userDataAccessor.set(context, userData);
        await this.userState.saveChanges(context);

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

    async run(context: TurnContext): Promise<void> {
        await super.run(context);
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }
}
