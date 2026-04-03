'use client';

import { UserContext } from './UserContext';
import { useUserSelector } from '@/hooks/useUserSelector';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUserSelector();

  return <UserContext.Provider value={{ user, loading }}>{children}</UserContext.Provider>;
}
