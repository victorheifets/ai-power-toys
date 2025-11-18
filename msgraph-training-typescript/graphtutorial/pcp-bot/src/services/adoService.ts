import * as azdev from 'azure-devops-node-api';
import { WorkItemTrackingApi } from 'azure-devops-node-api/WorkItemTrackingApi';
import { WorkItem } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';
import { cacheWorkItem, getCachedWorkItems } from '../../database/db';

export interface ADOConfig {
    organization: string;
    project: string;
    pat: string; // Personal Access Token
}

export interface WorkItemSummary {
    id: string;
    title: string;
    state: string;
    type: string;
    assignedTo: string;
    areaPath?: string;
    iterationPath?: string;
}

export class ADOService {
    private connection: azdev.WebApi | null = null;
    private witApi: WorkItemTrackingApi | null = null;
    private config: ADOConfig;

    constructor(config: ADOConfig) {
        this.config = config;
    }

    async connect(): Promise<void> {
        const authHandler = azdev.getPersonalAccessTokenHandler(this.config.pat);
        const orgUrl = `https://dev.azure.com/${this.config.organization}`;
        
        this.connection = new azdev.WebApi(orgUrl, authHandler);
        this.witApi = await this.connection.getWorkItemTrackingApi();
        
        console.log(`✅ Connected to ADO: ${this.config.organization}/${this.config.project}`);
    }

    async getUserWorkItems(userEmail: string): Promise<WorkItemSummary[]> {
        if (!this.witApi) {
            await this.connect();
        }

        try {
            // WIQL query to get user stories from IDP - DevOps assigned to user
            const wiql = {
                query: `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo]
                        FROM WorkItems
                        WHERE [System.AssignedTo] = '${userEmail}'
                        AND [System.WorkItemType] = 'User Story'
                        AND [System.AreaPath] UNDER 'IDP - DevOps'
                        AND [System.State] <> 'Closed'
                        AND [System.State] <> 'Removed'
                        ORDER BY [System.ChangedDate] DESC`
            };

            const result = await this.witApi!.queryByWiql(wiql, { project: this.config.project });
            
            if (!result.workItems || result.workItems.length === 0) {
                return [];
            }

            // Get full work item details
            const ids = result.workItems.map(wi => wi.id!);
            const workItems = await this.witApi!.getWorkItems(ids, undefined, undefined, undefined, undefined, this.config.project);

            // Convert to summary format and cache
            const summaries: WorkItemSummary[] = workItems.map(wi => {
                const summary: WorkItemSummary = {
                    id: wi.id!.toString(),
                    title: wi.fields!['System.Title'],
                    state: wi.fields!['System.State'],
                    type: wi.fields!['System.WorkItemType'],
                    assignedTo: wi.fields!['System.AssignedTo']?.displayName || userEmail,
                    areaPath: wi.fields!['System.AreaPath'],
                    iterationPath: wi.fields!['System.IterationPath']
                };

                // Cache work item
                cacheWorkItem({
                    workItemId: summary.id,
                    title: summary.title,
                    assignedTo: summary.assignedTo,
                    state: summary.state,
                    workItemType: summary.type,
                    areaPath: summary.areaPath,
                    iterationPath: summary.iterationPath,
                    rawData: wi
                }).catch(err => console.error('Error caching work item:', err));

                return summary;
            });

            return summaries;
        } catch (error) {
            console.error('Error fetching work items:', error);
            // Fall back to cached items
            const cached = await getCachedWorkItems(userEmail);
            return cached.map(c => ({
                id: c.work_item_id,
                title: c.title,
                state: c.state,
                type: c.work_item_type,
                assignedTo: c.assigned_to,
                areaPath: c.area_path || undefined,
                iterationPath: c.iteration_path || undefined
            }));
        }
    }

    async updateWorkItemComment(workItemId: number, comment: string): Promise<void> {
        if (!this.witApi) {
            await this.connect();
        }

        try {
            await this.witApi!.addComment(
                {
                    text: comment
                },
                this.config.project,
                workItemId
            );
            console.log(`✅ Added comment to work item #${workItemId}`);
        } catch (error) {
            console.error(`Error adding comment to work item #${workItemId}:`, error);
            throw error;
        }
    }

