import { useState, useEffect, useCallback } from 'react';
import './App.css';

// Hooks
import { useUser, useFilters, useTasks, useSorting, useSSE, useResponsive } from './hooks';

// Components
import TaskTable from './components/TaskTable';
import TaskCards from './components/TaskCards';
import FilterSidebar from './components/FilterSidebar';
import QuickAddForm from './components/QuickAddForm';
import TestTasksPanel from './components/TestTasksPanel';

function App() {
  // User state
  const { userEmail, llmEnabled, setLLMEnabled } = useUser();

  // Filter state with persistence
  const { filters, setFilters, setSearch, setTimeframe } = useFilters();

  // Task state and operations
  const {
    tasks,
    stats,
    loading,
    error,
    selectedTaskIds,
    setSelectedTaskIds,
    clearError,
    fetchTasks,
    fetchStats,
    refreshData,
    completeTask,
    snoozeTask,
    deleteTask,
    updateTask,
    bulkComplete,
    bulkDelete,
    createTestTask,
    clearSelection
  } = useTasks(userEmail);

  // Sorting
  const { sortField, sortDirection, handleSort, sortedTasks } = useSorting(tasks);

  // Responsive
  const { isMobile } = useResponsive();

  // Test tasks panel visibility
  const [showTestTasks, setShowTestTasks] = useState(false);

  // SSE connection for real-time updates
  const { connected: sseConnected } = useSSE({
    onTaskEvent: useCallback(() => {
      refreshData(filters);
    }, [refreshData, filters])
  });

  // Initial data load
  useEffect(() => {
    fetchTasks(filters);
    fetchStats();
  }, [filters, fetchTasks, fetchStats]);

  // Task action handlers that need filters
  const handleSnooze = useCallback((taskId: number, duration: string) => {
    snoozeTask(taskId, duration, filters);
  }, [snoozeTask, filters]);

  const handleBulkComplete = useCallback(() => {
    bulkComplete(filters);
  }, [bulkComplete, filters]);

  const handleBulkDelete = useCallback(() => {
    bulkDelete(filters);
  }, [bulkDelete, filters]);

  const handleCreateTestTask = useCallback((
    taskType: string,
    title: string,
    description: string,
    priority: 'low' | 'medium' | 'high'
  ) => {
    createTestTask(taskType, title, description, priority, filters);
  }, [createTestTask, filters]);

  const handleTaskCreated = useCallback(() => {
    fetchTasks(filters);
    fetchStats();
  }, [fetchTasks, fetchStats, filters]);

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
            {/* Hidden test button */}
            <button
              onClick={() => setShowTestTasks(!showTestTasks)}
              title={showTestTasks ? 'Hide Test Tasks' : 'Show Test Tasks'}
              className={`test-toggle-btn ${showTestTasks ? 'test-toggle-btn--active' : 'test-toggle-btn--inactive'}`}
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
            onSearchChange={setSearch}
            timeframe={filters.timeframe}
            onTimeframeChange={setTimeframe}
          />

          {/* Test Tasks Section */}
          {showTestTasks && (
            <TestTasksPanel onCreateTestTask={handleCreateTestTask} />
          )}

          {/* Error Banner */}
          {error && (
            <div className="error-banner">
              {error}
              <button onClick={clearError} className="close-btn">×</button>
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
              <button onClick={clearSelection} className="btn-clear">
                Clear Selection
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && <div className="loading">Loading tasks...</div>}

          {/* Tasks Display */}
          {!loading && (
            <div className="task-display">
              {isMobile ? (
                <TaskCards
                  tasks={sortedTasks}
                  onComplete={completeTask}
                  onSnooze={handleSnooze}
                  onDelete={deleteTask}
                  onUpdate={updateTask}
                />
              ) : (
                <TaskTable
                  tasks={sortedTasks}
                  selectedTaskIds={selectedTaskIds}
                  onSelectedChange={setSelectedTaskIds}
                  onComplete={completeTask}
                  onSnooze={handleSnooze}
                  onDelete={deleteTask}
                  onUpdate={updateTask}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
