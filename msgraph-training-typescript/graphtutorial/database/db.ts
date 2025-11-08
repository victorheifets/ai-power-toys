// Database connection and query functions for AI Power Toys

import { Pool, QueryResult } from 'pg';

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ai_power_toys',
  user: process.env.DB_USER || process.env.USER,
  password: process.env.DB_PASSWORD || '',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Email {
  id?: number;
  graph_message_id: string;
  user_email: string;
  from_email: string;
  subject: string | null;
  body_preview: string | null;
  body_content: string | null;
  received_at: Date;
  analyzed_at?: Date | null;
  created_at?: Date;
}

export interface PowerToyDetection {
  id?: number;
  email_id: number;
  toy_type: 'follow_up' | 'kudos' | 'task' | 'urgent';
  detection_data: any; // JSONB - structure varies by toy_type
  confidence_score?: number;
  status?: 'pending' | 'actioned' | 'dismissed' | 'snoozed';
  created_at?: Date;
  updated_at?: Date;
}

export interface UserAction {
  id?: number;
  detection_id: number;
  action_type: 'add_task' | 'add_calendar' | 'send_inspire' | 'dismiss' | 'snooze';
  action_data?: any; // JSONB - details about the action
  executed_at?: Date;
  result?: 'success' | 'failed' | 'pending';
  error_message?: string | null;
}

export interface EmailWithDetections extends Email {
  detections: PowerToyDetection[];
}

export interface CustomToy {
  id?: number;
  user_email: string;
  toy_name: string;
  toy_type?: 'follow_up' | 'kudos' | 'task' | 'urgent' | null; // NULL for custom toys
  icon: string;
  user_description: string;
  action_type: string;
  action_config: any; // JSONB - button_label, url, etc.
  is_builtin?: boolean; // True for system-provided toys
  enabled: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// ============================================================================
// EMAIL FUNCTIONS
// ============================================================================

/**
 * Insert a new email into the database
 * Returns the inserted email with its ID
 */
export async function insertEmail(email: Email): Promise<Email> {
  const query = `
    INSERT INTO emails (
      graph_message_id, user_email, from_email, subject,
      body_preview, body_content, received_at, analyzed_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (graph_message_id) DO NOTHING
    RETURNING *;
  `;

  const values = [
    email.graph_message_id,
    email.user_email,
    email.from_email,
    email.subject,
    email.body_preview,
    email.body_content,
    email.received_at,
    email.analyzed_at || null
  ];

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    // Email already exists, fetch it
    return await getEmailByGraphId(email.graph_message_id) as Email;
  }

  return result.rows[0];
}

/**
 * Get email by Graph message ID
 */
export async function getEmailByGraphId(graphMessageId: string): Promise<Email | null> {
  const query = 'SELECT * FROM emails WHERE graph_message_id = $1;';
  const result = await pool.query(query, [graphMessageId]);
  return result.rows[0] || null;
}

/**
 * Get email by internal ID
 */
