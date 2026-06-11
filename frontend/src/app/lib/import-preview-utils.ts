/**
 * Utilities for import preview value resolution and inline editing.
 *
 * Three-layer value provenance:
 *   1. editedValues[entityId][field]  → "edited" (user changed it)
 *   2. defaultedFields.includes(field) → "default" (backend filled it)
 *   3. DTO field value                 → "imported" (from the Excel file)
 */

export type CellSource = 'imported' | 'default' | 'edited';

// ── Value resolution ────────────────────────────────────────────────────────

export interface ResolvedCell {
  displayValue: unknown;
  source: CellSource;
}

/**
 * Resolve the display value and provenance source for a single cell.
 * Priority: edited > default > imported.
 */
export function resolveCellSource(
  entityId: string,
  field: string,
  dtoValue: unknown,
  defaultedFields: string[],
  editedValues: Record<string, Record<string, unknown>>,
): ResolvedCell {
  // 1. User-edited?
  const entityEdits = editedValues[entityId];
  if (entityEdits && field in entityEdits) {
    return { displayValue: entityEdits[field], source: 'edited' };
  }

  // 2. Backend-defaulted?
  if (defaultedFields.includes(field)) {
    return { displayValue: dtoValue, source: 'default' };
  }

  // 3. Imported from file
  return { displayValue: dtoValue, source: 'imported' };
}

// ── Color classes ────────────────────────────────────────────────────────────

/**
 * Return Tailwind text color classes for the given source.
 * Blue = imported, Orange = default, normal = edited.
 */
export function getCellColorClass(source: CellSource): string {
  switch (source) {
    case 'imported':
      return 'text-blue-600 dark:text-blue-400';
    case 'default':
      return 'text-orange-600 dark:text-orange-400';
    case 'edited':
      return 'text-foreground';
  }
}

// ── Normalization ────────────────────────────────────────────────────────────

/**
 * Normalize a raw string input back to the original value's type.
 * Returns the original value if parsing fails (graceful fallback).
 */
export function normalizeValue(raw: string, original: unknown): unknown {
  // Nullable fields: empty string → null
  if (original === null && raw.trim() === '') {
    return null;
  }

  // Number fields
  if (typeof original === 'number') {
    // Handle timestamp dates (large numbers) vs small numbers
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
    return original; // fallback on invalid input
  }

  // Boolean fields
  if (typeof original === 'boolean') {
    const lower = raw.toLowerCase().trim();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
    return original;
  }

  // String fields — trim whitespace
  return raw.trim();
}

// ── Commit logic ─────────────────────────────────────────────────────────────

/**
 * Commit an inline edit.
 * - If the normalized value equals the original, the edit is cleared
 *   (cell reverts to blue or orange).
 * - Otherwise, the edit is stored (cell becomes black).
 *
 * Pass the setState dispatcher from useState.
 */
export function commitEdit(
  entityId: string,
  field: string,
  rawNewValue: string,
  originalValue: unknown,
  setEditedValues: React.Dispatch<React.SetStateAction<Record<string, Record<string, unknown>>>>,
): void {
  const normalized = normalizeValue(rawNewValue, originalValue);

  setEditedValues((prev) => {
    const next = structuredClone(prev);

    if (normalized === originalValue) {
      // Reverted to original → delete the edit entry
      if (next[entityId]) {
        delete next[entityId][field];
        if (Object.keys(next[entityId]).length === 0) {
          delete next[entityId];
        }
      }
    } else {
      // Genuine change → store it
      if (!next[entityId]) {
        next[entityId] = {};
      }
      next[entityId][field] = normalized;
    }

    return next;
  });
}
