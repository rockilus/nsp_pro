import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/app/lib/api-client';
import { useAuth } from '../../../contexts/auth-context';
import { RotationApi } from '@/app/lib/api/rotationApi';
import { RotationT, RotationCreateDTO, RotationUpdateDTO } from '@/types/rotation';

export const rotationQueryKeys = {
  all: ['rotations'] as const,
  teams: (teamId: string) => [...rotationQueryKeys.all, 'team', teamId] as const,
  detail: (teamId: string, rotationId: string) =>
    [...rotationQueryKeys.teams(teamId), 'detail', rotationId] as const,
};

export function useRotations(teamId: string, options?: { enabled?: boolean }) {
  const apiClient = useApiClient();
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: rotationQueryKeys.teams(teamId),
    queryFn: () => RotationApi.getRotations(apiClient, teamId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: (options?.enabled ?? true) && isAuthenticated && !!teamId,
    refetchOnWindowFocus: false,
  });
}

export function useRotation(teamId: string, rotationId: string, options?: { enabled?: boolean }) {
  const apiClient = useApiClient();
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: rotationQueryKeys.detail(teamId, rotationId),
    queryFn: () => RotationApi.getRotation(apiClient, teamId, rotationId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: (options?.enabled ?? true) && isAuthenticated && !!teamId && !!rotationId,
    refetchOnWindowFocus: false,
  });
}

export function useRotationMutations(teamId: string) {
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  const { isAuthenticated } = useAuth();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: rotationQueryKeys.teams(teamId) });
  };

  const createMutation = useMutation({
    mutationFn: (data: RotationCreateDTO) => RotationApi.createRotation(apiClient, teamId, data),
    onSuccess: () => invalidate(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ rotationId, data }: { rotationId: string; data: RotationUpdateDTO }) =>
      RotationApi.updateRotation(apiClient, teamId, rotationId, data),
    onSuccess: () => invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: (rotationId: string) => RotationApi.deleteRotation(apiClient, teamId, rotationId),
    onSuccess: () => invalidate(),
  });

  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
  };
}
