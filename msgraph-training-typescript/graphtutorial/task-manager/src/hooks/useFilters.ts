// Hook for filter state management with localStorage persistence

import { useState, useEffect, useCallback } from 'react';
import type { TaskFilters, Timeframe } from '../types';
import { getTaskFilters, setTaskFilters } from '../utils/storage';
import { DEFAULT_FILTERS } from '../constants';

export function useFilters() {
  const [filters, setFiltersState] = useState<TaskFilters>(() => getTaskFilters());

  // Persist to localStorage when filters change
  useEffect(() => {
    setTaskFilters(filters);
  }, [filters]);

  const setFilters = useCallback((newFilters: TaskFilters) => {
    setFiltersState(newFilters);
  }, []);

  const updateFilter = useCallback(<K extends keyof TaskFilters>(
    key: K,
    value: TaskFilters[K]
  ) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleArrayFilter = useCallback((
    key: 'status' | 'task_type' | 'priority' | 'source',
    value: string
  ) => {
    setFiltersState(prev => {
      const current = prev[key];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: newValues };
    });
  }, []);

  const setSearch = useCallback((search: string) => {
    setFiltersState(prev => ({ ...prev, search }));
  }, []);

  const setTimeframe = useCallback((timeframe: Timeframe) => {
    setFiltersState(prev => ({ ...prev, timeframe }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters =
    filters.status.length !== 1 || filters.status[0] !== 'pending' ||
    filters.task_type.length > 0 ||
    filters.priority.length > 0 ||
    filters.source.length > 0 ||
    filters.timeframe !== 'all' ||
    filters.search !== '';

  return {
    filters,
    setFilters,
    updateFilter,
    toggleArrayFilter,
    setSearch,
    setTimeframe,
    clearFilters,
    hasActiveFilters
  };
}
