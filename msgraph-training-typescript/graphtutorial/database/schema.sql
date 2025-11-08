-- AI Power Toys Database Schema
-- PostgreSQL 15+

-- Drop existing tables (for development)
DROP TABLE IF EXISTS user_actions CASCADE;
DROP TABLE IF EXISTS power_toy_detections CASCADE;
DROP TABLE IF EXISTS custom_toys CASCADE;
DROP TABLE IF EXISTS emails CASCADE;

-- Emails table
CREATE TABLE emails (
    id SERIAL PRIMARY KEY,
    graph_message_id VARCHAR(255) UNIQUE NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    subject TEXT,
    body_preview TEXT,
    body_content TEXT,
    received_at TIMESTAMP NOT NULL,
    analyzed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    CONSTRAINT emails_graph_id_unique UNIQUE (graph_message_id)
);

CREATE INDEX idx_emails_user ON emails(user_email);
CREATE INDEX idx_emails_received ON emails(received_at DESC);
CREATE INDEX idx_emails_analyzed ON emails(analyzed_at) WHERE analyzed_at IS NOT NULL;

-- Power Toy Detections table
CREATE TABLE power_toy_detections (
    id SERIAL PRIMARY KEY,
    email_id INTEGER NOT NULL,
    toy_type VARCHAR(50) NOT NULL, -- 'follow_up', 'kudos', 'task', 'urgent'
    detection_data JSONB NOT NULL,  -- Flexible schema per toy type
    confidence_score DECIMAL(3,2),  -- 0.00 to 1.00
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'actioned', 'dismissed', 'snoozed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT detections_email_fk FOREIGN KEY (email_id)
        REFERENCES emails(id) ON DELETE CASCADE,
    CONSTRAINT detections_status_check CHECK (
        status IN ('pending', 'actioned', 'dismissed', 'snoozed')
    ),
    CONSTRAINT detections_toy_type_check CHECK (
        toy_type IN ('follow_up', 'kudos', 'task', 'urgent')
    )
);

CREATE INDEX idx_detections_email ON power_toy_detections(email_id);
CREATE INDEX idx_detections_status ON power_toy_detections(status);
CREATE INDEX idx_detections_toy_type ON power_toy_detections(toy_type);
CREATE INDEX idx_detections_created ON power_toy_detections(created_at DESC);

-- User Actions table
CREATE TABLE user_actions (
    id SERIAL PRIMARY KEY,
    detection_id INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'add_task', 'add_calendar', 'send_inspire', 'dismiss', 'snooze'
    action_data JSONB,  -- Details about the action taken
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    result VARCHAR(20) DEFAULT 'pending', -- 'success', 'failed', 'pending'
    error_message TEXT,

    CONSTRAINT actions_detection_fk FOREIGN KEY (detection_id)
        REFERENCES power_toy_detections(id) ON DELETE CASCADE,
    CONSTRAINT actions_result_check CHECK (
        result IN ('success', 'failed', 'pending')
    )
);

CREATE INDEX idx_actions_detection ON user_actions(detection_id);
CREATE INDEX idx_actions_executed ON user_actions(executed_at DESC);
CREATE INDEX idx_actions_result ON user_actions(result);

