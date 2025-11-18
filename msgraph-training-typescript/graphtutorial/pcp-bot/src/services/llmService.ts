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
- Create short, concise titles that summarize the feature (NOT in "As a..." format)
- Write BRIEF descriptions using "As a [user], I want [feature], so that [benefit]" format
- Keep descriptions to 1-2 sentences maximum - be concise!
- Create 3-5 CONCISE acceptance criteria (as array of strings) - each should be ONE clear sentence
- Focus on the most critical acceptance criteria only
- Estimate story points (1, 2, 3, 5, 8, 13) based on complexity
- Fix any typos or grammatical errors in the input
- Return only valid JSON with NO markdown formatting`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_completion_tokens: 3000
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': this.apiKey
                }
            });

            console.log('LLM API Response:', JSON.stringify(response.data, null, 2));

            const content = response.data.choices[0].message.content;
            if (!content) {
                throw new Error('No response from LLM');
            }

            const parsed = JSON.parse(content);

            // Convert acceptance criteria array to string with bullet points
            let acceptanceCriteria = '';
            if (parsed.acceptanceCriteria) {
                if (Array.isArray(parsed.acceptanceCriteria)) {
                    acceptanceCriteria = parsed.acceptanceCriteria.map((c: string) => `• ${c}`).join('\n\n');
                } else {
                    acceptanceCriteria = parsed.acceptanceCriteria;
                }
            } else if (parsed.acceptance_criteria) {
                if (Array.isArray(parsed.acceptance_criteria)) {
                    acceptanceCriteria = parsed.acceptance_criteria.map((c: string) => `• ${c}`).join('\n\n');
                } else {
                    acceptanceCriteria = parsed.acceptance_criteria;
                }
            }

            return {
                title: parsed.title || input.title,
                description: parsed.description || input.description,
                acceptanceCriteria: acceptanceCriteria || '',
                storyPoints: parsed.storyPoints || parsed.story_points || 3
            };
        } catch (error: any) {
            console.error('Error enhancing user story:', error);
            if (error.response?.data) {
                console.error('API Error Response:', JSON.stringify(error.response.data, null, 2));
            }
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

User Story: ${input.description}
Additional Context: ${input.title}
${input.acceptanceCriteria ? `Acceptance Criteria (optional): ${input.acceptanceCriteria}` : ''}

Return a JSON object with:
{
  "title": "Short, concise title summarizing the feature (NOT 'As a...' format)",
  "description": "User story in 'As a [role], I want [feature], so that [benefit]' format with clear Given/When/Then scenarios",
  "acceptanceCriteria": "Bullet list of specific, testable acceptance criteria",
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
                        content: 'Generate specific, testable acceptance criteria for user stories. Return as JSON array with NO markdown formatting.'
                    },
                    {
                        role: 'user',
                        content: `Generate acceptance criteria for:
Title: ${title}
Description: ${description}

Return JSON: {"criteria": ["criterion 1", "criterion 2", ...]}`
                    }
                ],
                max_completion_tokens: 2000
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
