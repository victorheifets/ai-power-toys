import axios from 'axios';

export interface StoryInput {
    title: string;
    description: string;
    acceptanceCriteria?: string;
}

export interface EnhancedStory {
    title: string;
    description: string;
    acceptanceCriteria: string;
    storyPoints: number;
}

export class LLMService {
    private endpoint: string;
    private apiKey: string;
    private deploymentName: string;

    constructor(endpoint: string, apiKey: string, deploymentName: string = 'gpt-4') {
        this.endpoint = endpoint;
        this.apiKey = apiKey;
        this.deploymentName = deploymentName;
    }

    async enhanceUserStory(input: StoryInput): Promise<EnhancedStory> {
        const prompt = this.buildPrompt(input);

        try {
            // Use Merck internal GPT API format
            const url = `${this.endpoint}v2/gpt-5-2025-08-07/chat/completions`;

            const response = await axios.post(url, {
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert product manager and Agile coach. Your task is to help refine user stories following best practices:
- Use "As a [user], I want [feature], so that [benefit]" format for titles
- Write descriptions in Given/When/Then format
- Create specific, testable acceptance criteria
- Estimate story points (1, 2, 3, 5, 8, 13) based on complexity
- Be concise and clear
- Return only valid JSON`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000,
                response_format: { type: 'json_object' }
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': this.apiKey
                }
            });

            const content = response.data.choices[0].message.content;
            if (!content) {
                throw new Error('No response from LLM');
            }

            const parsed = JSON.parse(content);

            return {
                title: parsed.title || input.title,
                description: parsed.description || input.description,
                acceptanceCriteria: parsed.acceptanceCriteria || parsed.acceptance_criteria || '',
                storyPoints: parsed.storyPoints || parsed.story_points || 3
            };
        } catch (error) {
            console.error('Error enhancing user story:', error);
            // Return original input if LLM fails
            return {
                title: input.title,
                description: input.description,
                acceptanceCriteria: input.acceptanceCriteria || '',
                storyPoints: 3
            };
        }
    }

    private buildPrompt(input: StoryInput): string {
        return `Enhance this user story following Agile best practices:

Title: ${input.title}
Description: ${input.description}
${input.acceptanceCriteria ? `Acceptance Criteria: ${input.acceptanceCriteria}` : ''}

Return a JSON object with:
{
  "title": "Enhanced title in 'As a... I want... So that...' format",
  "description": "Enhanced description in Given/When/Then format",
  "acceptanceCriteria": "Bullet list of specific, testable criteria",
  "storyPoints": estimated_number (1, 2, 3, 5, 8, or 13)
}`;
    }

    async generateAcceptanceCriteria(title: string, description: string): Promise<string[]> {
        try {
            const url = `${this.endpoint}v2/gpt-5-2025-08-07/chat/completions`;

            const response = await axios.post(url, {
                messages: [
                    {
                        role: 'system',
                        content: 'Generate specific, testable acceptance criteria for user stories. Return as JSON array.'
                    },
                    {
                        role: 'user',
                        content: `Generate acceptance criteria for:
Title: ${title}
Description: ${description}

Return JSON: {"criteria": ["criterion 1", "criterion 2", ...]}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 500,
                response_format: { type: 'json_object' }
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': this.apiKey
                }
            });

            const content = response.data.choices[0].message.content;
            if (!content) {
                return [];
            }

            const parsed = JSON.parse(content);
            return parsed.criteria || [];
        } catch (error) {
            console.error('Error generating acceptance criteria:', error);
            return [];
        }
    }
}

// Singleton instance
let llmServiceInstance: LLMService | null = null;

export function initLLMService(endpoint: string, apiKey: string, deploymentName?: string): LLMService {
    llmServiceInstance = new LLMService(endpoint, apiKey, deploymentName);
    return llmServiceInstance;
}

export function getLLMService(): LLMService | null {
    return llmServiceInstance;
}
