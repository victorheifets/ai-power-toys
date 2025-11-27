// Sorting utility functions for tasks

import type { Task, SortField, SortDirection } from '../types';
import { PRIORITIES } from '../constants/taskConfig';

export function sortTasks(
  tasks: Task[],
  sortField: SortField,
  sortDirection: SortDirection
): Task[] {
  return [...tasks].sort((a, b) => {
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
        comparison = PRIORITIES[a.priority].order - PRIORITIES[b.priority].order;
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });
}

export function getDefaultSortDirection(field: SortField): SortDirection {
  // Default to descending for dates, ascending for text
  return field === 'created_at' || field === 'due_date' ? 'desc' : 'asc';
}
