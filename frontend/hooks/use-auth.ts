'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const raw = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (!raw || !token) {
      router.replace('/login');
      setReady(true);
      return;
    }
    try {
      setUser(JSON.parse(raw));
    } catch {
      localStorage.clear();
      router.replace('/login');
    }
    setReady(true);
  }, [router]);
  return { user, ready };
}
