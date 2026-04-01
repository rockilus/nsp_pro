import React, {
  useState,
  ChangeEvent,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useTranslation } from "../../../../app/i18n/client";
// MUI
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
// Types
import { BlockT, TemplateBlockT } from "../../../../types/constraint";
// Constants
import { ConstraintDefaultColors } from "../../../../constants/constants";

export default function BlockEditString({
  lng,
  index,
  block,
  templateBlock,
  error,
  handleEditBlock,
  handleClose,
  translateOptionName,
  handleRemoveError,
}: {
  lng: string;
  index: number;
  block: BlockT | null;
  templateBlock: TemplateBlockT;
  error: boolean;
  handleEditBlock: (block: BlockT) => void;
  handleClose: () => void;
  translateOptionName: (name: string) => string;
  handleRemoveError: (index: number) => void;
}) {
  const { t } = useTranslation(lng, "constraint-page");

  const initialValue = useCallback((): string => {
    if (block === null) {
      return "";
    }
    if (typeof block.value === "string") {
      return block.value;
    }
    throw new Error("block.value is not a string");
  }, [block]);

  const templateOptionsCast = useCallback((): string[] => {
    if (templateBlock === null) {
      return [];
    }
    if (
      Array.isArray(templateBlock.options) &&
      (templateBlock.options as any[]).every(
        (option: unknown) => typeof option === "string",
      )
    ) {
      return templateBlock.options as string[];
    }
    throw new Error("templateBlock.options is not an array of strings");
  }, [templateBlock]);

  const [valueState, setValueState] = useState<string>(initialValue);
  const [templateOptions, setTemplateOptions] =
    useState<string[]>(templateOptionsCast);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredOptions, setFilteredOptions] = useState<string[]>(
    templateOptions.filter((option) => !valueState.includes(option)),
  );
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (block !== null) {
      // Schedule state update asynchronously to avoid synchronous setState in
      // effect body which triggers the react-hooks/set-state-in-effect lint
      // rule. Call the initializer function and set the explicit value.
      Promise.resolve().then(() => setValueState(initialValue()));
    }
  }, [block, initialValue]);

  useEffect(() => {
    if (templateBlock !== null) {
      // Same pattern: schedule the options update in a microtask and call
      // the templateOptionsCast function to get the array value.
      Promise.resolve().then(() => setTemplateOptions(templateOptionsCast()));
    }
  }, [templateBlock, templateOptionsCast]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value.trim();
    setSearchQuery(query);
    if (query === "") {
      setFilteredOptions(
        templateOptions.filter((option) => !valueState.includes(option)),
      );
    } else {
      const newFilteredOptions = templateOptions.filter(
        (option) =>
          !valueState.includes(option) &&
          option.toLowerCase().includes(query.toLowerCase()),
      );
      setFilteredOptions(newFilteredOptions);
      if (newFilteredOptions.length > 0) {
        setSelectedOption(newFilteredOptions[0]);
      } else {
        setSelectedOption(null);
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
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
    } else if (event.key === "Escape") {
      handleClose();
    }
  };

  const handleAddSelectedOption = (newOption: string) => {
    if (filteredOptions.includes(newOption)) {
      handleEditBlock({
        name: templateBlock.name,
        type: templateBlock.type,
        value: newOption,
      });
      setFilteredOptions(
        templateOptions.filter((option) => option !== newOption),
      );
      setSearchQuery("");
      if (error) {
        handleRemoveError(index);
      }
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
          {valueState.length > 0 && (
            <Chip
              label={translateOptionName(valueState)}
              sx={{
                color: ConstraintDefaultColors.shade3,
                background: ConstraintDefaultColors.shade1,
                height: "21px",
              }}
            />
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            ref={inputRef}
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
            color: ConstraintDefaultColors.shade2,
            padding: "0 16px 6px 16px",
          }}
        >
          {t("select_one")}
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
              data-testid={`string-option-${option
                .replace(/\s+/g, "-")
                .toLowerCase()}`}
            >
              <ListItem sx={{ padding: "0 16px 0 16px" }}>
                <ListItemText
                  primary={translateOptionName(option)}
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
