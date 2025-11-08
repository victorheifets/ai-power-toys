-- Migration: Create Separate Tasks Table
-- Date: 2025-11-08
-- Description: Creates dedicated tasks table separate from power_toy_detections

-- Drop existing tasks table if exists
DROP TABLE IF EXISTS tasks CASCADE;

-- Create new tasks table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,

    -- Task content
    title TEXT NOT NULL,
    notes TEXT,
    due_date TIMESTAMP,
    priority VARCHAR(10) DEFAULT 'medium',

    -- Task categorization
    task_type VARCHAR(50) DEFAULT 'manual', -- 'follow_up', 'task', 'urgent', 'kudos', 'manual'

    -- Task management
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'snoozed', 'dismissed'
    snoozed_until TIMESTAMP,
    completed_at TIMESTAMP,

    -- Source tracking
    source VARCHAR(20) DEFAULT 'manual', -- 'manual' or 'email'
    source_detection_id INTEGER, -- FK to power_toy_detections (if from email)
    source_email_id INTEGER, -- FK to emails (if from email)

    -- Voice/LLM data
    input_method VARCHAR(10), -- 'text' or 'voice'
    raw_input TEXT, -- Original user input
    llm_parsed_data JSONB, -- Full LLM extraction result
    mentioned_people TEXT[], -- Array of people mentioned
    tags TEXT[], -- Array of keywords/tags

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,

    -- Constraints
    CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high')),
    CONSTRAINT tasks_status_check CHECK (status IN ('pending', 'completed', 'snoozed', 'dismissed')),
    CONSTRAINT tasks_task_type_check CHECK (task_type IN ('follow_up', 'task', 'urgent', 'kudos', 'manual')),
    CONSTRAINT tasks_source_check CHECK (source IN ('manual', 'email')),
    CONSTRAINT tasks_input_method_check CHECK (input_method IN ('text', 'voice') OR input_method IS NULL),

    -- Foreign keys
    CONSTRAINT tasks_detection_fk FOREIGN KEY (source_detection_id)
        REFERENCES power_toy_detections(id) ON DELETE SET NULL,
    CONSTRAINT tasks_email_fk FOREIGN KEY (source_email_id)
        REFERENCES emails(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_tasks_user_email ON tasks(user_email);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL AND is_deleted = false;
CREATE INDEX idx_tasks_snoozed ON tasks(snoozed_until) WHERE snoozed_until IS NOT NULL AND status = 'snoozed' AND is_deleted = false;
CREATE INDEX idx_tasks_completed ON tasks(completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_source ON tasks(source);
CREATE INDEX idx_tasks_task_type ON tasks(task_type);
CREATE INDEX idx_tasks_not_deleted ON tasks(is_deleted) WHERE is_deleted = false;
CREATE INDEX idx_tasks_created ON tasks(created_at DESC);

-- Full-text search indexes
CREATE INDEX idx_tasks_title_search ON tasks USING gin(to_tsvector('english', COALESCE(title, '')));
CREATE INDEX idx_tasks_notes_search ON tasks USING gin(to_tsvector('english', COALESCE(notes, '')));

-- Trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE tasks IS 'Persistent tasks that users need to track and complete. Separate from power_toy_detections which are one-time action suggestions.';
COMMENT ON COLUMN tasks.source IS 'Where task came from: manual (user created) or email (converted from detection)';
COMMENT ON COLUMN tasks.source_detection_id IS 'Links to original power_toy_detection if task was created from email';
COMMENT ON COLUMN tasks.task_type IS 'Type of task, matches power toy types for consistency';
COMMENT ON COLUMN tasks.raw_input IS 'Original natural language input before LLM parsing (for manual tasks)';
COMMENT ON COLUMN tasks.llm_parsed_data IS 'Full LLM extraction including entities, people, tags, confidence';
COMMENT ON COLUMN tasks.mentioned_people IS 'Array of people mentioned (e.g., ["Yan", "Sarah"])';
COMMENT ON COLUMN tasks.tags IS 'Array of extracted keywords (e.g., ["work plan", "meeting"])';

-- Insert sample test data
INSERT INTO tasks (user_email, title, due_date, priority, source, task_type, status) VALUES
('heifets@merck.com', 'Call Yan about work plan', NOW() + INTERVAL '7 days', 'high', 'manual', 'manual', 'pending');

INSERT INTO tasks (user_email, title, due_date, priority, source, task_type, status, raw_input, input_method, mentioned_people, tags) VALUES
('heifets@merck.com', 'Review project proposal', NOW() + INTERVAL '2 days', 'medium', 'manual', 'task', 'pending',
 'review project proposal by wednesday', 'text', ARRAY['team'], ARRAY['project', 'proposal']);

INSERT INTO tasks (user_email, title, due_date, priority, source, task_type, status, notes) VALUES
('heifets@merck.com', 'Prepare Q3 presentation', NOW() + INTERVAL '1 day', 'high', 'manual', 'task', 'pending',
 'Include sales data and market analysis');

INSERT INTO tasks (user_email, title, priority, source, task_type, status) VALUES
('heifets@merck.com', 'Buy groceries', 'low', 'manual', 'manual', 'pending');

-- Example of task created from email detection
-- (Assuming detection id 1 exists from power_toy_detections)
INSERT INTO tasks (user_email, title, due_date, priority, source, source_detection_id, task_type, status) VALUES
('heifets@merck.com', 'Send Q4 report to boss', '2025-11-15 17:00:00', 'high', 'email', 1, 'follow_up', 'pending');

COMMENT ON COLUMN tasks.source_detection_id IS 'References the power_toy_detection that suggested this task (if applicable)';
COMMENT ON COLUMN tasks.source_email_id IS 'References the original email (if task came from email)';
