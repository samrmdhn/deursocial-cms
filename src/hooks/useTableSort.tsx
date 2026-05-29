import { useState, useMemo } from 'react';

export type SortDir = 'asc' | 'desc';

export function useTableSort<T>(data: T[] | undefined, defaultCol: keyof T, defaultDir: SortDir = 'desc') {
  const [sortCol, setSortCol] = useState<keyof T>(defaultCol);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const sorted = useMemo(() => {
    if (!data) return data;
    return [...data].sort((a, b) => {
      const av = a[sortCol] as any;
      const bv = b[sortCol] as any;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortCol, sortDir]);

  const toggleSort = (col: keyof T) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: keyof T }) => {
    if (sortCol !== col) return <span style={{ color: '#2a2a2a', marginLeft: 4 }}>↕</span>;
    return <span style={{ color: '#666', marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return { sorted, sortCol, sortDir, toggleSort, SortIcon };
}
