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
    if (!raw || !token) router.replace('/login');
    else setUser(JSON.parse(raw));
    setReady(true);
  }, [router]);
  return { user, ready };
}
