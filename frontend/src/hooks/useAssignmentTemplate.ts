import { useCallback } from 'react';
import {
  AssignmentTemplateDTO,
  AssignmentTemplateCreateDTO,
  AssignmentTemplateUpdateDTO,
  ApplyAssignmentsToTemplateWeekDTO,
  ApplyAssignmentTemplateToDateRangeDTO,
  AssignmentTemplateApplicationResult,
} from '../types/assignment-template';
import { AssignmentTemplateApi } from '../app/lib/api/assignmentTemplateApi';
import { useApiClient } from '../app/lib/api-client';
import { useAuth } from '../contexts/auth-context';

export function useGetAssignmentTemplates() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getTemplates = useCallback(
    async (teamId: string): Promise<AssignmentTemplateDTO[]> => {
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }
      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }
      if (!user) {
        throw new Error('User information not available');
      }
      try {
        return await AssignmentTemplateApi.getTemplates(apiClient, teamId);
      } catch (error) {
        console.error('Failed to fetch assignment templates:', error);
        throw error;
      }
    },
    [apiClient, user, isAuthenticated, loading],
  );

  return getTemplates;
}

export function useGetAssignmentTemplate() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getTemplate = useCallback(
    async (templateId: string, teamId: string): Promise<AssignmentTemplateDTO> => {
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }
      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }
      try {
        return await AssignmentTemplateApi.getTemplate(apiClient, templateId, teamId);
      } catch (error) {
        console.error('Failed to fetch assignment template:', error);
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return getTemplate;
}

export function useCreateAssignmentTemplate() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const createTemplate = useCallback(
    async (
      teamId: string,
      template: AssignmentTemplateCreateDTO,
    ): Promise<AssignmentTemplateDTO> => {
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }
      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }
      try {
        return await AssignmentTemplateApi.createTemplate(apiClient, teamId, template);
      } catch (error) {
        console.error('Failed to create assignment template:', error);
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return createTemplate;
}

export function useUpdateAssignmentTemplate() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const updateTemplate = useCallback(
    async (
      templateId: string,
      teamId: string,
      update: AssignmentTemplateUpdateDTO,
    ): Promise<AssignmentTemplateDTO> => {
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }
      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }
      try {
        return await AssignmentTemplateApi.updateTemplate(apiClient, templateId, teamId, update);
      } catch (error) {
        console.error('Failed to update assignment template:', error);
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return updateTemplate;
}

export function useDeleteAssignmentTemplate() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteTemplate = useCallback(
    async (templateId: string, teamId: string): Promise<void> => {
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }
      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }
      try {
        return await AssignmentTemplateApi.deleteTemplate(apiClient, templateId, teamId);
      } catch (error) {
        console.error('Failed to delete assignment template:', error);
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return deleteTemplate;
}

export function useApplyAssignmentsToTemplateWeek() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const apply = useCallback(
    async (
      templateId: string,
      teamId: string,
      request: ApplyAssignmentsToTemplateWeekDTO,
    ): Promise<AssignmentTemplateDTO> => {
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }
      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }
      try {
        return await AssignmentTemplateApi.applyAssignmentsToTemplateWeek(
          apiClient,
          templateId,
          teamId,
          request,
        );
      } catch (error) {
        console.error('Failed to apply assignments to template week:', error);
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return apply;
}

export function useApplyAssignmentTemplateToDateRange() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const apply = useCallback(
    async (
      templateId: string,
      teamId: string,
      request: ApplyAssignmentTemplateToDateRangeDTO,
    ): Promise<AssignmentTemplateApplicationResult> => {
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }
      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }
      try {
        return await AssignmentTemplateApi.applyTemplateToDateRange(
          apiClient,
          templateId,
          teamId,
          request,
        );
      } catch (error) {
        console.error('Failed to apply assignment template to date range:', error);
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return apply;
}
