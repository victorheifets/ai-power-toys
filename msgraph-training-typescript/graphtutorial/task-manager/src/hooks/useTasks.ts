// Hook for task state and operations

import { useState, useCallback } from 'react';
import type { Task, TaskFilters, TaskStats } from '../types';
import * as api from '../utils/api';

export function useTasks(userEmail: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

  const clearError = useCallback(() => setError(null), []);

  const fetchTasks = useCallback(async (filters: TaskFilters) => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.fetchTasks(userEmail, filters);
      setTasks(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tasks';
      setError(message);
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.fetchStats(userEmail) as TaskStats;
      setStats(data);
    } catch (err) {
      console.warn('Error fetching stats (non-critical):', err);
    }
  }, [userEmail]);

  const refreshData = useCallback(async (filters: TaskFilters) => {
    await Promise.all([fetchTasks(filters), fetchStats()]);
  }, [fetchTasks, fetchStats]);

  const completeTask = useCallback(async (taskId: number) => {
    try {
      await api.completeTask(taskId);
      // Optimistic update
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: 'completed' as const, completed_at: new Date().toISOString() } : t
      ));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete task';
      setError(message);
      console.error('Error completing task:', err);
    }
  }, []);

  const snoozeTask = useCallback(async (taskId: number, duration: string, filters: TaskFilters) => {
    try {
      await api.snoozeTask(taskId, duration);
      await fetchTasks(filters); // Refresh to get updated snoozed_until
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to snooze task';
      setError(message);
      console.error('Error snoozing task:', err);
    }
  }, [fetchTasks]);

  const deleteTask = useCallback(async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await api.deleteTask(taskId);
      // Optimistic update
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete task';
      setError(message);
      console.error('Error deleting task:', err);
    }
  }, []);

  const updateTask = useCallback(async (taskId: number, updates: Partial<Task>) => {
    try {
      const updatedTask = await api.updateTask(taskId, updates);
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update task';
      setError(message);
      console.error('Error updating task:', err);
    }
  }, []);

  const bulkComplete = useCallback(async (filters: TaskFilters) => {
    if (selectedTaskIds.length === 0) return;

    try {
      await api.bulkTaskAction(selectedTaskIds, 'complete');
      setSelectedTaskIds([]);
      await fetchTasks(filters);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to bulk complete';
      setError(message);
      console.error('Error bulk completing tasks:', err);
    }
  }, [selectedTaskIds, fetchTasks]);

  const bulkDelete = useCallback(async (filters: TaskFilters) => {
    if (selectedTaskIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedTaskIds.length} tasks?`)) return;

    try {
      await api.bulkTaskAction(selectedTaskIds, 'delete');
      setSelectedTaskIds([]);
      await fetchTasks(filters);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to bulk delete';
      setError(message);
      console.error('Error bulk deleting tasks:', err);
    }
  }, [selectedTaskIds, fetchTasks]);

  const createTestTask = useCallback(async (
    taskType: string,
    title: string,
    description: string,
    priority: 'low' | 'medium' | 'high',
    filters: TaskFilters
  ) => {
    try {
      await api.createTask({
        user_email: userEmail,
        title,
        description,
        priority,
        task_type: taskType,
        source: `test_${taskType}`
      });
      await fetchTasks(filters);
      setError(`✅ Test ${taskType} task created!`);
      setTimeout(() => setError(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create task';
      setError(`❌ Error: ${message}`);
    }
  }, [userEmail, fetchTasks]);

  const clearSelection = useCallback(() => setSelectedTaskIds([]), []);

  return {
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
  };
}
