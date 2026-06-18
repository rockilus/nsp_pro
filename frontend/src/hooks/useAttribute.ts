import { useCallback } from 'react';
// Types
import { AttributeT } from '@/types/attribute';
// API Client
import { AttributeApi } from '../app/lib/api/attributeApi';
import { useApiClient } from '../app/lib/api-client';
// Auth Context
import { useAuth } from '../contexts/auth-context';
import { env } from '@/config/env';

//////////////////////////
// Authenticated Attribute Hooks //
//////////////////////////

/**
 * Hook for updating an attribute
 */
export function useUpdateAttribute() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const updateAttribute = useCallback(
    async (attribute: AttributeT, teamId: string): Promise<AttributeT> => {
      if (env.isDevelopment) {
        console.log('🔍 useUpdateAttribute called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          attributeId: attribute.id,
          teamId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      // Input validation
      // if (!attribute || !attribute.id) {
      if (!attribute) {
        throw new Error('Valid attribute data is required');
      }

      if (!teamId || teamId.trim().length === 0) {
        throw new Error('Team ID is required');
      }

      try {
        const updatedAttribute = await AttributeApi.updateAttribute(
          apiClient,
          attribute,
          teamId.trim(),
        );

        if (env.isDevelopment) {
          console.log('✅ Attribute updated successfully');
        }

        return updatedAttribute;
      } catch (error) {
        console.error('❌ Failed to update attribute:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return updateAttribute;
}

/**
 * Hook for getting attributes by owner
 */
export function useGetAttributesByOwner() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getAttributesByOwner = useCallback(
    async (ownerId: string, teamId: string): Promise<AttributeT[]> => {
      if (env.isDevelopment) {
        console.log('🔍 useGetAttributesByOwner called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          ownerId,
          teamId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      // Input validation
      if (!ownerId || ownerId.trim().length === 0) {
        throw new Error('Owner ID is required');
      }

      if (!teamId || teamId.trim().length === 0) {
        throw new Error('Team ID is required');
      }

      try {
        return await AttributeApi.getAttributesByOwner(apiClient, ownerId.trim(), teamId.trim());
      } catch (error) {
        console.error('❌ Failed to get attributes:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getAttributesByOwner;
}

/**
 * Hook for creating a new attribute
 */
export function useCreateAttribute() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const createAttribute = useCallback(
    async (attribute: Omit<AttributeT, 'id'>, teamId: string): Promise<AttributeT> => {
      if (env.isDevelopment) {
        console.log('🔍 useCreateAttribute called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      // Input validation
      if (!attribute) {
        throw new Error('Attribute data is required');
      }

      if (!teamId || teamId.trim().length === 0) {
        throw new Error('Team ID is required');
      }

      try {
        const newAttribute = await AttributeApi.createAttribute(
          apiClient,
          attribute,
          teamId.trim(),
        );

        if (env.isDevelopment) {
          console.log('✅ Attribute created successfully');
        }

        return newAttribute;
      } catch (error) {
        console.error('❌ Failed to create attribute:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return createAttribute;
}

/**
 * Hook for deleting an attribute
 */
export function useDeleteAttribute() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteAttribute = useCallback(
    async (attributeId: string, teamId: string): Promise<void> => {
      if (env.isDevelopment) {
        console.log('🔍 useDeleteAttribute called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          attributeId,
          teamId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      // Input validation
      if (!attributeId || attributeId.trim().length === 0) {
        throw new Error('Attribute ID is required');
      }

      if (!teamId || teamId.trim().length === 0) {
        throw new Error('Team ID is required');
      }

      try {
        await AttributeApi.deleteAttribute(apiClient, attributeId.trim(), teamId.trim());

        if (env.isDevelopment) {
          console.log('✅ Attribute deleted successfully');
        }
      } catch (error) {
        console.error('❌ Failed to delete attribute:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return deleteAttribute;
}
