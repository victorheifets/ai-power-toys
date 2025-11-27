// LocalStorage utility functions

import { STORAGE_KEYS, DEFAULT_FILTERS } from '../constants';
import type { TaskFilters } from '../types';

export function getUserEmail(defaultEmail: string): string {
  return localStorage.getItem(STORAGE_KEYS.USER_EMAIL) || defaultEmail;
}

export function setUserEmail(email: string): void {
  localStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
}

export function getLLMEnabled(): boolean {
  const saved = localStorage.getItem(STORAGE_KEYS.LLM_ENABLED);
  return saved !== null ? saved === 'true' : true;
}

export function setLLMEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEYS.LLM_ENABLED, enabled.toString());
}

export function getTaskFilters(): TaskFilters {
  const saved = localStorage.getItem(STORAGE_KEYS.TASK_FILTERS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return DEFAULT_FILTERS;
    }
  }
  return DEFAULT_FILTERS;
}

export function setTaskFilters(filters: TaskFilters): void {
  localStorage.setItem(STORAGE_KEYS.TASK_FILTERS, JSON.stringify(filters));
}
