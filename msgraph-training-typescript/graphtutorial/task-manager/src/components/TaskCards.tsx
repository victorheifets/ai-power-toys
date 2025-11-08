import { useState } from 'react';
import type { Task } from '../types';
import './TaskCards.css';

interface TaskCardsProps {
  tasks: Task[];
  onComplete: (taskId: number) => void;
  onSnooze: (taskId: number, duration: string) => void;
  onDelete: (taskId: number) => void;
  onUpdate: (taskId: number, updates: Partial<Task>) => void;
}

const TaskCards: React.FC<TaskCardsProps> = ({
  tasks,
  onComplete,
  onSnooze,
  onDelete,
  onUpdate
}) => {
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState<number | null>(null);

  const getTaskTypeEmoji = (type: string): string => {
    switch (type) {
      case 'follow_up': return '📅';
      case 'kudos': return '🏆';
      case 'task': return '✅';
      case 'urgent': return '⚠️';
      case 'manual': return '📝';
      default: return '📌';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const formatDueDate = (dueDate: string | null | undefined): string => {
    if (!dueDate) return 'No due date';

    const date = new Date(dueDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date < now && date.toDateString() !== now.toDateString()) {
      return '🔴 Overdue';
    } else if (date.toDateString() === today.toDateString()) {
      return '📅 Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return '📅 Tomorrow';
    } else {
      return '📅 ' + date.toLocaleDateString();
    }
  };

  const getSourceLabel = (task: Task): string => {
    if (task.source === 'email') {
      return `📧 ${task.email_from || 'Email'}`;
    }
    return task.input_method === 'voice' ? '🎤 Voice' : '⌨️ Manual';
  };

  const toggleExpand = (taskId: number) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  return (
    <div className="task-cards-container">
      {tasks.length === 0 ? (
        <div className="no-tasks-mobile">No tasks to display</div>
      ) : (
        tasks.map((task) => (
          <div
            key={task.id}
            className={`task-card ${task.status} ${expandedTaskId === task.id ? 'expanded' : ''}`}
            style={{ borderLeftColor: getPriorityColor(task.priority) }}
          >
            {/* Card Header */}
            <div className="card-header" onClick={() => toggleExpand(task.id)}>
              <div className="card-title-row">
                <span className="task-type-emoji">{getTaskTypeEmoji(task.task_type)}</span>
                <h3 className={task.status === 'completed' ? 'completed-text' : ''}>
                  {task.title}
                </h3>
              </div>
              <button className="expand-btn">
                {expandedTaskId === task.id ? '▼' : '▶'}
              </button>
            </div>

            {/* Card Meta */}
            <div className="card-meta">
              <span className="meta-item due-date">
                {formatDueDate(task.due_date)}
              </span>
              <span className="meta-item priority" style={{ color: getPriorityColor(task.priority) }}>
                {task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'}
                {task.priority}
              </span>
              <span className="meta-item source">
                {getSourceLabel(task)}
              </span>
            </div>

            {/* Expanded Content */}
            {expandedTaskId === task.id && (
              <div className="card-details">
                {task.notes && (
                  <div className="detail-section">
                    <strong>Notes:</strong>
                    <p>{task.notes}</p>
                  </div>
                )}

                {task.tags && task.tags.length > 0 && (
                  <div className="detail-section">
                    <strong>Tags:</strong>
                    <div className="tags-list">
                      {task.tags.map((tag, idx) => (
                        <span key={idx} className="tag">#{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {task.mentioned_people && task.mentioned_people.length > 0 && (
                  <div className="detail-section">
                    <strong>People:</strong>
                    <div className="people-list">
                      {task.mentioned_people.map((person, idx) => (
                        <span key={idx} className="person">👤 {person}</span>
                      ))}
                    </div>
                  </div>
                )}

                {task.source === 'email' && task.email_subject && (
                  <div className="detail-section">
                    <strong>Email:</strong>
                    <p className="email-subject">{task.email_subject}</p>
                    {task.email_body_preview && (
                      <p className="email-preview">{task.email_body_preview}</p>
                    )}
                  </div>
                )}

                {task.raw_input && (
                  <div className="detail-section">
                    <strong>Original input:</strong>
                    <p className="raw-input">"{task.raw_input}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="card-actions">
              {task.status === 'pending' && (
                <>
                  <button
                    onClick={() => onComplete(task.id)}
                    className="btn-card-action btn-complete"
                  >
                    ✓ Complete
                  </button>

                  <div className="snooze-wrapper-mobile">
                    <button
                      onClick={() => setShowSnoozeMenu(showSnoozeMenu === task.id ? null : task.id)}
                      className="btn-card-action btn-snooze"
                    >
                      ⏰ Snooze
                    </button>
                    {showSnoozeMenu === task.id && (
                      <div className="snooze-menu-mobile">
                        <button onClick={() => { onSnooze(task.id, '1h'); setShowSnoozeMenu(null); }}>
                          1 hour
                        </button>
                        <button onClick={() => { onSnooze(task.id, '4h'); setShowSnoozeMenu(null); }}>
                          4 hours
                        </button>
                        <button onClick={() => { onSnooze(task.id, 'tomorrow'); setShowSnoozeMenu(null); }}>
                          Tomorrow
                        </button>
                        <button onClick={() => { onSnooze(task.id, 'next_week'); setShowSnoozeMenu(null); }}>
                          Next week
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              <button
                onClick={() => onDelete(task.id)}
                className="btn-card-action btn-delete"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default TaskCards;
