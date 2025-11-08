// Task Management Functions - Extension to db.ts
// Handles task-specific operations for standalone Task Manager

import { pool } from './db';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Task {
  id?: number;
  email_id?: number | null;
  toy_type: 'follow_up' | 'kudos' | 'task' | 'urgent' | 'manual';
  title: string;
  notes?: string | null;
  due_date?: Date | null;
  priority: 'low' | 'medium' | 'high';
  snoozed_until?: Date | null;
  source: 'email' | 'manual';
  input_method?: 'text' | 'voice' | null;
  raw_input?: string | null;
  detection_data: any;
  llm_parsed_data?: any | null;
  mentioned_people?: string[] | null;
  tags?: string[] | null;
  confidence_score?: number | null;
  status: 'pending' | 'completed' | 'dismissed' | 'snoozed';
  completed_at?: Date | null;
  deleted_at?: Date | null;
  is_deleted: boolean;
  created_at?: Date;
  updated_at?: Date;

  // Joined fields (when fetching with email)
  email_subject?: string | null;
  email_from?: string | null;
  email_body_preview?: string | null;
}

export interface TaskFilters {
  status?: string[];
  toy_type?: string[];
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
  toy_type: 'task' | 'follow_up' | 'urgent' | 'manual';
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
      ptd.*,
      e.subject as email_subject,
      e.from_email as email_from,
      e.body_preview as email_body_preview
    FROM power_toy_detections ptd
    LEFT JOIN emails e ON ptd.email_id = e.id
    WHERE e.user_email = $1
  `;

  const params: any[] = [userEmail];
  let paramIndex = 2;

  // Filter by deleted status
  if (!filters.include_deleted) {
    query += ` AND ptd.is_deleted = false`;
  }

  // Filter by status
  if (filters.status && filters.status.length > 0) {
    // Handle snoozed items specially - only show if snoozed_until has passed
    if (filters.status.includes('snoozed')) {
      query += ` AND (
        ptd.status = ANY($${paramIndex})
        OR (ptd.status = 'snoozed' AND ptd.snoozed_until <= NOW())
      )`;
    } else {
      query += ` AND ptd.status = ANY($${paramIndex})`;
    }
    params.push(filters.status);
    paramIndex++;
  } else {
    // Default: exclude snoozed items that haven't woken up yet
    query += ` AND (ptd.status != 'snoozed' OR ptd.snoozed_until <= NOW())`;
  }

  // Filter by toy_type
  if (filters.toy_type && filters.toy_type.length > 0) {
    query += ` AND ptd.toy_type = ANY($${paramIndex})`;
    params.push(filters.toy_type);
    paramIndex++;
  }

  // Filter by priority
  if (filters.priority && filters.priority.length > 0) {
    query += ` AND ptd.priority = ANY($${paramIndex})`;
    params.push(filters.priority);
    paramIndex++;
  }

  // Filter by source
  if (filters.source && filters.source.length > 0) {
    query += ` AND ptd.source = ANY($${paramIndex})`;
    params.push(filters.source);
    paramIndex++;
  }

  // Filter by timeframe
  if (filters.timeframe && filters.timeframe !== 'all') {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));

    switch (filters.timeframe) {
      case 'overdue':
        query += ` AND ptd.due_date < $${paramIndex} AND ptd.status = 'pending'`;
        params.push(now);
        paramIndex++;
        break;
      case 'today':
        query += ` AND ptd.due_date >= $${paramIndex} AND ptd.due_date < $${paramIndex + 1}`;
        params.push(today, tomorrow);
        paramIndex += 2;
        break;
      case 'tomorrow':
        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
        query += ` AND ptd.due_date >= $${paramIndex} AND ptd.due_date < $${paramIndex + 1}`;
        params.push(tomorrow, dayAfterTomorrow);
        paramIndex += 2;
        break;
      case 'this_week':
        query += ` AND ptd.due_date >= $${paramIndex} AND ptd.due_date <= $${paramIndex + 1}`;
        params.push(today, endOfWeek);
        paramIndex += 2;
        break;
      case 'later':
        query += ` AND ptd.due_date > $${paramIndex}`;
        params.push(endOfWeek);
        paramIndex++;
        break;
      case 'no_date':
        query += ` AND ptd.due_date IS NULL`;
        break;
    }
  }

  // Search in title, notes, and email subject
  if (filters.search) {
    query += ` AND (
      ptd.title ILIKE $${paramIndex}
      OR ptd.notes ILIKE $${paramIndex}
      OR e.subject ILIKE $${paramIndex}
      OR ptd.raw_input ILIKE $${paramIndex}
    )`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  // Order by: overdue first, then by due date, then by created date
  query += `
    ORDER BY
      CASE WHEN ptd.due_date < NOW() AND ptd.status = 'pending' THEN 0 ELSE 1 END,
      ptd.due_date ASC NULLS LAST,
      ptd.created_at DESC
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get a single task by ID
 */
export async function getTaskById(taskId: number): Promise<Task | null> {
  const query = `
    SELECT
      ptd.*,
      e.subject as email_subject,
      e.from_email as email_from,
      e.body_preview as email_body_preview,
      e.body_content as email_body_content
    FROM power_toy_detections ptd
    LEFT JOIN emails e ON ptd.email_id = e.id
    WHERE ptd.id = $1
  `;

  const result = await pool.query(query, [taskId]);
  return result.rows[0] || null;
}

/**
 * Create a new manual task
 * LLM parsing should be done before calling this function
 */
export async function createManualTask(task: Partial<Task>): Promise<Task> {
  const query = `
    INSERT INTO power_toy_detections (
      email_id, toy_type, title, notes, due_date, priority,
      source, input_method, raw_input, detection_data,
      llm_parsed_data, mentioned_people, tags, status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    )
    RETURNING *;
  `;

  const values = [
    task.email_id || null,
    task.toy_type || 'manual',
    task.title,
    task.notes || null,
    task.due_date || null,
    task.priority || 'medium',
    'manual',
    task.input_method || null,
    task.raw_input || null,
    task.detection_data || {},
    task.llm_parsed_data || null,
    task.mentioned_people || null,
    task.tags || null,
    task.status || 'pending'
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Update an existing task
 */
export async function updateTask(taskId: number, updates: Partial<Task>): Promise<Task> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(updates.title);
  }
  if (updates.notes !== undefined) {
    fields.push(`notes = $${paramIndex++}`);
    values.push(updates.notes);
  }
  if (updates.due_date !== undefined) {
    fields.push(`due_date = $${paramIndex++}`);
    values.push(updates.due_date);
  }
  if (updates.priority !== undefined) {
    fields.push(`priority = $${paramIndex++}`);
    values.push(updates.priority);
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.toy_type !== undefined) {
    fields.push(`toy_type = $${paramIndex++}`);
    values.push(updates.toy_type);
  }
  if (updates.mentioned_people !== undefined) {
    fields.push(`mentioned_people = $${paramIndex++}`);
    values.push(updates.mentioned_people);
  }
  if (updates.tags !== undefined) {
    fields.push(`tags = $${paramIndex++}`);
    values.push(updates.tags);
  }
  if (updates.llm_parsed_data !== undefined) {
    fields.push(`llm_parsed_data = $${paramIndex++}`);
    values.push(JSON.stringify(updates.llm_parsed_data));
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(taskId);

  const query = `
    UPDATE power_toy_detections
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Complete a task
 */
export async function completeTask(taskId: number): Promise<void> {
  const query = `
    UPDATE power_toy_detections
    SET status = 'completed', completed_at = NOW()
    WHERE id = $1;
  `;
  await pool.query(query, [taskId]);
}

/**
 * Snooze a task until a specific time
 */
export async function snoozeTask(taskId: number, duration: string): Promise<void> {
  let snoozeUntil: Date;
  const now = new Date();

  switch (duration) {
    case '1h':
      snoozeUntil = new Date(now.getTime() + 60 * 60 * 1000);
      break;
    case '4h':
      snoozeUntil = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      break;
    case 'tomorrow':
      snoozeUntil = new Date(now);
      snoozeUntil.setDate(snoozeUntil.getDate() + 1);
      snoozeUntil.setHours(9, 0, 0, 0); // Tomorrow at 9am
      break;
    case 'next_week':
      snoozeUntil = new Date(now);
      snoozeUntil.setDate(snoozeUntil.getDate() + 7);
      snoozeUntil.setHours(9, 0, 0, 0); // Next week at 9am
      break;
    default:
      // Custom timestamp
      snoozeUntil = new Date(duration);
  }

  const query = `
    UPDATE power_toy_detections
    SET status = 'snoozed', snoozed_until = $1
    WHERE id = $2;
  `;
  await pool.query(query, [snoozeUntil, taskId]);
}

/**
 * Soft delete a task
 */
export async function deleteTask(taskId: number): Promise<void> {
  const query = `
    UPDATE power_toy_detections
    SET is_deleted = true, deleted_at = NOW()
    WHERE id = $1;
  `;
  await pool.query(query, [taskId]);
}

/**
 * Restore a deleted task
 */
export async function restoreTask(taskId: number): Promise<void> {
  const query = `
    UPDATE power_toy_detections
    SET is_deleted = false, deleted_at = NULL
    WHERE id = $1;
  `;
  await pool.query(query, [taskId]);
}

/**
 * Bulk update tasks
 */
export async function bulkUpdateTasks(
  taskIds: number[],
  action: 'complete' | 'delete' | 'snooze',
  params?: any
): Promise<void> {
  if (taskIds.length === 0) return;

  let query = '';
  const values: any[] = [taskIds];

  switch (action) {
    case 'complete':
      query = `
        UPDATE power_toy_detections
        SET status = 'completed', completed_at = NOW()
        WHERE id = ANY($1);
      `;
      break;
    case 'delete':
      query = `
        UPDATE power_toy_detections
        SET is_deleted = true, deleted_at = NOW()
        WHERE id = ANY($1);
      `;
      break;
    case 'snooze':
      if (!params?.duration) throw new Error('Snooze duration required');
      // Calculate snooze time (reuse logic from snoozeTask)
      let snoozeUntil: Date;
      const now = new Date();
      switch (params.duration) {
        case '1h':
          snoozeUntil = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case '4h':
          snoozeUntil = new Date(now.getTime() + 4 * 60 * 60 * 1000);
          break;
        case 'tomorrow':
          snoozeUntil = new Date(now);
          snoozeUntil.setDate(snoozeUntil.getDate() + 1);
          snoozeUntil.setHours(9, 0, 0, 0);
          break;
        case 'next_week':
          snoozeUntil = new Date(now);
          snoozeUntil.setDate(snoozeUntil.getDate() + 7);
          snoozeUntil.setHours(9, 0, 0, 0);
          break;
        default:
          snoozeUntil = new Date(params.duration);
      }
      query = `
        UPDATE power_toy_detections
        SET status = 'snoozed', snoozed_until = $2
        WHERE id = ANY($1);
      `;
      values.push(snoozeUntil);
      break;
  }

  await pool.query(query, values);
}

/**
 * Get task statistics for a user
 */
export async function getTaskStats(userEmail: string): Promise<any> {
  const query = `
    SELECT
      COUNT(*) FILTER (WHERE ptd.status = 'pending' AND ptd.is_deleted = false) as pending_count,
      COUNT(*) FILTER (WHERE ptd.status = 'completed') as completed_count,
      COUNT(*) FILTER (WHERE ptd.status = 'snoozed' AND ptd.is_deleted = false) as snoozed_count,
      COUNT(*) FILTER (WHERE ptd.due_date < NOW() AND ptd.status = 'pending' AND ptd.is_deleted = false) as overdue_count,
      COUNT(*) FILTER (WHERE ptd.due_date::date = CURRENT_DATE AND ptd.status = 'pending' AND ptd.is_deleted = false) as today_count,
      COUNT(*) FILTER (WHERE ptd.source = 'email' AND ptd.is_deleted = false) as email_tasks_count,
      COUNT(*) FILTER (WHERE ptd.source = 'manual' AND ptd.is_deleted = false) as manual_tasks_count
    FROM power_toy_detections ptd
    LEFT JOIN emails e ON ptd.email_id = e.id
    WHERE (e.user_email = $1 OR ptd.email_id IS NULL);
  `;

  const result = await pool.query(query, [userEmail]);
  return result.rows[0];
}

// ============================================================================
// LLM PARSING (PLACEHOLDER)
// ============================================================================

/**
 * Parse natural language input with LLM
 * PLACEHOLDER - Returns mock data for now
 */
export async function parseLLM(input: string, userEmail: string): Promise<LLMParseResult> {
  // TODO: Integrate with OpenAI GPT-4 for real parsing
  // For now, return mock data
  console.log(`[LLM PLACEHOLDER] Parsing: "${input}"`);

  // Simple keyword extraction (temporary)
  const lowerInput = input.toLowerCase();

  // Extract mentioned people (basic pattern matching)
  const peoplePatterns = /(?:call|meet|talk to|speak with|contact)\s+([A-Z][a-z]+)/g;
  const mentioned_people: string[] = [];
  let match;
  while ((match = peoplePatterns.exec(input)) !== null) {
    mentioned_people.push(match[1]);
  }

  // Extract tags (common work-related keywords)
  const tags: string[] = [];
  const keywords = ['work plan', 'meeting', 'report', 'project', 'review', 'proposal', 'deadline'];
  keywords.forEach(keyword => {
    if (lowerInput.includes(keyword)) {
      tags.push(keyword);
    }
  });

  // Parse due date (basic)
  let due_date: string | null = null;
  const now = new Date();
  if (lowerInput.includes('next week')) {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    due_date = nextWeek.toISOString();
  } else if (lowerInput.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    due_date = tomorrow.toISOString();
  } else if (lowerInput.includes('today')) {
    due_date = now.toISOString();
  }

  // Determine priority
  let priority: 'low' | 'medium' | 'high' = 'medium';
  if (lowerInput.includes('urgent') || lowerInput.includes('asap') || lowerInput.includes('important')) {
    priority = 'high';
  }

  return {
    title: input, // Use raw input as title for now
    due_date,
    priority,
    toy_type: 'manual',
    mentioned_people: mentioned_people.length > 0 ? mentioned_people : undefined,
    tags: tags.length > 0 ? tags : undefined,
    confidence: 0.6 // Mock confidence
  };
}

export default {
  getTasks,
  getTaskById,
  createManualTask,
  updateTask,
  completeTask,
  snoozeTask,
  deleteTask,
  restoreTask,
  bulkUpdateTasks,
  getTaskStats,
  parseLLM
};
