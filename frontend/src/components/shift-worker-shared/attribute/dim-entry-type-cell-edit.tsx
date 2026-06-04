import React, { useState, ChangeEvent, useRef } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
// Types
import { DimEntryT } from '@/types/dim-entry';
import { ConstraintDefaultColors } from '../../../constants/constants';

export default function DimEntryTypeCellEdit({
  selectedDimEntries,
  dimEntries,
  handleAddDimEntry,
  handleRemoveDimEntry,
  handleClose,
}: {
  selectedDimEntries: DimEntryT[];
  dimEntries: DimEntryT[];
  handleAddDimEntry: (dimEntry: DimEntryT) => void;
  handleRemoveDimEntry: (dimEntry: DimEntryT) => void;
  handleClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<DimEntryT[]>(
    dimEntries.filter((de) => !selectedDimEntries.some((vs) => vs.id === de.id)),
  );
  const [selectedOption, setSelectedOption] = useState<DimEntryT | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value.trim();
    setSearchQuery(query);
    if (query === '') {
      setFilteredOptions(
        dimEntries.filter((de) => !selectedDimEntries.some((vs) => vs.id === de.id)),
      );
    } else {
      const newFilteredOptions = dimEntries.filter(
        (de) =>
          !selectedDimEntries.some((vs) => vs.id === de.id) &&
          de.name.toLowerCase().includes(query.toLowerCase()),
      );
      setFilteredOptions(newFilteredOptions);
      if (newFilteredOptions.length > 0) {
        setSelectedOption(newFilteredOptions[0]);
      } else {
        setSelectedOption(null);
      }
    }
  };

  const handleRemoveFromSelected = (deToDelete: DimEntryT) => {
    if (selectedDimEntries.includes(deToDelete)) {
      handleRemoveDimEntry(deToDelete);
      setFilteredOptions(
        dimEntries.filter(
          (de) => !selectedDimEntries.some((vs) => vs.id === de.id) || de.id === deToDelete.id,
        ),
      );
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && event.currentTarget.selectionStart === 0) {
      const lastSelected = selectedDimEntries[selectedDimEntries.length - 1];
      if (lastSelected) {
        handleRemoveFromSelected(lastSelected);
      }
    } else if (event.key === 'Enter') {
      if (selectedOption) {
        handleAddSelectedDimEntry(selectedOption);
      }
    } else if (event.key === 'ArrowDown') {
      if (filteredOptions.length > 0) {
        if (!selectedOption) {
          setSelectedOption(filteredOptions[0]);
        } else {
          const index = filteredOptions.findIndex((option) => option.id === selectedOption.id);
          if (index < filteredOptions.length - 1) {
            setSelectedOption(filteredOptions[index + 1]);
          }
        }
      }
    } else if (event.key === 'ArrowUp') {
      if (filteredOptions.length > 0) {
        if (!selectedOption) {
          setSelectedOption(filteredOptions[filteredOptions.length - 1]);
        } else {
          const index = filteredOptions.findIndex((option) => option.id === selectedOption.id);
          if (index > 0) {
            setSelectedOption(filteredOptions[index - 1]);
          }
        }
      }
    } else if (event.key === 'Escape') {
      handleClose();
    }
  };

  const handleAddSelectedDimEntry = (newDimEntry: DimEntryT) => {
    if (filteredOptions.some((option) => option.id === newDimEntry.id)) {
      handleAddDimEntry(newDimEntry);
      setFilteredOptions(
        dimEntries.filter(
          (de) => !selectedDimEntries.some((vs) => vs.id === de.id) && de.id !== newDimEntry.id,
        ),
      );
      setSearchQuery('');
    }
  };

  return (
    <div
      data-testid="dim-entry-type-cell-edit-popup"
      className="w-[240px] rounded-md shadow-[rgba(15,15,15,0.05)_0px_0px_0px_1px,rgba(15,15,15,0.1)_0px_3px_6px,rgba(15,15,15,0.2)_0px_9px_24px]"
    >
      <div style={{ background: ConstraintDefaultColors.shade0 }} className="rounded-t-md">
        <div
          className="flex cursor-text flex-wrap items-start gap-1 overflow-auto p-1.5"
          onClick={() => inputRef.current && inputRef.current.focus()}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {selectedDimEntries.map((de) => (
            <Badge
              key={de.id}
              variant="secondary"
              className="gap-1 pr-1"
              data-testid={`selected-dim-entry-chip-${de.id}`}
            >
              {de.name}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFromSelected(de);
                }}
                className="inline-flex items-center rounded-full p-0 hover:bg-muted-foreground/20"
                data-testid={`remove-dim-entry-${de.id}`}
              >
                <X className="size-3" style={{ color: ConstraintDefaultColors.shade2 }} />
              </button>
            </Badge>
          ))}
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            ref={inputRef}
            data-testid="dim-entry-search-input"
            className="min-w-[60px] flex-1 border-none bg-transparent text-sm outline-none"
            style={{ color: ConstraintDefaultColors.shade3 }}
          />
        </div>
      </div>
      <div className="py-2">
        <p
          className="px-4 pb-1.5 text-[13px] font-bold"
          style={{ color: ConstraintDefaultColors.shade2 }}
        >
          Select one or more
        </p>
        <div data-testid="dim-entry-options-list">
          {filteredOptions.map((option) => (
            <button
              key={option.id}
              data-testid={`dim-entry-option-${option.id}`}
              onClick={() => handleAddSelectedDimEntry(option)}
              className={`w-full cursor-pointer px-4 py-0 text-left text-sm hover:bg-accent ${
                selectedOption === option ? 'bg-accent' : ''
              }`}
              style={{ color: ConstraintDefaultColors.shade3 }}
            >
              {option.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
