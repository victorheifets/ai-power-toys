// Task Management Functions - Separate Tasks Table
// Handles task-specific operations for standalone Task Manager

import { pool } from './db';

// Merck GPT API Configuration
const MERCK_GPT_API_URL = process.env.MERCK_GPT_API_URL || 'https://iapi-test.merck.com/gpt/v2/gpt-5-2025-08-07/chat/completions';
const MERCK_GPT_API_KEY = process.env.MERCK_GPT_API_KEY || 'JI3xpfhhxJ1ud1AlMScfAV2TgbwQuEh1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Task {
  id?: number;
  user_email: string;

  // Content
  title: string;
  notes?: string | null;
  due_date?: Date | null;
  priority: 'low' | 'medium' | 'high';

  // Categorization
  task_type: 'follow_up' | 'task' | 'urgent' | 'kudos' | 'manual';

  // Management
  status: 'pending' | 'completed' | 'snoozed' | 'dismissed';
  snoozed_until?: Date | null;
  completed_at?: Date | null;

  // Source tracking
  source: 'manual' | 'email';
  source_detection_id?: number | null;
  source_email_id?: number | null;

  // Voice/LLM
  input_method?: 'text' | 'voice' | null;
  raw_input?: string | null;
  llm_parsed_data?: any | null;
  mentioned_people?: string[] | null;
  tags?: string[] | null;

  // Metadata
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
  is_deleted?: boolean;

  // Joined fields (when fetching with email data)
  email_subject?: string | null;
  email_from?: string | null;
  email_body_preview?: string | null;
}

export interface TaskFilters {
  status?: string[];
  task_type?: string[];
  priority?: string[];
  source?: string[];
  timeframe?: 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'later' | 'no_date' | 'all';
  search?: string;
  include_deleted?: boolean;
}

export interface LLMParseResult {
  title: string;
  due_date?: string | null;
  priority: 'low' | 'medium' | 'high';
  task_type: 'task' | 'follow_up' | 'urgent' | 'manual';
  mentioned_people?: string[];
  tags?: string[];
  extracted_entities?: any;
  confidence?: number;
}

// ============================================================================
// TASK CRUD OPERATIONS
// ============================================================================

/**
 * Get all tasks for a user with optional filters
 */
