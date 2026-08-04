import { useCallback } from 'react';
import {
  ScheduleTemplateDTO,
  ScheduleTemplateCreateDTO,
  ScheduleTemplateUpdateDTO,
  ApplyScheduleTemplateToDateRangeDTO,
  ScheduleTemplateApplicationResult,
} from '../types/schedule-template';
import { ScheduleTemplateApi } from '../app/lib/api/scheduleTemplateApi';
import { useApiClient } from '../app/lib/api-client';
import { useAuth } from '../contexts/auth-context';

export function useGetScheduleTemplates() {
  const apiClient = useApiClient();
  const { isAuthenticated, loading } = useAuth();

  const getTemplates = useCallback(
    async (teamId: string): Promise<ScheduleTemplateDTO[]> => {
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }
      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }
      try {
        return await ScheduleTemplateApi.getTemplates(apiClient, teamId);
      } catch (error) {
        console.error('Failed to fetch schedule templates:', error);
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return getTemplates;
}

export function useGetScheduleTemplate() {
  const apiClient = useApiClient();
  const { isAuthenticated, loading } = useAuth();

  const getTemplate = useCallback(
    async (templateId: string, teamId: string): Promise<ScheduleTemplateDTO> => {
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }
      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }
      try {
        return await ScheduleTemplateApi.getTemplate(apiClient, templateId, teamId);
      } catch (error) {
        console.error('Failed to fetch schedule template:', error);
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return getTemplate;
}

export function useCreateScheduleTemplate() {
  const apiClient = useApiClient();
  const { isAuthenticated, loading } = useAuth();

  const createTemplate = useCallback(
    async (teamId: string, template: ScheduleTemplateCreateDTO): Promise<ScheduleTemplateDTO> => {
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }
      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }
      try {
        return await ScheduleTemplateApi.createTemplate(apiClient, teamId, template);
      } catch (error) {
        console.error('Failed to create schedule template:', error);
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return createTemplate;
}

export function useUpdateScheduleTemplate() {
  const apiClient = useApiClient();
  const { isAuthenticated, loading } = useAuth();

  const updateTemplate = useCallback(
    async (
      templateId: string,
      teamId: string,
      update: ScheduleTemplateUpdateDTO,
    ): Promise<ScheduleTemplateDTO> => {
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }
      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }
      try {
        return await ScheduleTemplateApi.updateTemplate(apiClient, templateId, teamId, update);
      } catch (error) {
        console.error('Failed to update schedule template:', error);
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return updateTemplate;
}

export function useDeleteScheduleTemplate() {
  const apiClient = useApiClient();
  const { isAuthenticated, loading } = useAuth();

  const deleteTemplate = useCallback(
    async (templateId: string, teamId: string): Promise<void> => {
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }
      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }
      try {
        return await ScheduleTemplateApi.deleteTemplate(apiClient, templateId, teamId);
      } catch (error) {
        console.error('Failed to delete schedule template:', error);
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return deleteTemplate;
}

export function useApplyScheduleTemplateToDateRange() {
  const apiClient = useApiClient();
  const { isAuthenticated, loading } = useAuth();

  const apply = useCallback(
    async (
      templateId: string,
      teamId: string,
      request: ApplyScheduleTemplateToDateRangeDTO,
    ): Promise<ScheduleTemplateApplicationResult> => {
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }
      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }
      try {
        return await ScheduleTemplateApi.applyTemplateToDateRange(
          apiClient,
          templateId,
          teamId,
          request,
        );
      } catch (error) {
        console.error('Failed to apply schedule template to date range:', error);
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return apply;
}