    async updateWorkItemState(workItemId: number, newState: string): Promise<void> {
        if (!this.witApi) {
            await this.connect();
        }

        try {
            const patchDocument = [
                {
                    op: 'add',
                    path: '/fields/System.State',
                    value: newState
                }
            ];

            await this.witApi!.updateWorkItem(
                {},
                patchDocument,
                workItemId,
                this.config.project
            );
            console.log(`✅ Updated work item #${workItemId} state to: ${newState}`);
        } catch (error) {
            console.error(`Error updating work item #${workItemId}:`, error);
            throw error;
        }
    }

    async addBlockerTag(workItemId: number): Promise<void> {
        if (!this.witApi) {
            await this.connect();
        }

        try {
            // Get current tags
            const workItem = await this.witApi!.getWorkItem(workItemId, undefined, undefined, undefined, this.config.project);
            const currentTags = workItem.fields?.['System.Tags'] || '';
            
            // Add "Blocked" tag if not present
            const tags = currentTags.split(';').map((t: string) => t.trim()).filter((t: string) => t);
            if (!tags.includes('Blocked')) {
                tags.push('Blocked');
            }

            const patchDocument = [
                {
                    op: 'add',
                    path: '/fields/System.Tags',
                    value: tags.join('; ')
                }
            ];

            await this.witApi!.updateWorkItem(
                {},
                patchDocument,
                workItemId,
                this.config.project
            );
            console.log(`✅ Added "Blocked" tag to work item #${workItemId}`);
        } catch (error) {
            console.error(`Error adding blocker tag to work item #${workItemId}:`, error);
            throw error;
        }
    }

    async createWorkItem(data: {
        type: string;
        title: string;
        description: string;
        acceptanceCriteria?: string;
        storyPoints?: number;
        assignedTo?: string;
    }): Promise<number> {
        if (!this.witApi) {
            await this.connect();
        }

        try {
            const patchDocument: any[] = [
                {
                    op: 'add',
                    path: '/fields/System.Title',
                    value: data.title
                },
                {
                    op: 'add',
                    path: '/fields/System.Description',
                    value: data.description
                },
                {
                    op: 'add',
                    path: '/fields/Microsoft.VSTS.Common.Priority',
                    value: 2  // Default to Medium priority
                }
            ];

            if (data.acceptanceCriteria) {
                // Convert acceptance criteria to HTML format (ADO requirement)
                let criteriaText: string;

                // Check if it's already an array (from card submission)
                if (Array.isArray(data.acceptanceCriteria)) {
                    const items = data.acceptanceCriteria.map(item => `<li>${item}</li>`).join('');
                    criteriaText = `<ul>${items}</ul>`;
                } else if (typeof data.acceptanceCriteria === 'string') {
                    // Try to parse as JSON array
                    try {
                        const parsed = JSON.parse(data.acceptanceCriteria);
                        if (Array.isArray(parsed)) {
                            const items = parsed.map(item => `<li>${item}</li>`).join('');
                            criteriaText = `<ul>${items}</ul>`;
                        } else {
                            criteriaText = data.acceptanceCriteria;
                        }
                    } catch {
                        // Not JSON, use as-is (assume it's already formatted text)
                        criteriaText = data.acceptanceCriteria;
                    }
                } else {
                    criteriaText = String(data.acceptanceCriteria);
                }

                console.log('Acceptance Criteria being sent to ADO:', criteriaText);

                patchDocument.push({
                    op: 'add',
                    path: '/fields/Microsoft.VSTS.Common.AcceptanceCriteria',
                    value: criteriaText
                });
            }

            if (data.storyPoints) {
                patchDocument.push({
                    op: 'add',
                    path: '/fields/Microsoft.VSTS.Scheduling.StoryPoints',
                    value: data.storyPoints
                });
            }

            if (data.assignedTo) {
                patchDocument.push({
                    op: 'add',
                    path: '/fields/System.AssignedTo',
                    value: data.assignedTo
                });
            }

            const result = await this.witApi!.createWorkItem(
                {},
                patchDocument,
                this.config.project,
                data.type
            );

            console.log(`✅ Created work item #${result.id}`);
            return result.id!;
        } catch (error) {
            console.error('Error creating work item:', error);
            throw error;
        }
    }
}

// Singleton instance
let adoServiceInstance: ADOService | null = null;

export function initADOService(config: ADOConfig): ADOService {
    adoServiceInstance = new ADOService(config);
    return adoServiceInstance;
}

export function getADOService(): ADOService | null {
    return adoServiceInstance;
}
