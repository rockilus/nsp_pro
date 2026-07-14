import React, { useState, ChangeEvent, useRef } from 'react';
import { X } from 'lucide-react';
// Types
import { SpecialtyT } from '@/types/specialty';
import { ConstraintDefaultColors } from '../../../../constants/constants';

export default function ShiftStaffingCellEdit({
  selectedSpecialties,
  specialties,
  handleAddStaffing,
  handleRemoveStaffing,
  handleClose,
}: {
  selectedSpecialties: SpecialtyT[];
  specialties: SpecialtyT[];
  handleAddStaffing: (specialty: SpecialtyT) => void;
  handleRemoveStaffing: (specialty: SpecialtyT) => void;
  handleClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<SpecialtyT[]>(
    specialties.filter((de) => !selectedSpecialties.some((vs) => vs.id === de.id)),
  );
  const [selectedOption, setSelectedOption] = useState<SpecialtyT | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value.trim();
    setSearchQuery(query);
    if (query === '') {
      setFilteredOptions(
        specialties.filter((de) => !selectedSpecialties.some((vs) => vs.id === de.id)),
      );
    } else {
      const newFilteredOptions = specialties.filter(
        (de) =>
          !selectedSpecialties.some((vs) => vs.id === de.id) &&
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

  const handleRemoveFromSelected = (deToDelete: SpecialtyT) => {
    if (selectedSpecialties.includes(deToDelete)) {
      handleRemoveStaffing(deToDelete);
      setFilteredOptions(
        specialties.filter(
          (de) => !selectedSpecialties.some((vs) => vs.id === de.id) || de.id === deToDelete.id,
        ),
      );
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && event.currentTarget.selectionStart === 0) {
      const lastSelected = selectedSpecialties[selectedSpecialties.length - 1];
      if (lastSelected) {
        handleRemoveFromSelected(lastSelected);
      }
    } else if (event.key === 'Enter') {
      if (selectedOption) {
        handleAddSelectedSpecialty(selectedOption);
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

  const handleAddSelectedSpecialty = (newSpecialty: SpecialtyT) => {
    if (filteredOptions.some((option) => option.id === newSpecialty.id)) {
      handleAddStaffing(newSpecialty);
      setFilteredOptions(
        specialties.filter(
          (de) => !selectedSpecialties.some((vs) => vs.id === de.id) && de.id !== newSpecialty.id,
        ),
      );
      setSearchQuery('');
    }
  };

  return (
    <div
      style={{
        width: '240px',
        borderRadius: '6px',
        boxShadow:
          'rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px, rgba(15, 15, 15, 0.2) 0px 9px 24px',
      }}
    >
      <div
        style={{
          borderTopRightRadius: 'inherit',
          borderTopLeftRadius: 'inherit',
          background: ConstraintDefaultColors.shade0,
        }}
      >
        <div
          className="input-container"
          onClick={() => inputRef.current && inputRef.current.focus()}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            overflow: 'auto',
            cursor: 'text',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {selectedSpecialties.map((de) => (
            <div
              key={de.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '21px',
                margin: '2px',
                padding: '0 4px',
                borderRadius: '4px',
                color: ConstraintDefaultColors.shade3,
                background: ConstraintDefaultColors.shade1,
                fontSize: '13px',
                gap: '4px',
              }}
            >
              {de.name}
              <X
                className="size-[15px] cursor-pointer"
                style={{ color: ConstraintDefaultColors.shade2 }}
                onClick={() => handleRemoveFromSelected(de)}
                role="button"
                aria-label="remove"
              />
            </div>
          ))}
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            ref={inputRef}
            style={{
              color: ConstraintDefaultColors.shade3,
              height: '21px',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              minWidth: '60px',
              flexGrow: 1,
            }}
          />
        </div>
      </div>
      <div style={{ padding: '8px 0 8px 0' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 'bold',
            color: ConstraintDefaultColors.shade2,
            padding: '0 16px 6px 16px',
          }}
        >
          {'Select one or more '}
        </div>
        <div>
          {filteredOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                handleAddSelectedSpecialty(option);
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '4px 16px',
                textAlign: 'left',
                border: 'none',
                background:
                  selectedOption === option ? ConstraintDefaultColors.shade0 : 'transparent',
                color: ConstraintDefaultColors.shade3,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {option.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
