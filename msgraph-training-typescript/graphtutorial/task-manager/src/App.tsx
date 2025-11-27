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
  const [showTestTasks, setShowTestTasks] = useState(false);

  // Sorting state
  type SortField = 'created_at' | 'title' | 'due_date' | 'priority';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  // Test task creation functions
  const createTestTask = async (toyType: string, title: string, description: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: userEmail,
          title,
          description,
          priority,
          status: 'pending',
          task_type: toyType,
          source: `test_${toyType}`
        })
      });

      if (!response.ok) throw new Error('Failed to create test task');

      await fetchTasks();
      setError(`✅ Test ${toyType} task created!`);
      setTimeout(() => setError(null), 3000);
    } catch (err: any) {
      setError(`❌ Error: ${err.message}`);
    }
  };

  const handleTestFollowUp = () => createTestTask('follow_up', 'Follow up on Q4 Planning Discussion', 'Review meeting notes and schedule follow-up discussion with team about Q4 planning items', 'medium');
  const handleTestTask = () => createTestTask('task', 'Review Q4 Planning Discussion notes', 'Go through meeting summary and action items from Q4 planning discussion', 'medium');
  const handleTestKudos = () => createTestTask('kudos', 'Recognition: Q4 Planning Presentation', 'Great work on the Q4 planning presentation! The team really appreciated your insights.', 'low');
  const handleTestUrgent = () => createTestTask('urgent', '🚨 URGENT: Q4 Budget Approval', 'Need your input on Q4 budget by EOD today. Review and approve budget proposal immediately.', 'high');
  const handleTestMeetingSummary = () => createTestTask('meeting_summary', 'Meeting Summary: Q4 Planning Discussion', 'Review and distribute meeting summary from Q4 planning session with action items and next steps', 'medium');
  const handleTestBlocker = () => createTestTask('blocker', '🚧 BLOCKER: Resource Allocation', 'Team member blocked on resource allocation for Q4 project. Needs manager approval to proceed.', 'high');

  const handleTaskCreated = () => {
    fetchTasks();
    fetchStats();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field - default to descending for dates, ascending for text
      setSortField(field);
      setSortDirection(field === 'created_at' || field === 'due_date' ? 'desc' : 'asc');
    }
  };

  // Sort tasks based on current sort settings
  const sortedTasks = [...tasks].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'due_date':
        // Handle null dates - put them at the end
        if (!a.due_date && !b.due_date) comparison = 0;
        else if (!a.due_date) comparison = 1;
        else if (!b.due_date) comparison = -1;
        else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        break;
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1>ClarityOS Tasker</h1>
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
        {/* Filter Sidebar (Desktop only, and only when there are tasks) */}
        {!isMobile && tasks.length > 0 && (
          <div style={{ position: 'relative' }}>
            <FilterSidebar
              filters={filters}
              onFiltersChange={setFilters}
              stats={stats}
            />
            {/* Hidden test button - small icon in bottom corner */}
            <button
              onClick={() => setShowTestTasks(!showTestTasks)}
              title={showTestTasks ? 'Hide Test Tasks' : 'Show Test Tasks'}
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                width: '32px',
                height: '32px',
                padding: '0',
                background: showTestTasks ? '#e74c3c' : 'transparent',
                color: showTestTasks ? 'white' : '#999',
                border: showTestTasks ? 'none' : '1px solid #ddd',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: showTestTasks ? 1 : 0.5,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = showTestTasks ? '1' : '0.5';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {showTestTasks ? '✕' : '🧪'}
            </button>
          </div>
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

          {/* Test Tasks Section - Hidden by default */}
          {showTestTasks && (
            <div style={{
              margin: '20px 0',
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#6264A7', fontSize: '16px' }}>
                🧪 Test Tasks
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '10px'
              }}>
                <button onClick={handleTestFollowUp} style={{
                  padding: '10px 15px',
                  background: '#6264A7',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  📤 Follow-Up
                </button>
                <button onClick={handleTestTask} style={{
                  padding: '10px 15px',
                  background: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  ✅ Task
                </button>
                <button onClick={handleTestKudos} style={{
                  padding: '10px 15px',
                  background: '#f39c12',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  🏆 Kudos
                </button>
                <button onClick={handleTestUrgent} style={{
                  padding: '10px 15px',
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  ⚠️ Urgent
                </button>
                <button onClick={handleTestMeetingSummary} style={{
                  padding: '10px 15px',
                  background: '#2ecc71',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  📝 Meeting Summary
                </button>
                <button onClick={handleTestBlocker} style={{
                  padding: '10px 15px',
                  background: '#e67e22',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  🚧 Blocker
                </button>
              </div>
              <p style={{
                margin: '10px 0 0 0',
                fontSize: '12px',
                color: '#666',
                fontStyle: 'italic'
              }}>
                Click any button to create a test task of that type
              </p>
            </div>
          )}

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
                  tasks={sortedTasks}
                  onComplete={handleCompleteTask}
                  onSnooze={handleSnoozeTask}
                  onDelete={handleDeleteTask}
                  onUpdate={handleUpdateTask}
                />
              ) : (
                <TaskTable
                  tasks={sortedTasks}
                  selectedTaskIds={selectedTaskIds}
                  onSelectedChange={setSelectedTaskIds}
                  onComplete={handleCompleteTask}
                  onSnooze={handleSnoozeTask}
                  onDelete={handleDeleteTask}
                  onUpdate={handleUpdateTask}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
