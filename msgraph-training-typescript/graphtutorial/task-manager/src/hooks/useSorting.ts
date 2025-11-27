// Hook for sort state management

import { useState, useCallback, useMemo } from 'react';
import type { Task, SortField, SortDirection } from '../types';
import { sortTasks, getDefaultSortDirection } from '../utils/sorting';

export function useSorting(tasks: Task[]) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New field - use default direction
      setSortField(field);
      setSortDirection(getDefaultSortDirection(field));
    }
  }, [sortField]);

  const sortedTasks = useMemo(() =>
    sortTasks(tasks, sortField, sortDirection),
    [tasks, sortField, sortDirection]
  );

  return {
    sortField,
    sortDirection,
    handleSort,
    sortedTasks
  };
}
