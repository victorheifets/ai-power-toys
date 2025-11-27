import type { TaskFilters, TaskStats } from '../types';
import './FilterSidebar.css';

interface FilterSidebarProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  stats: TaskStats | null;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ filters, onFiltersChange, stats }) => {
  const handleStatusChange = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];

    onFiltersChange({ ...filters, status: newStatuses });
  };

  const handleToyTypeChange = (toyType: string) => {
    const newTypes = filters.task_type.includes(toyType)
      ? filters.task_type.filter(t => t !== toyType)
      : [...filters.task_type, toyType];

    onFiltersChange({ ...filters, task_type: newTypes });
  };

  const handlePriorityChange = (priority: string) => {
    const newPriorities = filters.priority.includes(priority)
      ? filters.priority.filter(p => p !== priority)
      : [...filters.priority, priority];

    onFiltersChange({ ...filters, priority: newPriorities });
  };

  const handleSourceChange = (source: string) => {
    const newSources = filters.source.includes(source)
      ? filters.source.filter(s => s !== source)
      : [...filters.source, source];

    onFiltersChange({ ...filters, source: newSources });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      status: ['pending'],
      task_type: [],
      priority: [],
      source: [],
      timeframe: 'all',
      search: ''
    });
  };

  const hasActiveFilters =
    filters.status.length !== 1 || filters.status[0] !== 'pending' ||
    filters.task_type.length > 0 ||
    filters.priority.length > 0 ||
    filters.source.length > 0 ||
    filters.timeframe !== 'all' ||
    filters.search !== '';

  return (
    <aside className="filter-sidebar">
      <div className="sidebar-header">
        <h2>Filters</h2>
        {hasActiveFilters && (
          <button className="btn-clear-filters" onClick={clearAllFilters}>
            Clear All
          </button>
        )}
      </div>

      {/* Statistics */}
      {stats && (
        <div className="filter-section stats-section">
          <h3>Overview</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{stats.pending_count}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.overdue_count}</span>
              <span className="stat-label overdue">Overdue</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.today_count}</span>
              <span className="stat-label">Today</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.completed_count}</span>
              <span className="stat-label">Done</span>
            </div>
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div className="filter-section">
        <h3>Status</h3>
        <label className="checkbox-label">
          <input type="checkbox" checked={filters.status.includes('pending')} onChange={() => handleStatusChange('pending')} />
          <span>Pending</span>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={filters.status.includes('completed')} onChange={() => handleStatusChange('completed')} />
          <span>Completed</span>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={filters.status.includes('snoozed')} onChange={() => handleStatusChange('snoozed')} />
          <span>Snoozed</span>
        </label>
      </div>

      {/* Priority Filter */}
      <div className="filter-section">
        <h3>Priority</h3>
        <label className="checkbox-label">
          <input type="checkbox" checked={filters.priority.includes('high')} onChange={() => handlePriorityChange('high')} />
          <span className="priority-high">🔴 High</span>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={filters.priority.includes('medium')} onChange={() => handlePriorityChange('medium')} />
          <span className="priority-medium">🟡 Medium</span>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={filters.priority.includes('low')} onChange={() => handlePriorityChange('low')} />
          <span className="priority-low">🟢 Low</span>
        </label>
      </div>

      {/* Type Filter */}
      <div className="filter-section">
        <h3>Type</h3>
        <label className="checkbox-label">
          <input type="checkbox" checked={filters.task_type.includes('follow_up')} onChange={() => handleToyTypeChange('follow_up')} />
          <span>📅 Follow-Up</span>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={filters.task_type.includes('task')} onChange={() => handleToyTypeChange('task')} />
          <span>✅ Task</span>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={filters.task_type.includes('urgent')} onChange={() => handleToyTypeChange('urgent')} />
          <span>⚠️ Urgent</span>
        </label>
      </div>

      {/* Source Filter */}
      <div className="filter-section">
        <h3>Source</h3>
        <label className="checkbox-label">
          <input type="checkbox" checked={filters.source.includes('email')} onChange={() => handleSourceChange('email')} />
          <span>📧 Email</span>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={filters.source.includes('manual')} onChange={() => handleSourceChange('manual')} />
          <span>✍️ Manual</span>
        </label>
      </div>
    </aside>
  );
};

export default FilterSidebar;
