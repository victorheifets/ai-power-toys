// Hook for Server-Sent Events connection

import { useState, useEffect, useRef, useCallback } from 'react';
import { SSE_URL, SSE_RECONNECT_DELAY, SSE_TASK_EVENTS } from '../constants';
import type { SSETaskEventType } from '../types';

interface UseSSEOptions {
  onTaskEvent?: () => void;
}

export function useSSE(options: UseSSEOptions = {}) {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { onTaskEvent } = options;

  const connect = useCallback(() => {
    console.log('Connecting to SSE...');
    const eventSource = new EventSource(SSE_URL);

    eventSource.onopen = () => {
      console.log('SSE connected');
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE event received:', data);

        if (SSE_TASK_EVENTS.includes(data.type as SSETaskEventType)) {
          console.log('Task changed, triggering refresh...');
          onTaskEvent?.();
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setConnected(false);
      eventSource.close();

      // Reconnect after delay
      setTimeout(() => {
        console.log('Attempting to reconnect SSE...');
        connect();
      }, SSE_RECONNECT_DELAY);
    };

    eventSourceRef.current = eventSource;
  }, [onTaskEvent]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        console.log('Closing SSE connection');
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  return { connected };
}
