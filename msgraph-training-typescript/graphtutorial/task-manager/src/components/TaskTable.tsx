import { useState } from 'react';
import type { Task } from '../types';
import './TaskTable.css';

type SortField = 'created_at' | 'title' | 'due_date' | 'priority';
type SortDirection = 'asc' | 'desc';

interface TaskTableProps {
  tasks: Task[];
  selectedTaskIds: number[];
  onSelectedChange: (ids: number[]) => void;
  onComplete: (taskId: number) => void;
  onSnooze: (taskId: number, duration: string) => void;
  onDelete: (taskId: number) => void;
  onUpdate: (taskId: number, updates: Partial<Task>) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  selectedTaskIds,
  onSelectedChange,
  onComplete,
  onSnooze,
  onDelete,
  onUpdate,
  sortField,
  sortDirection,
  onSort
}) => {
  const [editingTitle, setEditingTitle] = useState<number | null>(null);
  const [titleValue, setTitleValue] = useState('');
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

  const startTitleEdit = (task: Task) => {
    setEditingTitle(task.id);
    setTitleValue(task.title);
  };

  const saveTitleEdit = (taskId: number) => {
    if (titleValue.trim()) {
      onUpdate(taskId, { title: titleValue.trim() });
    }
    setEditingTitle(null);
  };

  const addPerson = (task: Task) => {
    const name = prompt('Enter person name:');
    if (name && name.trim()) {
      const people = [...(task.mentioned_people || []), name.trim()];
      onUpdate(task.id, { mentioned_people: people });
    }
  };

  const removePerson = (task: Task, person: string) => {
    const people = (task.mentioned_people || []).filter(p => p !== person);
    onUpdate(task.id, { mentioned_people: people.length > 0 ? people : null });
  };

  const addTag = (task: Task) => {
    const tag = prompt('Enter tag (without #):');
    if (tag && tag.trim()) {
      const tags = [...(task.tags || []), tag.trim().replace('#', '')];
      onUpdate(task.id, { tags });
    }
  };

  const removeTag = (task: Task, tag: string) => {
    const tags = (task.tags || []).filter(t => t !== tag);
    onUpdate(task.id, { tags: tags.length > 0 ? tags : null });
  };

  const handleSnooze = (taskId: number, duration: string) => {
    onSnooze(taskId, duration);
    setShowSnoozeMenu(null);
  };

  const handleDelete = (taskId: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      onDelete(taskId);
    }
  };

  const formatCreatedDate = (dateStr: string | null) => {
    if (!dateStr) return 'No date';
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

    if (isToday) return timeStr;
    if (isYesterday) return 'Yesterday';

    // Format as DD/MM/YY
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status !== 'pending') return false;
    return new Date(task.due_date) < new Date();
  };

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return ' ↕';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  const renderSortableHeader = (field: SortField, label: string, className: string) => {
    return (
      <th className={className} onClick={() => onSort(field)} style={{ cursor: 'pointer', userSelect: 'none' }}>
        {label}{getSortIndicator(field)}
      </th>
    );
  };

  return (
    <div className="task-table-container">
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
            {renderSortableHeader('title', 'Title', 'col-title')}
            <th className="col-people">People</th>
            <th className="col-tags">Tags</th>
            <th className="col-type">Type</th>
            {renderSortableHeader('priority', 'Priority', 'col-priority')}
            {renderSortableHeader('due_date', 'Due Date', 'col-due-date')}
            {renderSortableHeader('created_at', 'Created', 'col-created')}
            <th className="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={9} className="empty-table-message">
                No tasks to display
              </td>
            </tr>
          ) : (
            tasks.map(task => (
            <tr
              key={task.id}
              className={`${selectedTaskIds.includes(task.id) ? 'selected' : ''} ${task.status === 'completed' ? 'completed' : ''}`}
            >
              <td className="col-checkbox">
                <input
                  type="checkbox"
                  checked={selectedTaskIds.includes(task.id)}
                  onChange={() => handleSelectTask(task.id)}
                />
              </td>

              {/* Title - Click to Edit */}
              <td className="col-title">
                <div
                  className={`editable-field ${editingTitle === task.id ? 'editing' : ''}`}
                  onClick={() => editingTitle !== task.id && startTitleEdit(task)}
                >
                  {editingTitle === task.id ? (
                    <input
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                      onBlur={() => saveTitleEdit(task.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveTitleEdit(task.id);
                        if (e.key === 'Escape') setEditingTitle(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className={task.status === 'completed' ? 'completed-text' : ''}>
                      {task.title}
                    </span>
                  )}
                </div>
                {task.notes && <div className="task-notes">{task.notes}</div>}
              </td>

              {/* People - Editable Tags */}
              <td className="col-people">
                <div className="people-list-editable">
                  {task.mentioned_people?.map((person, idx) => (
                    <span key={idx} className="person-tag">
                      {person}
                      <button onClick={() => removePerson(task, person)}>×</button>
                    </span>
                  ))}
                  <button className="add-person-btn" onClick={() => addPerson(task)}>
                    + Person
                  </button>
                </div>
              </td>

              {/* Tags - Editable */}
              <td className="col-tags">
                <div className="tags-list-editable">
                  {task.tags?.map((tag, idx) => (
                    <span key={idx} className="tag-editable">
                      #{tag}
                      <button onClick={() => removeTag(task, tag)}>×</button>
                    </span>
                  ))}
                  <button className="add-tag-btn" onClick={() => addTag(task)}>
                    + Tag
                  </button>
                </div>
              </td>

              {/* Type - Dropdown */}
              <td className="col-type">
                <select
                  className="type-select"
                  value={task.task_type}
                  onChange={(e) => onUpdate(task.id, { task_type: e.target.value as Task['task_type'] })}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  <option value="follow_up">📅 Follow-Up</option>
                  <option value="task">✅ Task</option>
                  <option value="urgent">⚠️ Urgent</option>
                  <option value="kudos">🏆 Kudos</option>
                  <option value="manual">📝 Manual</option>
                  <option value="meeting_summary">📝 Meeting Summary</option>
                  <option value="blocker">🚧 Blocker</option>
                </select>
              </td>

              {/* Priority - Dropdown */}
              <td className="col-priority">
                <select
                  className={`priority-select priority-${task.priority}`}
                  value={task.priority}
                  onChange={(e) => onUpdate(task.id, { priority: e.target.value as 'low' | 'medium' | 'high' })}
                >
                  <option value="low">🟢 LOW</option>
                  <option value="medium">🟡 MEDIUM</option>
                  <option value="high">🔴 HIGH</option>
                </select>
              </td>

              {/* Due Date - Date Picker */}
              <td className="col-due-date">
                <input
                  type="date"
                  className={`date-input ${isOverdue(task) ? 'overdue' : ''}`}
                  value={task.due_date ? task.due_date.split('T')[0] : ''}
                  onChange={(e) => onUpdate(task.id, { due_date: e.target.value || null })}
                />
                {isOverdue(task) && <span className="overdue"> (Overdue)</span>}
              </td>

              {/* Created Date */}
              <td className="col-created">
                {formatCreatedDate(task.created_at)}
              </td>

              {/* Actions */}
              <td className="col-actions">
                <div className="action-buttons">
                  <button
                    className="btn-action btn-complete"
                    onClick={() => onComplete(task.id)}
                    title="Complete"
                  >
                    Complete
                  </button>

                  <div className="snooze-wrapper">
                    <button
                      className="btn-action btn-snooze"
                      onClick={() => setShowSnoozeMenu(showSnoozeMenu === task.id ? null : task.id)}
                      title="Snooze"
                    >
                      Snooze
                    </button>
                    {showSnoozeMenu === task.id && (
                      <div className="snooze-menu">
                        <button onClick={() => handleSnooze(task.id, '1h')}>1 hour</button>
                        <button onClick={() => handleSnooze(task.id, '4h')}>4 hours</button>
                        <button onClick={() => handleSnooze(task.id, 'tomorrow')}>Tomorrow</button>
                        <button onClick={() => handleSnooze(task.id, 'next_week')}>Next week</button>
                      </div>
                    )}
                  </div>

                  <button
                    className="btn-action btn-delete"
                    onClick={() => handleDelete(task.id)}
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TaskTable;
