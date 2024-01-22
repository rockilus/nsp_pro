import React, { useState, ChangeEvent, useRef } from "react";

import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";

interface Props {
  selector: {
    name: string;
    options: string[];
    selected: string[];
    multiple: boolean;
  };
}

export default function FieldEntry({ selector }: Props) {
  const [selectorState, setSelectorState] = useState(selector);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredOptions, setFilteredOptions] = useState<string[]>(
    selectorState.options.filter(
      (option) => !selectorState.selected.includes(option)
    )
  );
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value.trim();
    setSearchQuery(query);
    if (query === "") {
      setFilteredOptions(
        selectorState.options.filter(
          (option) => !selectorState.selected.includes(option)
        )
      );
    } else {
      const newFilteredOptions = selectorState.options.filter(
        (option) =>
          !selectorState.selected.includes(option) &&
          option.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredOptions(newFilteredOptions);
      if (newFilteredOptions.length > 0) {
        setSelectedOption(newFilteredOptions[0]);
      } else {
        setSelectedOption(null);
      }
    }
  };

  const handleDeleteFromSelected = (optionToDelete: string) => {
    if (selectorState.selected.includes(optionToDelete)) {
      setSelectorState({
        ...selectorState,
        selected: selectorState.selected.filter(
          (option) => option !== optionToDelete
        ),
      });
      setFilteredOptions(
        selector.options.filter(
          (option) =>
            !selectorState.selected.includes(option) ||
            option === optionToDelete
        )
      );
    }
    // Update the external state for "selected" here
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      event.key === "Backspace" &&
      event.currentTarget.selectionStart === 0 &&
      selector.multiple
    ) {
      const lastSelected =
        selectorState.selected[selectorState.selected.length - 1];
      if (lastSelected) {
        handleDeleteFromSelected(lastSelected);
      }
      // Update the external state for "selected" here
    } else if (event.key === "Enter") {
      if (selectedOption) {
        handleAddSelectedOption(selectedOption);
      }
    } else if (event.key === "ArrowDown") {
      if (filteredOptions.length > 0) {
        const index = filteredOptions.indexOf(selectedOption || "");
        if (index < filteredOptions.length - 1) {
          setSelectedOption(filteredOptions[index + 1]);
        }
      }
    } else if (event.key === "ArrowUp") {
      if (filteredOptions.length > 0) {
        const index = filteredOptions.indexOf(selectedOption || "");
        if (index > 0) {
          setSelectedOption(filteredOptions[index - 1]);
        }
      }
    }
  };

  const handleAddSelectedOption = (newOption: string) => {
    if (selectorState.options.includes(newOption)) {
      if (selectorState.multiple) {
        setSelectorState({
          ...selectorState,
          selected: [...selectorState.selected, newOption],
        });
        setFilteredOptions(
          selectorState.options.filter(
            (option) =>
              !selectorState.selected.includes(option) && option !== newOption
          )
        );
      } else {
        setSelectorState({
          ...selectorState,
          selected: [newOption],
        });
        setFilteredOptions(
          selectorState.options.filter((option) => option !== newOption)
        );
      }
      setSearchQuery("");
    }
    // Update the external state for "selected" here
  };

  return (
    <div
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
          background: "#f0efed",
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
          {selectorState.selected.map((option) => (
            <Chip
              key={option}
              label={option}
              onDelete={
                selector.multiple
                  ? () => handleDeleteFromSelected(option)
                  : undefined
              }
              sx={{ height: "21px" }}
            />
          ))}
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            ref={inputRef}
            // placeholder="Search shifts"
            style={{
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
            color: "rgba(55, 53, 47, 0.65)",
            padding: "0 16px 6px 16px",
          }}
        >
          {selector.multiple ? "Select one or more" : "Select one"}
        </div>
        <List dense={true} sx={{ padding: "0 0 0 0" }}>
          {filteredOptions.map((option) => (
            <ListItemButton
              key={option}
              onClick={() => {
                handleAddSelectedOption(option);
              }}
              selected={selectedOption === option}
              sx={{ padding: "0 0 0 0" }}
            >
              <ListItem sx={{ padding: "0 16px 0 16px" }}>
                <ListItemText primary={option} />
              </ListItem>
            </ListItemButton>
          ))}
        </List>
      </div>
    </div>
  );
}
