import { useCallback } from 'react';
// Types
import {
  ShiftDemandTemplateDTO,
  ShiftDemandTemplateCreateDTO,
  ShiftDemandTemplateUpdateDTO,
  TemplateFromDemandsDTO,
  ApplyTemplateDTO,
  ApplyDemandsToTemplateWeekDTO,
  ApplyTemplateToDateRangeDTO,
  TemplateApplicationResult,
  TemplateValidationResult,
  BatchTemplateOperationResult,
} from '../types/shift-demand-template';
// API Client
import { ShiftDemandTemplateApi } from '../app/lib/api/shiftDemandTemplateApi';
import { useApiClient } from '../app/lib/api-client';
// Auth Context
import { useAuth } from '../contexts/auth-context';
import { env } from '@/config/env';

//////////////////////////
// Authenticated Template Hooks //
//////////////////////////

/**
 * Hook for getting all templates for a team
 */
export function useGetTemplates() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getTemplates = useCallback(
    async (teamId: string): Promise<ShiftDemandTemplateDTO[]> => {
      if (env.isDevelopment) {
        console.log('🔍 useGetTemplates called:', {
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

      try {
        return await ShiftDemandTemplateApi.getTemplates(apiClient, teamId);
      } catch (error) {
        console.error('❌ Failed to get templates:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getTemplates;
}

/**
 * Hook for getting a specific template by ID
 */
export function useGetTemplate() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getTemplate = useCallback(
    async (templateId: string, teamId: string): Promise<ShiftDemandTemplateDTO> => {
      if (env.isDevelopment) {
        console.log('🔍 useGetTemplate called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          templateId,
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

      try {
        return await ShiftDemandTemplateApi.getTemplate(apiClient, templateId, teamId);
      } catch (error) {
        console.error('❌ Failed to get template:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getTemplate;
}

/**
 * Hook for creating a new template
 */
export function useCreateTemplate() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const createTemplate = useCallback(
    async (
      teamId: string,
      template: ShiftDemandTemplateCreateDTO,
    ): Promise<ShiftDemandTemplateDTO> => {
      if (env.isDevelopment) {
        console.log('🔍 useCreateTemplate called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          templateName: template.name,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        const result = await ShiftDemandTemplateApi.createTemplate(apiClient, teamId, template);

        if (env.isDevelopment) {
          console.log('✅ Template created successfully');
        }

        return result;
      } catch (error) {
        console.error('❌ Failed to create template:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return createTemplate;
}

/**
 * Hook for creating a template from existing demands
 */
export function useCreateTemplateFromDateRange() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const createTemplateFromDateRange = useCallback(
    async (teamId: string, template: TemplateFromDemandsDTO): Promise<ShiftDemandTemplateDTO> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await ShiftDemandTemplateApi.createTemplateFromDateRange(
          apiClient,
          teamId,
          template,
        );
      } catch (error) {
        console.error('❌ Failed to create template from date range:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return createTemplateFromDateRange;
}

/**
 * Hook for updating a template
 */
export function useUpdateTemplate() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const updateTemplate = useCallback(
    async (
      templateId: string,
      teamId: string,
      update: ShiftDemandTemplateUpdateDTO,
    ): Promise<ShiftDemandTemplateDTO> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await ShiftDemandTemplateApi.updateTemplate(apiClient, templateId, teamId, update);
      } catch (error) {
        console.error('❌ Failed to update template:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return updateTemplate;
}

/**
 * Hook for deleting a template
 */
export function useDeleteTemplate() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteTemplate = useCallback(
    async (templateId: string, teamId: string): Promise<void> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        await ShiftDemandTemplateApi.deleteTemplate(apiClient, templateId, teamId);
      } catch (error) {
        console.error('❌ Failed to delete template:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return deleteTemplate;
}

/**
 * Hook for applying a template
 */
export function useApplyTemplate() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const applyTemplate = useCallback(
    async (request: ApplyTemplateDTO): Promise<TemplateApplicationResult> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await ShiftDemandTemplateApi.applyTemplate(apiClient, request);
      } catch (error) {
        console.error('❌ Failed to apply template:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return applyTemplate;
}

/**
 * Hook for validating template application
 */
export function useValidateTemplateApplication() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const validateTemplateApplication = useCallback(
    async (request: ApplyTemplateDTO): Promise<TemplateValidationResult> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await ShiftDemandTemplateApi.validateTemplateApplication(apiClient, request);
      } catch (error) {
        console.error('❌ Failed to validate template application:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return validateTemplateApplication;
}

/**
 * Hook for batch deleting templates
 */
export function useBatchDeleteTemplates() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const batchDeleteTemplates = useCallback(
    async (templateIds: string[]): Promise<BatchTemplateOperationResult> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await ShiftDemandTemplateApi.batchDeleteTemplates(apiClient, templateIds);
      } catch (error) {
        console.error('❌ Failed to batch delete templates:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return batchDeleteTemplates;
}

/**
 * Hook for getting template analytics
 */
export function useGetTemplateAnalytics() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getTemplateAnalytics = useCallback(
    async (
      templateId: string,
    ): Promise<{
      usageCount: number;
      lastUsed?: string;
      averageDemandsGenerated: number;
    }> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await ShiftDemandTemplateApi.getTemplateAnalytics(apiClient, templateId);
      } catch (error) {
        console.error('❌ Failed to get template analytics:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return getTemplateAnalytics;
}

/**
 * Hook for applying demands to template week
 */
export function useApplyDemandsToTemplateWeek() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const applyDemandsToTemplateWeek = useCallback(
    async (
      templateId: string,
      teamId: string,
      request: ApplyDemandsToTemplateWeekDTO,
    ): Promise<ShiftDemandTemplateDTO> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await ShiftDemandTemplateApi.applyDemandsToTemplateWeek(
          apiClient,
          templateId,
          teamId,
          request,
        );
      } catch (error) {
        console.error('❌ Failed to apply demands to template week:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return applyDemandsToTemplateWeek;
}

/**
 * Hook for applying template to date range
 */
export function useApplyTemplateToDateRange() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const applyTemplateToDateRange = useCallback(
    async (
      templateId: string,
      teamId: string,
      request: ApplyTemplateToDateRangeDTO,
    ): Promise<TemplateApplicationResult> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await ShiftDemandTemplateApi.applyTemplateToDateRange(
          apiClient,
          templateId,
          teamId,
          request,
        );
      } catch (error) {
        console.error('❌ Failed to apply template to date range:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return applyTemplateToDateRange;
}
