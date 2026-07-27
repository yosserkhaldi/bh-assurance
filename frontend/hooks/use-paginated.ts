'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Paginated } from '@/types';

export function usePaginated<T>(endpoint: string) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<Paginated<T>>(endpoint, { params: { page, limit: 10, search } });
      setData(response.data.data);
      setPageCount(response.data.meta.pageCount);
    } finally { setLoading(false); }
  }, [endpoint, page, search]);
  useEffect(() => { const timer = setTimeout(() => void load(), 250); return () => clearTimeout(timer); }, [load]);
  return { data, page, setPage, pageCount, search, setSearch: (value: string) => { setSearch(value); setPage(1); }, loading, reload: load };
}