export async function getEmailById(id: number): Promise<Email | null> {
  const query = 'SELECT * FROM emails WHERE id = $1;';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Get recent emails for a user
 */
export async function getRecentEmails(userEmail: string, limit: number = 50): Promise<Email[]> {
  const query = `
    SELECT * FROM emails
    WHERE user_email = $1
    ORDER BY received_at DESC
    LIMIT $2;
  `;
  const result = await pool.query(query, [userEmail, limit]);
  return result.rows;
}

/**
 * Update email's analyzed_at timestamp
 */
export async function markEmailAsAnalyzed(emailId: number): Promise<void> {
  const query = 'UPDATE emails SET analyzed_at = CURRENT_TIMESTAMP WHERE id = $1;';
  await pool.query(query, [emailId]);
}

// ============================================================================
// POWER TOY DETECTION FUNCTIONS
// ============================================================================

/**
 * Insert a Power Toy detection
 */
export async function insertDetection(detection: PowerToyDetection): Promise<PowerToyDetection> {
  const query = `
    INSERT INTO power_toy_detections (
      email_id, toy_type, detection_data, confidence_score, status
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const values = [
    detection.email_id,
    detection.toy_type,
    JSON.stringify(detection.detection_data),
    detection.confidence_score || null,
    detection.status || 'pending'
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Get all detections for an email
 */
export async function getDetectionsByEmail(emailId: number): Promise<PowerToyDetection[]> {
  const query = `
    SELECT * FROM power_toy_detections
    WHERE email_id = $1
    ORDER BY created_at ASC;
  `;
  const result = await pool.query(query, [emailId]);
  return result.rows;
}

/**
 * Get pending detections for a user (across all their emails)
 */
export async function getPendingDetections(userEmail: string): Promise<EmailWithDetections[]> {
  const query = `
    SELECT
      e.*,
      json_agg(
        json_build_object(
          'id', ptd.id,
          'toy_type', ptd.toy_type,
          'detection_data', ptd.detection_data,
          'confidence_score', ptd.confidence_score,
          'status', ptd.status,
          'created_at', ptd.created_at,
          'updated_at', ptd.updated_at
        )
      ) as detections
    FROM emails e
    INNER JOIN power_toy_detections ptd ON e.id = ptd.email_id
    WHERE e.user_email = $1 AND ptd.status = 'pending'
    GROUP BY e.id
    ORDER BY e.received_at DESC;
  `;

  const result = await pool.query(query, [userEmail]);
  return result.rows;
}

/**
 * Update detection status
 */
export async function updateDetectionStatus(
  detectionId: number,
  status: 'pending' | 'actioned' | 'dismissed' | 'snoozed'
): Promise<void> {
  const query = 'UPDATE power_toy_detections SET status = $1 WHERE id = $2;';
  await pool.query(query, [status, detectionId]);
}

/**
 * Get detection by ID
 */
export async function getDetectionById(id: number): Promise<PowerToyDetection | null> {
  const query = 'SELECT * FROM power_toy_detections WHERE id = $1;';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

// ============================================================================
// USER ACTION FUNCTIONS
// ============================================================================

/**
 * Insert a user action
 */
export async function insertUserAction(action: UserAction): Promise<UserAction> {
  const query = `
    INSERT INTO user_actions (
      detection_id, action_type, action_data, result, error_message
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const values = [
    action.detection_id,
    action.action_type,
    action.action_data ? JSON.stringify(action.action_data) : null,
    action.result || 'pending',
    action.error_message || null
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Update user action result
 */
export async function updateActionResult(
  actionId: number,
  result: 'success' | 'failed' | 'pending',
  errorMessage?: string
): Promise<void> {
  const query = `
    UPDATE user_actions
    SET result = $1, error_message = $2
    WHERE id = $3;
  `;
  await pool.query(query, [result, errorMessage || null, actionId]);
}

/**
 * Get actions for a detection
 */
export async function getActionsByDetection(detectionId: number): Promise<UserAction[]> {
  const query = `
    SELECT * FROM user_actions
    WHERE detection_id = $1
    ORDER BY executed_at DESC;
  `;
  const result = await pool.query(query, [detectionId]);
  return result.rows;
}

// ============================================================================
// COMPLEX QUERIES
// ============================================================================

/**
 * Get email with all its detections and actions
 */
export async function getEmailWithDetails(emailId: number): Promise<any> {
  const query = `
    SELECT
      e.*,
      json_agg(
        DISTINCT jsonb_build_object(
          'id', ptd.id,
          'toy_type', ptd.toy_type,
          'detection_data', ptd.detection_data,
          'confidence_score', ptd.confidence_score,
          'status', ptd.status,
          'created_at', ptd.created_at,
          'actions', (
            SELECT json_agg(
              json_build_object(
                'id', ua.id,
                'action_type', ua.action_type,
                'action_data', ua.action_data,
                'result', ua.result,
                'executed_at', ua.executed_at
              )
            )
            FROM user_actions ua
            WHERE ua.detection_id = ptd.id
          )
        )
      ) FILTER (WHERE ptd.id IS NOT NULL) as detections
    FROM emails e
    LEFT JOIN power_toy_detections ptd ON e.id = ptd.email_id
    WHERE e.id = $1
    GROUP BY e.id;
  `;

  const result = await pool.query(query, [emailId]);
  return result.rows[0] || null;
}

/**
 * Get dashboard stats for a user
 */
export async function getDashboardStats(userEmail: string): Promise<any> {
  const query = `
    SELECT
      COUNT(DISTINCT e.id) as total_emails,
      COUNT(ptd.id) as total_detections,
      COUNT(ptd.id) FILTER (WHERE ptd.status = 'pending') as pending_detections,
      COUNT(ptd.id) FILTER (WHERE ptd.status = 'actioned') as actioned_detections,
      COUNT(ptd.id) FILTER (WHERE ptd.toy_type = 'follow_up') as follow_up_count,
      COUNT(ptd.id) FILTER (WHERE ptd.toy_type = 'kudos') as kudos_count,
      COUNT(ptd.id) FILTER (WHERE ptd.toy_type = 'task') as task_count,
      COUNT(ptd.id) FILTER (WHERE ptd.toy_type = 'urgent') as urgent_count
    FROM emails e
    LEFT JOIN power_toy_detections ptd ON e.id = ptd.email_id
    WHERE e.user_email = $1;
  `;

  const result = await pool.query(query, [userEmail]);
  return result.rows[0];
}

// ============================================================================
// DATABASE UTILITIES
// ============================================================================

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT NOW();');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Close all database connections
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('Database connection pool closed');
}

/**
 * Delete a specific detection by ID
 */
export async function deleteDetection(detectionId: number): Promise<void> {
  const query = 'DELETE FROM power_toy_detections WHERE id = $1;';
  await pool.query(query, [detectionId]);
}

/**
 * Clear all database data (emails, detections, actions)
 * WARNING: This will delete ALL data from the database!
 */
export async function clearAllData(): Promise<void> {
  // Delete in correct order due to foreign key constraints
  await pool.query('DELETE FROM user_actions;');
  await pool.query('DELETE FROM power_toy_detections;');
  await pool.query('DELETE FROM emails;');
}

// ============================================================================
// CUSTOM TOY FUNCTIONS
// ============================================================================

/**
 * Get all custom toys for a user
 */
export async function getCustomToys(userEmail: string): Promise<CustomToy[]> {
  const result = await pool.query(
    'SELECT * FROM custom_toys WHERE user_email = $1 ORDER BY created_at DESC',
    [userEmail]
  );
  return result.rows;
}

/**
 * Insert a new custom toy
 */
export async function insertCustomToy(toy: CustomToy): Promise<CustomToy> {
  const query = `
    INSERT INTO custom_toys (
      user_email, toy_name, toy_type, icon, user_description,
      action_type, action_config, is_builtin, enabled
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;

  const values = [
    toy.user_email,
    toy.toy_name,
    toy.toy_type || null,
    toy.icon,
    toy.user_description,
    toy.action_type,
    toy.action_config,
    toy.is_builtin || false,
    toy.enabled !== undefined ? toy.enabled : true
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Update a custom toy
 */
export async function updateCustomToy(id: number, toy: Partial<CustomToy>): Promise<CustomToy> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (toy.toy_name !== undefined) {
    fields.push(`toy_name = $${paramIndex++}`);
    values.push(toy.toy_name);
  }
  if (toy.toy_type !== undefined) {
    fields.push(`toy_type = $${paramIndex++}`);
    values.push(toy.toy_type);
  }
  if (toy.icon !== undefined) {
    fields.push(`icon = $${paramIndex++}`);
    values.push(toy.icon);
  }
  if (toy.user_description !== undefined) {
    fields.push(`user_description = $${paramIndex++}`);
    values.push(toy.user_description);
  }
  if (toy.action_type !== undefined) {
    fields.push(`action_type = $${paramIndex++}`);
    values.push(toy.action_type);
  }
  if (toy.action_config !== undefined) {
    fields.push(`action_config = $${paramIndex++}`);
    values.push(toy.action_config);
  }
  if (toy.is_builtin !== undefined) {
    fields.push(`is_builtin = $${paramIndex++}`);
    values.push(toy.is_builtin);
  }
  if (toy.enabled !== undefined) {
    fields.push(`enabled = $${paramIndex++}`);
    values.push(toy.enabled);
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const query = `
    UPDATE custom_toys
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Delete a custom toy
 */
export async function deleteCustomToy(id: number): Promise<void> {
  await pool.query('DELETE FROM custom_toys WHERE id = $1', [id]);
}

/**
 * Get a custom toy by ID
 */
export async function getCustomToyById(id: number): Promise<CustomToy | null> {
  const result = await pool.query('SELECT * FROM custom_toys WHERE id = $1', [id]);
  return result.rows[0] || null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { pool };
export default {
  // Email functions
  insertEmail,
  getEmailByGraphId,
  getEmailById,
  getRecentEmails,
  markEmailAsAnalyzed,

  // Detection functions
  insertDetection,
  getDetectionsByEmail,
  getPendingDetections,
  updateDetectionStatus,
  getDetectionById,
  deleteDetection,

  // Action functions
  insertUserAction,
  updateActionResult,
  getActionsByDetection,

  // Complex queries
  getEmailWithDetails,
  getDashboardStats,

  // Custom toy functions
  getCustomToys,
  insertCustomToy,
  updateCustomToy,
  deleteCustomToy,
  getCustomToyById,

  // Utilities
  testConnection,
  closePool,
  clearAllData
};
