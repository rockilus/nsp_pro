import React, { useState, ChangeEvent, useRef } from "react";
// MUI
import Chip from "@mui/material/Chip";
import ClearIcon from "@mui/icons-material/Clear";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
// Types
import { DimEntryT } from "@/types/dim-entry";
import { ConstraintDefaultColors } from "../../../constants/constants";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredOptions, setFilteredOptions] = useState<DimEntryT[]>(
    dimEntries.filter(
      (de) => !selectedDimEntries.some((vs) => vs.id === de.id),
    ),
  );
  const [selectedOption, setSelectedOption] = useState<DimEntryT | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value.trim();
    setSearchQuery(query);
    if (query === "") {
      setFilteredOptions(
        dimEntries.filter(
          (de) => !selectedDimEntries.some((vs) => vs.id === de.id),
        ),
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
          (de) =>
            !selectedDimEntries.some((vs) => vs.id === de.id) ||
            de.id === deToDelete.id,
        ),
      );
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && event.currentTarget.selectionStart === 0) {
      const lastSelected = selectedDimEntries[selectedDimEntries.length - 1];
      if (lastSelected) {
        handleRemoveFromSelected(lastSelected);
      }
      // Update the external state for "selected" here
    } else if (event.key === "Enter") {
      if (selectedOption) {
        handleAddSelectedDimEntry(selectedOption);
      }
    } else if (event.key === "ArrowDown") {
      if (filteredOptions.length > 0) {
        if (!selectedOption) {
          setSelectedOption(filteredOptions[0]);
        } else {
          const index = filteredOptions.findIndex(
            (option) => option.id === selectedOption.id,
          );
          if (index < filteredOptions.length - 1) {
            setSelectedOption(filteredOptions[index + 1]);
          }
        }
      }
    } else if (event.key === "ArrowUp") {
      if (filteredOptions.length > 0) {
        if (!selectedOption) {
          setSelectedOption(filteredOptions[filteredOptions.length - 1]);
        } else {
          const index = filteredOptions.findIndex(
            (option) => option.id === selectedOption.id,
          );
          if (index > 0) {
            setSelectedOption(filteredOptions[index - 1]);
          }
        }
      }
    } else if (event.key === "Escape") {
      handleClose();
    }
  };

  const handleAddSelectedDimEntry = (newDimEntry: DimEntryT) => {
    if (filteredOptions.some((option) => option.id === newDimEntry.id)) {
      handleAddDimEntry(newDimEntry);
      setFilteredOptions(
        dimEntries.filter(
          (de) =>
            !selectedDimEntries.some((vs) => vs.id === de.id) &&
            de.id !== newDimEntry.id,
        ),
      );
      setSearchQuery("");
    }
    // Update the external state for "selected" here
  };

  return (
    <div
      data-testid="dim-entry-type-cell-edit-popup"
      style={{
        width: "240px",
        borderRadius: "6px",
        boxShadow:
          "rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px, rgba(15, 15, 15, 0.2) 0px 9px 24px",
      }}
    >
      <div
        style={{
          borderTopRightRadius: "inherit",
          borderTopLeftRadius: "inherit",
          // background: "#f0efed",
          background: ConstraintDefaultColors.shade0,
        }}
      >
        {/* <div className="field-name" style={{ fontSize: "10px" }}>
              {selector.name.charAt(0).toUpperCase() + selector.name.slice(1)}
            </div> */}
        <div
          className="input-container"
          onClick={() => inputRef.current && inputRef.current.focus()}
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            overflow: "auto",
            cursor: "text",
            // Hide scrollbar
            scrollbarWidth: "none", // For Firefox
            msOverflowStyle: "none", // For Internet Explorer and Edge
            // "&::-webkit-scrollbar": {
            //   display: "none", // For Chrome, Safari and Opera
            // },
          }}
        >
          {selectedDimEntries.map((de) => (
            <Chip
              key={de.id}
              label={de.name}
              data-testid={`selected-dim-entry-chip-${de.id}`}
              onDelete={() => handleRemoveFromSelected(de)}
              deleteIcon={
                <ClearIcon
                  data-testid={`remove-dim-entry-${de.id}`}
                  style={{
                    fontSize: "15px",
                    color: ConstraintDefaultColors.shade2,
                  }}
                />
              }
              sx={{
                height: "21px",
                color: ConstraintDefaultColors.shade3,
                background: ConstraintDefaultColors.shade1,
              }}
            />
          ))}
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            ref={inputRef}
            data-testid="dim-entry-search-input"
            // placeholder="Search shifts"
            style={{
              color: ConstraintDefaultColors.shade3,
              height: "21px",
              border: "none",
              outline: "none",
              background: "transparent",
              minWidth: "60px",
              flexGrow: 1,
            }}
          />
        </div>
      </div>
      <div style={{ padding: "8px 0 8px 0" }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: "bold",
            // color: "rgba(55, 53, 47, 0.65)",
            color: ConstraintDefaultColors.shade2,
            padding: "0 16px 6px 16px",
          }}
        >
          {"Select one or more "}
        </div>
        <List
          dense={true}
          sx={{ padding: "0 0 0 0" }}
          data-testid="dim-entry-options-list"
        >
          {filteredOptions.map((option) => (
            <ListItemButton
              key={option.id}
              data-testid={`dim-entry-option-${option.id}`}
              onClick={() => {
                handleAddSelectedDimEntry(option);
              }}
              selected={selectedOption === option}
              sx={{ padding: "0 0 0 0" }}
            >
              <ListItem sx={{ padding: "0 16px 0 16px" }}>
                <ListItemText
                  primary={option.name}
                  style={{ color: ConstraintDefaultColors.shade3 }}
                />
              </ListItem>
            </ListItemButton>
          ))}
        </List>
      </div>
    </div>
  );
}
