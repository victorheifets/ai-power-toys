-- Seed built-in Power Toys for users
-- This creates default configurations that users can customize

-- Insert built-in toys for heifets@merck.com
INSERT INTO custom_toys (user_email, toy_name, toy_type, icon, user_description, action_type, action_config, is_builtin, enabled)
VALUES
(
  'heifets@merck.com',
  'Follow-up',
  'follow_up',
  '📅',
  'Detect emails containing explicit tasks assigned to specific people with deadlines or action items that require follow-up. Look for phrases like "please do", "can you", "by [date]", or mentions of specific assignees.',
  'create_task',
  '{"button_label": "✅ Add to Tasks"}',
  true,
  true
),
(
  'heifets@merck.com',
  'Kudos',
  'kudos',
  '🏆',
  'Recognize emails mentioning achievements, good work, congratulations, appreciation, or praise for team members. Look for words like "great job", "well done", "congratulations", "excellent work".',
  'flag_important',
  '{"button_label": "🏆 Save Recognition"}',
  true,
  true
),
(
  'heifets@merck.com',
  'Task',
  'task',
  '✅',
  'Identify actionable items in emails with keywords like "please do", "can you", "need to", "action required", or "to-do".',
  'create_task',
  '{"button_label": "✅ Create Task"}',
  true,
  true
),
(
  'heifets@merck.com',
  'Urgent',
  'urgent',
  '⚠️',
  'Flag urgent requests containing keywords like "urgent", "ASAP", "immediately", "critical", "high priority", or "time-sensitive".',
  'flag_important',
  '{"button_label": "⚠️ Mark Urgent"}',
  true,
  true
)
ON CONFLICT DO NOTHING;
