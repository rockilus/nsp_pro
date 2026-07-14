'use client';

import { CheckCircleIcon, CircleIcon, Loader2Icon } from 'lucide-react';
import type { ComponentProps } from 'react';
import type { CompletedStep, CopilotPlan, PendingAction } from '@/app/lib/api/copilotApi';
import type { CopilotMessage } from '@/context/CopilotContext';
import { PendingActionCard } from './pending-action-card';

interface PlanChecklistProps {
  plan: CopilotPlan;
  completedSteps: CompletedStep[];
  pendingActions: PendingAction[];
  onConfirmAction: (action: PendingAction) => void;
  onCancelAction: (action: PendingAction) => void;
  disabled?: boolean;
  actionLabels: ComponentProps<typeof PendingActionCard>['labels'];
  planLabels: {
    stepCompleted: string;
    stepPending: string;
    stepWaiting: string;
  };
}

function statusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary" />;
    case 'pending_confirmation':
      return <Loader2Icon className="mt-0.5 size-4 shrink-0 animate-spin text-amber-500" />;
    default:
      return <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />;
  }
}

function statusLabel(status: string, labels: PlanChecklistProps['planLabels']) {
  switch (status) {
    case 'completed':
      return labels.stepCompleted;
    case 'pending_confirmation':
      return labels.stepPending;
    default:
      return labels.stepWaiting;
  }
}

export function PlanChecklist({
  plan,
  completedSteps,
  pendingActions,
  onConfirmAction,
  onCancelAction,
  disabled,
  actionLabels,
  planLabels,
}: PlanChecklistProps) {
  const statusMap = new Map(completedSteps.map((s) => [s.step, s.status]));

  return (
    <div className="mt-3 rounded-lg border border-border bg-background p-3">
      <p className="mb-3 text-sm font-medium text-foreground">{plan.summary}</p>
      <div className="flex flex-col gap-2">
        {plan.plan.map((step) => {
          const status = statusMap.get(step.step) ?? 'waiting';
          const pendingForStep = pendingActions.find((pa) => pa.step === step.step);

          return (
            <div key={step.step} className="flex flex-col gap-1">
              <div className="flex items-start gap-2">
                {statusIcon(status)}
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{step.description}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{statusLabel(status, planLabels)}</p>
                </div>
              </div>

              {pendingForStep && (
                <div className="ml-6">
                  <PendingActionCard
                    message={
                      pendingForStep.applied || pendingForStep.cancelled
                        ? ({
                            pendingAction: undefined,
                            pendingStatus: pendingForStep.applied ? 'applied' : 'cancelled',
                          } as CopilotMessage)
                        : ({
                            pendingAction: pendingForStep,
                            pendingStatus: undefined,
                          } as CopilotMessage)
                    }
                    disabled={disabled}
                    onConfirm={() => onConfirmAction(pendingForStep)}
                    onCancel={() => onCancelAction(pendingForStep)}
                    labels={actionLabels}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
