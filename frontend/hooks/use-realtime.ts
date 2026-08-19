'use client';
import { useEffect, useRef } from 'react';

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

export interface RealtimeEvent {
  type: string;
  entity: 'establishment' | 'contract' | 'vehicle';
  id: string;
  establishmentId?: string;
  contractId?: string;
  userId: string;
  timestamp: string;
}

export function useRealtime() {
  const esRef = useRef<EventSource | null>(null);
  const attemptRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

    const connect = () => {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const es = new EventSource(`${baseUrl}/events?token=${encodeURIComponent(token)}`);
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const data: RealtimeEvent = JSON.parse(event.data);
          window.dispatchEvent(new CustomEvent<RealtimeEvent>('bh-realtime', { detail: data }));
          attemptRef.current = 0;
        } catch {
          // ignore malformed events
        }
      };

      es.onerror = () => {
        es.close();
        const delay = RECONNECT_DELAYS[Math.min(attemptRef.current, RECONNECT_DELAYS.length - 1)];
        attemptRef.current += 1;
        timeoutRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      esRef.current?.close();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
}
