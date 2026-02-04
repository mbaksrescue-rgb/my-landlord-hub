import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];

interface PaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

interface UsePaginatedQueryOptions {
  queryKey: string[];
  tableName: TableName;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  filters?: Record<string, string | number | boolean | null | undefined>;
  options?: PaginationOptions;
}

interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  refetch: () => void;
}

export function usePaginatedQuery<T>({
  queryKey,
  tableName,
  select = '*',
  orderBy = { column: 'created_at', ascending: false },
  filters = {},
  options = {},
}: UsePaginatedQueryOptions): PaginatedResult<T> {
  const { pageSize = 15, initialPage = 1 } = options;
  const [page, setPage] = useState(initialPage);

  const fetchData = useCallback(async () => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build query using any to bypass strict typing for dynamic queries
    let query = (supabase.from(tableName) as any)
      .select(select, { count: 'exact' })
      .order(orderBy.column, { ascending: orderBy.ascending ?? false })
      .range(from, to);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value);
      }
    });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data as T[],
      totalCount: count || 0,
    };
  }, [tableName, select, orderBy.column, orderBy.ascending, filters, page, pageSize]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [...queryKey, page, pageSize, JSON.stringify(filters)],
    queryFn: fetchData,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });

  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= Math.max(totalPages, 1)) {
      setPage(newPage);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page]);

  return {
    data: data?.data || [],
    totalCount,
    page,
    pageSize,
    totalPages,
    isLoading,
    isFetching,
    error: error as Error | null,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    refetch,
  };
}
