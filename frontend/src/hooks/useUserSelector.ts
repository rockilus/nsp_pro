'use client';

import { useState, useEffect, useRef } from 'react';
// Actions
import { useGetUser } from './useUser';
// Types
import { UserT } from '@/types/user';

export function useUserSelector() {
  const getUser = useGetUser();
  const [user, setUser] = useState<UserT | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to track if we've already fetched to prevent multiple calls
  const hasFetched = useRef(false);

  useEffect(() => {
    // Prevent multiple simultaneous calls
    if (hasFetched.current) {
      return;
    }

    async function fetchUser() {
      hasFetched.current = true;

      try {
        setLoading(true);
        setError(null);
        const userData = await getUser();
        setUser(userData);
      } catch (err) {
        console.error('Failed to fetch user:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user');
        // Reset the flag on error to allow retry
        hasFetched.current = false;
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [getUser]); // getUser is now stable with useCallback

  return {
    user,
    loading,
    error,
    // Add a manual refresh function for explicit updates
    refresh: () => {
      hasFetched.current = false;
      setLoading(true);
    },
  };
}
