import { useState } from 'react';
import type { Task } from '../types';
import './TaskTable.css';

interface TaskTableProps {
  tasks: Task[];
  selectedTaskIds: number[];
  onSelectedChange: (ids: number[]) => void;
  onComplete: (taskId: number) => void;
  onSnooze: (taskId: number, duration: string) => void;
  onDelete: (taskId: number) => void;
  onUpdate: (taskId: number, updates: Partial<Task>) => void;
}

const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  selectedTaskIds,
  onSelectedChange,
  onComplete,
  onSnooze,
  onDelete,
  onUpdate
}) => {
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [showSnoozeMenu, setShowSnoozeMenu] = useState<number | null>(null);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onSelectedChange(tasks.map(t => t.id));
    } else {
      onSelectedChange([]);
    }
  };

  const handleSelectTask = (taskId: number) => {
    if (selectedTaskIds.includes(taskId)) {
      onSelectedChange(selectedTaskIds.filter(id => id !== taskId));
    } else {
      onSelectedChange([...selectedTaskIds, taskId]);
    }
  };

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditedTitle(task.title);
  };

  const saveEdit = (taskId: number) => {
    onUpdate(taskId, { title: editedTitle });
    setEditingTaskId(null);
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditedTitle('');
  };

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

  const getTaskTypeLabel = (type: string): string => {
    switch (type) {
      case 'follow_up': return 'Follow-Up';
      case 'kudos': return 'Kudos';
      case 'task': return 'Task';
      case 'urgent': return 'Urgent';
      case 'manual': return 'Manual';
      default: return type;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const classes = `priority-badge priority-${priority}`;
    const emoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
    return <span className={classes}>{emoji} {priority}</span>;
  };

  const formatDueDate = (dueDate: string | null | undefined): string => {
    if (!dueDate) return 'No date';

    const date = new Date(dueDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date < now && date.toDateString() !== now.toDateString()) {
      return '🔴 Overdue';
    } else if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getSourceLabel = (task: Task): string => {
    if (task.source === 'email') {
      return task.email_from || 'Email';
    }
    return task.input_method === 'voice' ? '🎤 Voice' : '⌨️ Manual';
  };

  return (
    <div className="task-table-container">
      {tasks.length === 0 ? (
        <div className="no-tasks">No tasks to display</div>
      ) : (
        <table className="task-table">
          <thead>
            <tr>
              <th className="col-checkbox">
                <input
                  type="checkbox"
                  checked={selectedTaskIds.length === tasks.length && tasks.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="col-title">Title</th>
              <th className="col-type">Type</th>
              <th className="col-priority">Priority</th>
              <th className="col-due">Due Date</th>
              <th className="col-from">From</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                className={`task-row ${task.status} ${selectedTaskIds.includes(task.id) ? 'selected' : ''}`}
              >
                <td className="col-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.includes(task.id)}
                    onChange={() => handleSelectTask(task.id)}
                  />
                </td>
                <td className="col-title">
                  {editingTaskId === task.id ? (
                    <div className="edit-mode">
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(task.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                      />
                      <button onClick={() => saveEdit(task.id)} className="btn-save">✓</button>
                      <button onClick={cancelEdit} className="btn-cancel">✕</button>
                    </div>
                  ) : (
                    <div className="title-cell">
                      <span className={task.status === 'completed' ? 'completed-text' : ''}>
                        {task.title}
                      </span>
                      {task.notes && (
                        <div className="task-notes">{task.notes}</div>
                      )}
                      {task.tags && task.tags.length > 0 && (
                        <div className="task-tags">
                          {task.tags.map((tag, idx) => (
                            <span key={idx} className="tag">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="col-type">
                  <span className="type-badge">
                    {getTaskTypeEmoji(task.task_type)} {getTaskTypeLabel(task.task_type)}
                  </span>
                </td>
                <td className="col-priority">
                  {getPriorityBadge(task.priority)}
                </td>
                <td className="col-due">
                  <span className={task.due_date && new Date(task.due_date) < new Date() ? 'overdue' : ''}>
                    {formatDueDate(task.due_date)}
                  </span>
                </td>
                <td className="col-from">
                  {getSourceLabel(task)}
                </td>
                <td className="col-actions">
                  <div className="action-buttons">
                    {task.status === 'pending' && (
                      <>
                        <button
                          onClick={() => onComplete(task.id)}
                          className="btn-action btn-complete"
                          title="Complete"
                        >
                          ✓
                        </button>
                        <div className="snooze-wrapper">
                          <button
                            onClick={() => setShowSnoozeMenu(showSnoozeMenu === task.id ? null : task.id)}
                            className="btn-action btn-snooze"
                            title="Snooze"
                          >
                            ⏰
                          </button>
                          {showSnoozeMenu === task.id && (
                            <div className="snooze-menu">
                              <button onClick={() => { onSnooze(task.id, '1h'); setShowSnoozeMenu(null); }}>1 hour</button>
                              <button onClick={() => { onSnooze(task.id, '4h'); setShowSnoozeMenu(null); }}>4 hours</button>
                              <button onClick={() => { onSnooze(task.id, 'tomorrow'); setShowSnoozeMenu(null); }}>Tomorrow</button>
                              <button onClick={() => { onSnooze(task.id, 'next_week'); setShowSnoozeMenu(null); }}>Next week</button>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => startEdit(task)}
                          className="btn-action btn-edit"
                          title="Edit"
                        >
                          ✏️
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => onDelete(task.id)}
                      className="btn-action btn-delete"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TaskTable;
