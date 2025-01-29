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
import ClearIcon from "@mui/icons-material/Clear";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
// Utils
import { getShiftWorkerOptionDisplayName } from "../../shift-worker-option-utils/shift-worker-option-utils";
// Types
import {
  BlockT,
  TemplateBlockT,
  ShiftWorkerOptionT,
  SWOIdTypes,
} from "../../../../types/constraint";
import { WorkerT } from "../../../../types/worker";
import { ShiftT } from "../../../../types/shift";
// Constants
import { ConstraintDefaultColors } from "../../../../constants/constants";

export default function BlockEditShiftWorkerOption({
  lng,
  // workers,
  // shifts,
  index,
  block,
  templateBlock,
  error,
  shiftWorkerOptionDict,
  handleEditBlock,
  handleClose,
  translateOptionName,
  handleRemoveError,
  swoDisplayString,
}: {
  lng: string;
  // workers: WorkerT[];
  // shifts: ShiftT[];
  index: number;
  block: BlockT | null;
  templateBlock: TemplateBlockT;
  error: boolean;
  shiftWorkerOptionDict: { [key: string]: ShiftWorkerOptionT[] };
  handleEditBlock: (block: BlockT) => void;
  handleClose: () => void;
  translateOptionName: (name: string) => string;
  handleRemoveError: (index: number) => void;
  swoDisplayString: (swo: ShiftWorkerOptionT) => string;
}) {
  const { t } = useTranslation(lng, "constraint-page");

  const translateSectionLabel = (label: string) => {
    switch (label) {
      case "Workers":
        return t("workers");
      case "Shifts":
        return t("shifts");
      case "All":
        return t("all");
      case "Specialties":
        return t("specialties");
      case "Duties":
        return t("duties");
      default:
        return label;
    }
  };

  function isDictionary(obj: any): obj is Record<string, unknown> {
    return (
      obj !== null &&
      typeof obj === "object" &&
      !Array.isArray(obj) &&
      !(obj instanceof Date) &&
      !(obj instanceof RegExp) &&
      !(obj instanceof Function)
    );
  }

  const isShiftWorkerOptionT = useCallback((dict: unknown): boolean => {
    return (
      isDictionary(dict) &&
      "name" in dict &&
      "id" in dict &&
      "idType" in dict &&
      "isBoolDim" in dict &&
      "categoryName" in dict &&
      (typeof dict.name === "string" || typeof dict.name === "boolean") &&
      typeof dict.id === "string" &&
      typeof dict.idType === "number" &&
      typeof dict.isBoolDim === "boolean" &&
      typeof dict.categoryName === "string"
    );
  }, []);

  const initialValue = useCallback((): ShiftWorkerOptionT[] => {
    if (block === null) {
      return [];
    }
    if (
      Array.isArray(block.value) &&
      (block.value as any[]).every(isShiftWorkerOptionT)
    ) {
      return block.value as ShiftWorkerOptionT[];
    }
    throw new Error("block.value is not an array of ShiftWorkerOptionT");
  }, [block, isShiftWorkerOptionT]);

  const filterOptionsList = useCallback(
    (
      searchQuery: string,
      selectedOptions: ShiftWorkerOptionT[],
      options: ShiftWorkerOptionT[]
    ): ShiftWorkerOptionT[] => {
      const selectedArray: string[] = selectedOptions.map((item) =>
        swoDisplayString(item)
      );
      console.log("selectedArray", selectedArray);

      return searchQuery === ""
        ? options.filter(
            (option) =>
              !selectedArray.includes(
                getShiftWorkerOptionDisplayName(option, t("not"))
              )
          )
        : options.filter(
            (option) =>
              !selectedArray.includes(
                getShiftWorkerOptionDisplayName(option, t("not"))
              ) &&
              getShiftWorkerOptionDisplayName(option, t("not"))
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
          );
    },
    []
  );

  const filterOptions = useCallback(
    (
      searchQuery: string,
      selectedOptions: ShiftWorkerOptionT[],
      options: { [key: string]: ShiftWorkerOptionT[] }
    ): { [key: string]: ShiftWorkerOptionT[] } => {
      let out: { [key: string]: ShiftWorkerOptionT[] } = {};
      for (let key of Object.keys(options)) {
        const filteredKeyOptions = filterOptionsList(
          searchQuery,
          selectedOptions,
          options[key]
        );
        if (filteredKeyOptions.length > 0) {
          out[key] = filteredKeyOptions;
        }
      }
      return out;
    },
    [filterOptionsList]
  );

  const [valueState, setValueState] =
    useState<ShiftWorkerOptionT[]>(initialValue);
  const [templateOptions, setTemplateOptions] = useState<{
    [key: string]: ShiftWorkerOptionT[];
  }>(shiftWorkerOptionDict);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredOptions, setFilteredOptions] = useState<{
    [key: string]: ShiftWorkerOptionT[];
  }>(filterOptions("", valueState, templateOptions));
  const [selectedOption, setSelectedOption] = useState<{
    [key: string]: ShiftWorkerOptionT;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (block !== null) {
      setValueState(initialValue);
    }
  }, [block, initialValue]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value.trim();
    setSearchQuery(query);
    const newFilteredOptions = filterOptions(
      query,
      valueState,
      templateOptions
    );
    setFilteredOptions(newFilteredOptions);
    if (Object.keys(newFilteredOptions).length > 0) {
      for (let key of Object.keys(newFilteredOptions)) {
        if (newFilteredOptions[key].length > 0) {
          setSelectedOption({ [key]: newFilteredOptions[key][0] });
          break;
        }
      }
    } else {
      setSelectedOption(null);
    }
  };

  const handleDeleteFromSelected = (optionToDelete: ShiftWorkerOptionT) => {
    if (valueState.includes(optionToDelete)) {
      const newValue = valueState.filter((option) => option !== optionToDelete);
      handleEditBlock({
        name: templateBlock.name,
        type: templateBlock.type,
        value: newValue,
      });
      setFilteredOptions(filterOptions(searchQuery, newValue, templateOptions));
    }
    // Update the external state for "selected" here
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && event.currentTarget.selectionStart === 0) {
      const lastSelected = valueState[valueState.length - 1];
      if (lastSelected) {
        handleDeleteFromSelected(lastSelected);
      }
      // Update the external state for "selected" here
    } else if (event.key === "Enter") {
      if (selectedOption) {
        handleAddSelectedOption(
          Object.keys(selectedOption)[0],
          Object.values(selectedOption)[0]
        );
      }
    } else if (event.key === "ArrowDown") {
      const keys = Object.keys(filteredOptions);
      const selectedOptionTemp = selectedOption || {
        [keys[0]]: filteredOptions[keys[0]][0],
      };
      if (!selectedOption) {
        setSelectedOption(selectedOptionTemp);
      } else if (keys.length > 0) {
        const selectKey = Object.keys(selectedOptionTemp)[0];
        const selectVal = Object.values(selectedOptionTemp)[0];
        let currentKeyIndex = keys.indexOf(selectKey);
        let currentValueIndex = filteredOptions[selectKey].indexOf(selectVal);
        if (currentValueIndex < filteredOptions[selectKey].length - 1) {
          // There is a next value in the current key's array
          setSelectedOption({
            [selectKey]: filteredOptions[selectKey][currentValueIndex + 1],
          });
        } else if (currentKeyIndex < keys.length - 1) {
          // There is a next key
          setSelectedOption({
            [keys[currentKeyIndex + 1]]:
              filteredOptions[keys[currentKeyIndex + 1]][0],
          });
        }
      }
    } else if (event.key === "ArrowUp") {
      const keys = Object.keys(filteredOptions);
      const selectedOptionTemp = selectedOption || {
        [keys[keys.length - 1]]:
          filteredOptions[keys[keys.length - 1]][
            filteredOptions[keys[keys.length - 1]].length - 1
          ],
      };
      if (!selectedOption) {
        setSelectedOption(selectedOptionTemp);
      } else if (keys.length > 0) {
        const selectKey = Object.keys(selectedOptionTemp)[0];
        const selectVal = Object.values(selectedOptionTemp)[0];
        let currentKeyIndex = keys.indexOf(selectKey);
        let currentValueIndex = filteredOptions[selectKey].indexOf(selectVal);
        if (currentValueIndex > 0) {
          // There is a previous value in the current key's array
          setSelectedOption({
            [selectKey]: filteredOptions[selectKey][currentValueIndex - 1],
          });
        } else if (currentKeyIndex > 0) {
          // There is a previous key
          const previousKey = keys[currentKeyIndex - 1];
          setSelectedOption({
            [previousKey]:
              filteredOptions[previousKey][
                filteredOptions[previousKey].length - 1
              ],
          });
        }
      }
    } else if (event.key === "Escape") {
      handleClose();
    }
  };

  const handleAddSelectedOption = (
    newOptionKey: string,
    newOption: ShiftWorkerOptionT
  ) => {
    if (
      newOptionKey in filteredOptions &&
      filteredOptions[newOptionKey].includes(newOption)
    ) {
      const newValue = [...valueState, newOption];
      handleEditBlock({
        name: templateBlock.name,
        type: templateBlock.type,
        value: newValue,
      });
      setFilteredOptions(filterOptions("", newValue, templateOptions));
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
          {valueState.map((option, index) => (
            <Chip
              key={index}
              label={swoDisplayString(option)}
              onDelete={() => handleDeleteFromSelected(option)}
              deleteIcon={
                <ClearIcon
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
          {t("select_one_or_more")}
        </div>
        <List
          sx={{
            width: "100%",
            maxWidth: 360,
            bgcolor: "background.paper",
            position: "relative",
            overflow: "auto",
            maxHeight: 300,
            "& ul": { padding: 0 },
          }}
          subheader={<li />}
        >
          {Object.keys(filteredOptions).map(
            (sectionLabel: string, sectionIndex: number) => (
              <li key={`section-${sectionIndex}`}>
                <ul>
                  <ListSubheader>
                    {translateSectionLabel(sectionLabel)}
                  </ListSubheader>
                  {filteredOptions[sectionLabel].map(
                    (option: ShiftWorkerOptionT, index: number) => (
                      <ListItemButton
                        key={`item-${sectionLabel}-${index}`}
                        onClick={() => {
                          handleAddSelectedOption(sectionLabel, option);
                        }}
                        selected={
                          selectedOption
                            ? selectedOption[sectionLabel] === option
                            : false
                        }
                        sx={{ padding: "0 0 0 0" }}
                      >
                        <ListItem sx={{ padding: "0 16px 0 16px" }}>
                          <ListItemText
                            primary={translateOptionName(
                              getShiftWorkerOptionDisplayName(option, t("not"))
                            )}
                            style={{ color: ConstraintDefaultColors.shade3 }}
                          />
                        </ListItem>
                      </ListItemButton>
                    )
                  )}
                </ul>
              </li>
            )
          )}
        </List>
      </div>
    </div>
  );
}
