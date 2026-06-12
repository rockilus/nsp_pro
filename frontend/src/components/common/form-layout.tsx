'use client';

import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

// ── FormField ────────────────────────────────────────────────────────────────
// Consistent label + control + error layout used across all schedule forms.

interface FormFieldProps {
  icon?: LucideIcon;
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

function FormField({ icon: Icon, label, error, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className={Icon ? 'ml-6' : ''}>{children}</div>
      {error && (
        <p className="ml-6 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ── FormSection ──────────────────────────────────────────────────────────────
// Vertical stack with consistent gap for form field groups.

interface FormSectionProps {
  children: React.ReactNode;
  className?: string;
}

function FormSection({ children, className }: FormSectionProps) {
  return <div className={cn('flex flex-col gap-4', className)}>{children}</div>;
}

// ── FormActions ──────────────────────────────────────────────────────────────
// Right-aligned button footer with top border separator.

interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
}

function FormActions({ children, className }: FormActionsProps) {
  return (
    <div
      className={cn(
        'mt-6 flex items-center justify-end gap-2 border-t border-border pt-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

export { FormField, FormSection, FormActions };
