import { useState, useEffect, useRef } from 'react';
import './App.css';
import type { Task, TaskFilters, TaskStats } from './types';
import TaskTable from './components/TaskTable';
import TaskCards from './components/TaskCards';
import FilterSidebar from './components/FilterSidebar';
import QuickAddForm from './components/QuickAddForm';

const API_BASE = '/api';
const DEFAULT_USER_EMAIL = 'heifets@merck.com';

function App() {
  // State
  const [userEmail] = useState(() => {
    return localStorage.getItem('userEmail') || DEFAULT_USER_EMAIL;
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [llmEnabled, setLLMEnabled] = useState(() => {
    const saved = localStorage.getItem('llmEnabled');
    return saved !== null ? saved === 'true' : true;
  });

  // Responsive detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Filters with localStorage persistence
  const [filters, setFilters] = useState<TaskFilters>(() => {
    const saved = localStorage.getItem('taskFilters');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      status: ['pending'],
      task_type: [],
      priority: [],
      source: [],
      timeframe: 'all',
      search: ''
    };
  });

  // SSE connection
  const eventSourceRef = useRef<EventSource | null>(null);
  const [sseConnected, setSSEConnected] = useState(false);

  // Responsive detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save filters to localStorage when changed
  useEffect(() => {
    localStorage.setItem('taskFilters', JSON.stringify(filters));
  }, [filters]);

  // Save LLM preference
  useEffect(() => {
    localStorage.setItem('llmEnabled', llmEnabled.toString());
  }, [llmEnabled]);

  // Fetch tasks
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      filters.status.forEach(s => params.append('status', s));
      filters.task_type.forEach(t => params.append('task_type', t));
      filters.priority.forEach(p => params.append('priority', p));
      filters.source.forEach(s => params.append('source', s));

      if (filters.timeframe !== 'all') {
        params.append('timeframe', filters.timeframe);
      }

      if (filters.search) {
        params.append('search', filters.search);
      }

      const response = await fetch(`${API_BASE}/tasks/${userEmail}?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();
      setTasks(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics (optional - non-blocking)
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${userEmail}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        // Stats endpoint failed, but don't block the app
        console.warn('Stats unavailable, continuing without them');
      }
    } catch (err) {
      console.warn('Error fetching stats (non-critical):', err);
    }
  };

  // Connect to SSE for real-time updates
  useEffect(() => {
    const connectSSE = () => {
      console.log('Connecting to SSE...');
      const eventSource = new EventSource('http://localhost:3200/api/events');

      eventSource.onopen = () => {
        console.log('SSE connected');
        setSSEConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('SSE event received:', data);

          if (data.type === 'task_created' || data.type === 'task_updated' ||
              data.type === 'task_completed' || data.type === 'task_deleted' ||
              data.type === 'task_snoozed' || data.type === 'tasks_bulk_update') {
            console.log('Task changed, refreshing...');
            fetchTasks();
            fetchStats();
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE error:', err);
        setSSEConnected(false);
        eventSource.close();

        // Reconnect after 5 seconds
        setTimeout(() => {
          console.log('Attempting to reconnect SSE...');
          connectSSE();
        }, 5000);
      };

      eventSourceRef.current = eventSource;
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        console.log('Closing SSE connection');
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Initial data load
  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, [filters]);

  // Task actions
  const handleCompleteTask = async (taskId: number) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}/complete`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to complete task');

      // Optimistic update
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: 'completed' as const, completed_at: new Date().toISOString() } : t
      ));
    } catch (err: any) {
      setError(err.message);
      console.error('Error completing task:', err);
    }
  };

  const handleSnoozeTask = async (taskId: number, duration: string) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration })
      });

      if (!response.ok) throw new Error('Failed to snooze task');

      await fetchTasks(); // Refresh to get updated snoozed_until
    } catch (err: any) {
      setError(err.message);
      console.error('Error snoozing task:', err);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete task');

      // Optimistic update
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err: any) {
      setError(err.message);
      console.error('Error deleting task:', err);
    }
  };

  const handleUpdateTask = async (taskId: number, updates: Partial<Task>) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to update task');

      const updatedTask = await response.json();
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating task:', err);
    }
  };

  const handleBulkComplete = async () => {
    if (selectedTaskIds.length === 0) return;

    try {
      const response = await fetch(`${API_BASE}/tasks/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_ids: selectedTaskIds,
          action: 'complete'
        })
      });

      if (!response.ok) throw new Error('Failed to bulk complete');

      setSelectedTaskIds([]);
      await fetchTasks();
    } catch (err: any) {
      setError(err.message);
      console.error('Error bulk completing tasks:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedTaskIds.length} tasks?`)) return;

    try {
      const response = await fetch(`${API_BASE}/tasks/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_ids: selectedTaskIds,
          action: 'delete'
        })
      });

      if (!response.ok) throw new Error('Failed to bulk delete');

      setSelectedTaskIds([]);
      await fetchTasks();
    } catch (err: any) {
      setError(err.message);
      console.error('Error bulk deleting tasks:', err);
    }
  };

  const handleTaskCreated = () => {
    fetchTasks();
    fetchStats();
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1>🎤 AI Task Manager</h1>
          <span className={`connection-status ${sseConnected ? 'connected' : 'disconnected'}`}>
            {sseConnected ? '🟢 Live' : '🔴 Offline'}
          </span>
        </div>
        <div className="header-right">
          <span className="user-email">{userEmail}</span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Filter Sidebar (Desktop only) */}
        {!isMobile && (
          <FilterSidebar
            filters={filters}
            onFiltersChange={setFilters}
            stats={stats}
          />
        )}

        {/* Main Content */}
        <div className="main-content">
          {/* Quick Add Form */}
          <QuickAddForm
            userEmail={userEmail}
            llmEnabled={llmEnabled}
            onLLMEnabledChange={setLLMEnabled}
            onTaskCreated={handleTaskCreated}
            searchValue={filters.search}
            onSearchChange={(search) => setFilters({ ...filters, search })}
            timeframe={filters.timeframe}
            onTimeframeChange={(timeframe) => setFilters({ ...filters, timeframe })}
          />

          {/* Error Banner */}
          {error && (
            <div className="error-banner">
              {error}
              <button onClick={() => setError(null)} className="close-btn">×</button>
            </div>
          )}

          {/* Bulk Actions Toolbar */}
          {selectedTaskIds.length > 0 && (
            <div className="bulk-actions-toolbar">
              <span>{selectedTaskIds.length} selected</span>
              <button onClick={handleBulkComplete} className="btn-bulk-complete">
                ✓ Complete All
              </button>
              <button onClick={handleBulkDelete} className="btn-bulk-delete">
                🗑 Delete All
              </button>
              <button onClick={() => setSelectedTaskIds([])} className="btn-clear">
                Clear Selection
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && <div className="loading">Loading tasks...</div>}

          {/* Tasks Display */}
          {!loading && (
            <>
              {isMobile ? (
                <TaskCards
                  tasks={tasks}
                  onComplete={handleCompleteTask}
                  onSnooze={handleSnoozeTask}
                  onDelete={handleDeleteTask}
                  onUpdate={handleUpdateTask}
                />
              ) : (
                <TaskTable
                  tasks={tasks}
                  selectedTaskIds={selectedTaskIds}
                  onSelectedChange={setSelectedTaskIds}
                  onComplete={handleCompleteTask}
                  onSnooze={handleSnoozeTask}
                  onDelete={handleDeleteTask}
                  onUpdate={handleUpdateTask}
                />
              )}
            </>
          )}

          {/* Empty State */}
          {!loading && tasks.length === 0 && (
            <div className="empty-state">
              <p>No tasks found</p>
              <p className="empty-hint">Create your first task using the form above!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