-- Custom Toys table
CREATE TABLE custom_toys (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    toy_name VARCHAR(255) NOT NULL,
    toy_type VARCHAR(50), -- 'follow_up', 'kudos', 'task', 'urgent', or NULL for custom
    icon VARCHAR(10) DEFAULT '⏰',
    user_description TEXT NOT NULL, -- Natural language description stored as-is
    action_type VARCHAR(50) NOT NULL, -- 'open_url', 'create_task', 'create_calendar', etc.
    action_config JSONB NOT NULL, -- Button label, URL, etc.
    is_builtin BOOLEAN DEFAULT false, -- True for system-provided toys
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_custom_toys_user ON custom_toys(user_email);
CREATE INDEX idx_custom_toys_enabled ON custom_toys(enabled) WHERE enabled = true;
CREATE INDEX idx_custom_toys_created ON custom_toys(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for power_toy_detections updated_at
CREATE TRIGGER update_detections_updated_at
    BEFORE UPDATE ON power_toy_detections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for custom_toys updated_at
CREATE TRIGGER update_custom_toys_updated_at
    BEFORE UPDATE ON custom_toys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some test data
INSERT INTO emails (graph_message_id, user_email, from_email, subject, body_preview, body_content, received_at) VALUES
('test-msg-001', 'heifets@merck.com', 'boss@merck.com', 'Q4 Report - Great work!', 'Great work on the Q4 report! Please send me the final version by Friday.', 'Great work on the Q4 report! Please send me the final version by Friday. Also, can you add this to the project tracker?', NOW() - INTERVAL '2 hours');

INSERT INTO emails (graph_message_id, user_email, from_email, subject, body_preview, body_content, received_at) VALUES
('test-msg-002', 'heifets@merck.com', 'colleague@merck.com', 'Meeting Tomorrow', 'Dont forget our meeting tomorrow at 2pm', 'Dont forget our meeting tomorrow at 2pm. Please prepare the slides and send them by tonight if possible.', NOW() - INTERVAL '1 hour');

-- Test: Insert detections for first email (multiple toys)
INSERT INTO power_toy_detections (email_id, toy_type, detection_data, confidence_score, status) VALUES
(1, 'kudos', '{"achievement": "Q4 report completion", "person": "user", "suggested_action": "Share achievement"}', 0.85, 'pending');

INSERT INTO power_toy_detections (email_id, toy_type, detection_data, confidence_score, status) VALUES
(1, 'follow_up', '{"action": "Send final version", "deadline": "2025-11-08T17:00:00Z", "priority": "high"}', 0.92, 'pending');

INSERT INTO power_toy_detections (email_id, toy_type, detection_data, confidence_score, status) VALUES
(1, 'task', '{"task_description": "Add Q4 report to project tracker", "priority": "medium"}', 0.78, 'pending');

-- Test: Insert detection for second email
INSERT INTO power_toy_detections (email_id, toy_type, detection_data, confidence_score, status) VALUES
(2, 'follow_up', '{"action": "Prepare slides for meeting", "deadline": "2025-11-07T23:00:00Z", "priority": "high"}', 0.88, 'pending');

INSERT INTO power_toy_detections (email_id, toy_type, detection_data, confidence_score, status) VALUES
(2, 'urgent', '{"reason": "Meeting tomorrow", "deadline": "2025-11-08T14:00:00Z", "action_needed": "Prepare and send slides"}', 0.91, 'pending');

-- Grant permissions (for local dev)
-- In production, use Row-Level Security

COMMENT ON TABLE emails IS 'Stores email messages received via Graph API webhooks';
COMMENT ON TABLE power_toy_detections IS 'Stores AI-detected patterns and suggested actions for each email';
COMMENT ON TABLE user_actions IS 'Tracks user responses to Power Toy suggestions';
COMMENT ON TABLE custom_toys IS 'User-defined custom Power Toys with AI-driven natural language detection';

COMMENT ON COLUMN power_toy_detections.detection_data IS 'JSON structure varies by toy_type. Examples:
- follow_up: {"action": "...", "deadline": "...", "priority": "..."}
- kudos: {"achievement": "...", "person": "...", "suggested_action": "..."}
- task: {"task_description": "...", "priority": "..."}
- urgent: {"reason": "...", "deadline": "...", "action_needed": "..."}';

COMMENT ON COLUMN user_actions.action_data IS 'JSON structure varies by action_type. Examples:
- add_calendar: {"event_title": "...", "event_date": "...", "calendar_id": "..."}
- add_task: {"task_title": "...", "due_date": "...", "task_app_id": "..."}
- send_inspire: {"recipient": "...", "message": "...", "inspire_id": "..."}';

COMMENT ON COLUMN custom_toys.user_description IS 'User''s exact natural language description of what to detect, stored as-is for runtime LLM interpretation';
COMMENT ON COLUMN custom_toys.action_config IS 'JSON structure with button_label and optional url. Example: {"button_label": "🌐 Open Portal", "url": "https://..."}';