export async function getTasks(userEmail: string, filters: TaskFilters = {}): Promise<Task[]> {
  let query = `
    SELECT
      t.*,
      e.subject as email_subject,
      e.from_email as email_from,
      e.body_preview as email_body_preview
    FROM tasks t
    LEFT JOIN emails e ON t.source_email_id = e.id
    WHERE t.user_email = $1
  `;

  const params: any[] = [userEmail];
  let paramIndex = 2;

  // Filter by deleted status
  if (!filters.include_deleted) {
    query += ` AND t.is_deleted = false`;
  }

  // Filter by status
  if (filters.status && filters.status.length > 0) {
    query += ` AND t.status = ANY($${paramIndex})`;
    params.push(filters.status);
    paramIndex++;
  }

  // Filter by task_type
  if (filters.task_type && filters.task_type.length > 0) {
    query += ` AND t.task_type = ANY($${paramIndex})`;
    params.push(filters.task_type);
    paramIndex++;
  }

  // Filter by priority
  if (filters.priority && filters.priority.length > 0) {
    query += ` AND t.priority = ANY($${paramIndex})`;
    params.push(filters.priority);
    paramIndex++;
  }

  // Filter by source
  if (filters.source && filters.source.length > 0) {
    query += ` AND t.source = ANY($${paramIndex})`;
    params.push(filters.source);
    paramIndex++;
  }

  // Filter by timeframe
  if (filters.timeframe && filters.timeframe !== 'all') {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (filters.timeframe) {
      case 'overdue':
        query += ` AND t.due_date < $${paramIndex} AND t.status = 'pending'`;
        params.push(now);
        paramIndex++;
        break;
      case 'today':
        query += ` AND t.due_date >= $${paramIndex} AND t.due_date < $${paramIndex + 1}`;
        params.push(today, tomorrow);
        paramIndex += 2;
        break;
      case 'tomorrow':
        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
        query += ` AND t.due_date >= $${paramIndex} AND t.due_date < $${paramIndex + 1}`;
        params.push(tomorrow, dayAfterTomorrow);
        paramIndex += 2;
        break;
      case 'this_week':
        const endOfWeek = new Date(today);
        endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));
        query += ` AND t.due_date >= $${paramIndex} AND t.due_date <= $${paramIndex + 1}`;
        params.push(today, endOfWeek);
        paramIndex += 2;
        break;
      case 'later':
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + (7 - today.getDay()));
        query += ` AND t.due_date > $${paramIndex}`;
        params.push(weekEnd);
        paramIndex++;
        break;
      case 'no_date':
        query += ` AND t.due_date IS NULL`;
        break;
    }
  }

  // Search
  if (filters.search) {
    query += ` AND (
      t.title ILIKE $${paramIndex}
      OR t.notes ILIKE $${paramIndex}
      OR e.subject ILIKE $${paramIndex}
      OR t.raw_input ILIKE $${paramIndex}
    )`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  query += `
    ORDER BY
      CASE WHEN t.due_date < NOW() AND t.status = 'pending' THEN 0 ELSE 1 END,
      t.due_date ASC NULLS LAST,
      t.created_at DESC
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getTaskById(taskId: number): Promise<Task | null> {
  const query = `SELECT t.*, e.subject as email_subject, e.from_email as email_from, e.body_preview as email_body_preview
    FROM tasks t LEFT JOIN emails e ON t.source_email_id = e.id WHERE t.id = $1`;
  const result = await pool.query(query, [taskId]);
  return result.rows[0] || null;
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  const query = `INSERT INTO tasks (user_email, title, notes, due_date, priority, task_type, source, source_detection_id, source_email_id, input_method, raw_input, llm_parsed_data, mentioned_people, tags, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *;`;
  const values = [task.user_email, task.title, task.notes || null, task.due_date || null, task.priority || 'medium',
    task.task_type || 'manual', task.source || 'manual', task.source_detection_id || null, task.source_email_id || null,
    task.input_method || null, task.raw_input || null, task.llm_parsed_data ? JSON.stringify(task.llm_parsed_data) : null,
    task.mentioned_people || null, task.tags || null, task.status || 'pending'];
  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function updateTask(taskId: number, updates: Partial<Task>): Promise<Task> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  if (updates.title !== undefined) { fields.push(`title = $${idx++}`); values.push(updates.title); }
  if (updates.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(updates.notes); }
  if (updates.due_date !== undefined) { fields.push(`due_date = $${idx++}`); values.push(updates.due_date); }
  if (updates.priority !== undefined) { fields.push(`priority = $${idx++}`); values.push(updates.priority); }
  if (updates.status !== undefined) { fields.push(`status = $${idx++}`); values.push(updates.status); }
  if (updates.task_type !== undefined) { fields.push(`task_type = $${idx++}`); values.push(updates.task_type); }
  if (fields.length === 0) throw new Error('No fields to update');
  values.push(taskId);
  const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *;`;
  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function completeTask(taskId: number): Promise<void> {
  await pool.query(`UPDATE tasks SET status = 'completed', completed_at = NOW() WHERE id = $1;`, [taskId]);
}

export async function snoozeTask(taskId: number, duration: string): Promise<void> {
  let snoozeUntil: Date;
  const now = new Date();
  switch (duration) {
    case '1h': snoozeUntil = new Date(now.getTime() + 3600000); break;
    case '4h': snoozeUntil = new Date(now.getTime() + 14400000); break;
    case 'tomorrow': snoozeUntil = new Date(now); snoozeUntil.setDate(snoozeUntil.getDate() + 1); snoozeUntil.setHours(9, 0, 0, 0); break;
    case 'next_week': snoozeUntil = new Date(now); snoozeUntil.setDate(snoozeUntil.getDate() + 7); snoozeUntil.setHours(9, 0, 0, 0); break;
    default: snoozeUntil = new Date(duration);
  }
  await pool.query(`UPDATE tasks SET status = 'snoozed', snoozed_until = $1 WHERE id = $2;`, [snoozeUntil, taskId]);
}

export async function deleteTask(taskId: number): Promise<void> {
  await pool.query(`UPDATE tasks SET is_deleted = true, deleted_at = NOW() WHERE id = $1;`, [taskId]);
}

export async function restoreTask(taskId: number): Promise<void> {
  await pool.query(`UPDATE tasks SET is_deleted = false, deleted_at = NULL WHERE id = $1;`, [taskId]);
}

export async function bulkUpdateTasks(taskIds: number[], action: 'complete' | 'delete' | 'snooze', params?: any): Promise<void> {
  if (taskIds.length === 0) return;
  if (action === 'complete') await pool.query(`UPDATE tasks SET status = 'completed', completed_at = NOW() WHERE id = ANY($1);`, [taskIds]);
  else if (action === 'delete') await pool.query(`UPDATE tasks SET is_deleted = true, deleted_at = NOW() WHERE id = ANY($1);`, [taskIds]);
  else if (action === 'snooze') {
    let snoozeUntil: Date;
    const now = new Date();
    switch (params.duration) {
      case '1h': snoozeUntil = new Date(now.getTime() + 3600000); break;
      case '4h': snoozeUntil = new Date(now.getTime() + 14400000); break;
      case 'tomorrow': snoozeUntil = new Date(now); snoozeUntil.setDate(snoozeUntil.getDate() + 1); snoozeUntil.setHours(9, 0, 0, 0); break;
      case 'next_week': snoozeUntil = new Date(now); snoozeUntil.setDate(snoozeUntil.getDate() + 7); snoozeUntil.setHours(9, 0, 0, 0); break;
      default: snoozeUntil = new Date(params.duration);
    }
    await pool.query(`UPDATE tasks SET status = 'snoozed', snoozed_until = $2 WHERE id = ANY($1);`, [taskIds, snoozeUntil]);
  }
}

export async function getTaskStats(userEmail: string): Promise<any> {
  console.log('[getTaskStats] Called with userEmail:', userEmail);
  const query = `SELECT
    COUNT(*) FILTER (WHERE status = 'pending' AND is_deleted = false)::int as pending_count,
    COUNT(*) FILTER (WHERE status = 'completed')::int as completed_count,
    COUNT(*) FILTER (WHERE status = 'snoozed' AND is_deleted = false)::int as snoozed_count,
    COUNT(*) FILTER (WHERE due_date < NOW() AND status = 'pending' AND is_deleted = false)::int as overdue_count,
    COUNT(*) FILTER (WHERE due_date::date = CURRENT_DATE AND status = 'pending' AND is_deleted = false)::int as today_count,
    COUNT(*) FILTER (WHERE source = 'email' AND is_deleted = false)::int as email_tasks_count,
    COUNT(*) FILTER (WHERE source = 'manual' AND is_deleted = false)::int as manual_tasks_count
    FROM tasks WHERE user_email = $1;`;
  console.log('[getTaskStats] Query:', query);
  console.log('[getTaskStats] Params:', [userEmail]);
  const result = await pool.query(query, [userEmail]);
  console.log('[getTaskStats] Result:', result.rows[0]);
  return result.rows[0];
}

export async function parseLLM(input: string, userEmail: string): Promise<LLMParseResult> {
  console.log(`[LLM] Parsing task input: "${input}"`);

  // Use Merck GPT API if available, otherwise fall back to OpenAI or mock
  const useMerckAPI = !!MERCK_GPT_API_KEY;

  if (!useMerckAPI && !OPENAI_API_KEY) {
    console.log('⚠️  No LLM API configured - using mock parsing');
    return mockParseLLM(input);
  }

  const prompt = `
Parse this natural language task input into structured data.

Input: "${input}"
User: ${userEmail}
Current Date: ${new Date().toISOString().split('T')[0]}

Extract and return JSON with:
{
  "title": "Clean, concise task title (remove time/date info from title)",
  "due_date": "ISO 8601 date string if deadline mentioned, otherwise null",
  "priority": "low" | "medium" | "high" (based on urgency keywords or context),
  "task_type": "task" | "follow_up" | "urgent" | "manual" (classify the type),
  "mentioned_people": ["Name1", "Name2"] (extract any person names mentioned),
  "tags": ["keyword1", "keyword2"] (extract important keywords/topics),
  "confidence": 0.0-1.0 (confidence in the extraction)
}

Examples:
- "Call Yan tomorrow about work plan" → title: "Call Yan about work plan", due_date: tomorrow's ISO date, mentioned_people: ["Yan"], tags: ["work plan"]
- "Review project proposal by Friday urgent" → title: "Review project proposal", due_date: next Friday ISO date, priority: "high", tags: ["project", "proposal"]
- "Buy groceries" → title: "Buy groceries", due_date: null, priority: "low"

Return only valid JSON.
`;

  try {
    let response;

    if (useMerckAPI) {
      console.log('🔵 Using Merck GPT API for task parsing');
      response = await fetch(MERCK_GPT_API_URL, {
        method: 'POST',
        headers: {
          'api-key': MERCK_GPT_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are an AI assistant that parses natural language into structured task data. Return only valid JSON.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        })
      });
    } else {
      console.log('🟡 Using OpenAI API for task parsing');
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are an AI assistant that parses natural language into structured task data. Return only valid JSON.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        })
      });
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error (${response.status}): ${error}`);
    }

    const result = await response.json();
    const parsed = JSON.parse(result.choices[0].message.content);

    console.log('✅ LLM parsing successful:', parsed);
    return {
      title: parsed.title || input,
      due_date: parsed.due_date || null,
      priority: parsed.priority || 'medium',
      task_type: parsed.task_type || 'manual',
      mentioned_people: parsed.mentioned_people || undefined,
      tags: parsed.tags || undefined,
      confidence: parsed.confidence || 0.8
    };

  } catch (error: any) {
    console.error('❌ LLM parsing failed:', error.message);
    console.log('⚠️  Falling back to mock parsing');
    return mockParseLLM(input);
  }
}

/**
 * Mock parsing for testing without LLM API
 */
function mockParseLLM(input: string): LLMParseResult {
  console.log(`[MOCK] Parsing: "${input}"`);
  const lowerInput = input.toLowerCase();

  // Extract people
  const peoplePattern = /(?:call|meet|talk to|speak with|contact)\s+([A-Z][a-z]+)/g;
  const mentioned_people: string[] = [];
  let match;
  while ((match = peoplePattern.exec(input)) !== null) {
    mentioned_people.push(match[1]);
  }

  // Extract tags
  const tags: string[] = [];
  const keywords = ['work plan', 'meeting', 'report', 'project', 'review', 'proposal', 'deadline'];
  keywords.forEach(kw => {
    if (lowerInput.includes(kw)) tags.push(kw);
  });

  // Extract due date
  let due_date: string | null = null;
  const now = new Date();
  if (lowerInput.includes('next week')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    due_date = d.toISOString();
  } else if (lowerInput.includes('tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    due_date = d.toISOString();
  } else if (lowerInput.includes('today')) {
    due_date = now.toISOString();
  }

  // Determine priority
  let priority: 'low' | 'medium' | 'high' = 'medium';
  if (lowerInput.includes('urgent') || lowerInput.includes('asap') || lowerInput.includes('important')) {
    priority = 'high';
  }

  return {
    title: input,
    due_date,
    priority,
    task_type: 'manual',
    mentioned_people: mentioned_people.length > 0 ? mentioned_people : undefined,
    tags: tags.length > 0 ? tags : undefined,
    confidence: 0.6
  };
}

export default { getTasks, getTaskById, createTask, updateTask, completeTask, snoozeTask, deleteTask, restoreTask, bulkUpdateTasks, getTaskStats, parseLLM };
