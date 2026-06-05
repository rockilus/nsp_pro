'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getCellColorClass, resolveCellSource } from '@/app/lib/import-preview-utils';
import type { CellSource } from '@/app/lib/import-preview-utils';
import { useTranslation } from '@/app/i18n/client';

// ── Types ────────────────────────────────────────────────────────────────────

export type EditableFieldType = 'text' | 'number' | 'date' | 'time' | 'boolean';

interface EditableCellProps {
  entityId: string;
  field: string;
  value: unknown;
  defaultedFields: string[];
  editedValues: Record<string, Record<string, unknown>>;
  onCommit: (entityId: string, field: string, rawValue: string, originalValue: unknown) => void;
  fieldType: EditableFieldType;
  /** Format the value for display (e.g., unix→date string, minutes→HH:MM). */
  displayFormatter?: (value: unknown) => string;
  /** Extra classNames for the wrapper cell. */
  className?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a UNIX timestamp to an ISO date string for <input type="date">. */
function unixToInputDate(ts: number | null): string {
  if (ts === null || !Number.isFinite(ts)) return '';
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

/** Convert an ISO date string from <input type="date"> back to a UNIX timestamp string. */
function inputDateToUnix(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00Z');
  const ts = d.getTime();
  if (Number.isNaN(ts)) return '';
  return String(Math.floor(ts / 1000));
}

/** Convert minutes-from-midnight to HH:MM for <input type="time">. */
function minutesToInputTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Convert HH:MM from <input type="time"> to minutes-from-midnight string. */
function inputTimeToMinutes(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  return String(h * 60 + (m || 0));
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EditableCell({
  entityId,
  field,
  value,
  defaultedFields,
  editedValues,
  onCommit,
  fieldType,
  displayFormatter,
  className = '',
}: EditableCellProps) {
  // Use any locale — we just need yes/no. Import tab always has lng available
  // via parent, but this component is self-contained.
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { source, displayValue } = resolveCellSource(
    entityId,
    field,
    value,
    defaultedFields,
    editedValues,
  );

  // ── Format for display ─────────────────────────────────────────────────

  const formatDisplay = useCallback(
    (val: unknown): string => {
      if (val === null || val === undefined) return '—';
      if (displayFormatter) return displayFormatter(val);

      switch (fieldType) {
        case 'date':
          return unixToInputDate(val as number);
        case 'time':
          return minutesToInputTime(val as number);
        case 'boolean':
          return val ? '✓' : '—';
        default:
          return String(val);
      }
    },
    [displayFormatter, fieldType],
  );

  // ── Compute input defaultValue (one-shot, not memoized) ───────────────

  const inputDefaultValue = ((): string => {
    if (displayValue === null || displayValue === undefined) return '';

    switch (fieldType) {
      case 'date': {
        const num = Number(displayValue);
        if (!Number.isFinite(num)) return '';
        return unixToInputDate(num);
      }
      case 'time': {
        const num = Number(displayValue);
        if (!Number.isFinite(num)) return '';
        return minutesToInputTime(num);
      }
      case 'boolean':
        return (displayValue as boolean) ? 'true' : 'false';
      default:
        return String(displayValue);
    }
  })();

  // ── Handlers ───────────────────────────────────────────────────────────

  const enterEdit = useCallback(() => {
    setIsEditing(true);
    // Auto-focus after render
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const commit = useCallback(() => {
    let raw = inputRef.current?.value ?? '';
    // Convert date/time inputs to numeric strings for normalizeValue.
    // Skip conversion for empty values — normalizeValue handles null/empty correctly.
    if (raw !== '') {
      if (fieldType === 'date') {
        raw = inputDateToUnix(raw);
      } else if (fieldType === 'time') {
        raw = inputTimeToMinutes(raw);
      }
    }
    onCommit(entityId, field, raw, value);
    setIsEditing(false);
  }, [entityId, field, value, onCommit, fieldType]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
      }
    },
    [commit],
  );

  // ── Boolean select ─────────────────────────────────────────────────────

  if (fieldType === 'boolean' && isEditing) {
    return (
      <div className={`flex items-center ${className}`}>
        <Select
          value={displayValue ? 'true' : 'false'}
          onValueChange={(v) => {
            onCommit(entityId, field, v, value);
            setIsEditing(false);
          }}
        >
          <SelectTrigger className="h-8 w-[70px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">✓</SelectItem>
            <SelectItem value="false">—</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  // ── Editing mode (text / number / date / time) ─────────────────────────

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type={
          fieldType === 'number'
            ? 'number'
            : fieldType === 'date'
              ? 'date'
              : fieldType === 'time'
                ? 'time'
                : 'text'
        }
        defaultValue={inputDefaultValue}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={`h-7 min-w-[80px] px-1.5 py-0 text-xs ${className}`}
      />
    );
  }

  // ── Display mode ───────────────────────────────────────────────────────

  const colorClass = getCellColorClass(source);

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={enterEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          enterEdit();
        }
      }}
      className={`inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-xs transition-colors hover:ring-1 hover:ring-ring/30 focus:ring-1 focus:ring-ring/50 focus:outline-none ${colorClass} ${className}`}
      title={
        source === 'default'
          ? 'Default value — not found in file. Click to edit.'
          : source === 'imported'
            ? 'Imported from file. Click to edit.'
            : 'Edited. Click to edit.'
      }
      aria-label={`${field}: ${formatDisplay(displayValue)}. ${source === 'edited' ? 'Edited.' : source === 'default' ? 'Default value.' : 'Imported.'} Press Enter to edit.`}
    >
      {formatDisplay(displayValue)}
    </span>
  );
}
