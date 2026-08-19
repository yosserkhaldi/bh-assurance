'use client';
import { useEffect } from 'react';
import type { RealtimeEvent } from './use-realtime';

export function useRealtimeReload(entities: Array<RealtimeEvent['entity']>, reload: () => void) {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<RealtimeEvent>).detail;
      if (detail && entities.includes(detail.entity)) {
        reload();
      }
    };
    window.addEventListener('bh-realtime', handler);
    return () => window.removeEventListener('bh-realtime', handler);
  }, [entities, reload]);
}
