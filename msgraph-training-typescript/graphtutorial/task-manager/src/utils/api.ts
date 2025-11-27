// API utility functions for task operations

import { API_BASE } from '../constants';
import type { Task, TaskFilters } from '../types';

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new ApiError(`Request failed: ${response.statusText}`, response.status);
  }
  return response.json();
}

export function buildTaskQueryParams(filters: TaskFilters): URLSearchParams {
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

  return params;
}

export async function fetchTasks(userEmail: string, filters: TaskFilters): Promise<Task[]> {
  const params = buildTaskQueryParams(filters);
  const response = await fetch(`${API_BASE}/tasks/${userEmail}?${params}`);
  return handleResponse<Task[]>(response);
}

export async function fetchStats(userEmail: string) {
  const response = await fetch(`${API_BASE}/tasks/${userEmail}/stats`);
  return handleResponse(response);
}

export async function completeTask(taskId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}/complete`, {
    method: 'POST'
  });
  if (!response.ok) {
    throw new ApiError('Failed to complete task', response.status);
  }
}

export async function snoozeTask(taskId: number, duration: string): Promise<void> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}/snooze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ duration })
  });
  if (!response.ok) {
    throw new ApiError('Failed to snooze task', response.status);
  }
}

export async function deleteTask(taskId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new ApiError('Failed to delete task', response.status);
  }
}

export async function updateTask(taskId: number, updates: Partial<Task>): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return handleResponse<Task>(response);
}

export async function bulkTaskAction(taskIds: number[], action: 'complete' | 'delete'): Promise<void> {
  const response = await fetch(`${API_BASE}/tasks/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_ids: taskIds, action })
  });
  if (!response.ok) {
    throw new ApiError(`Failed to bulk ${action}`, response.status);
  }
}

export async function createTask(taskData: {
  user_email: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  task_type: string;
  source: string;
}): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...taskData,
      status: 'pending'
    })
  });
  return handleResponse<Task>(response);
}
