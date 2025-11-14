import React, { useState, useEffect, useCallback, useRef } from "react";
// Types
import { BlockT, TemplateBlockT } from "../../../../types/constraint";
// Constants
import { ConstraintDefaultColors } from "../../../../constants/constants";

export default function BlockEditQty({
  index,
  block,
  templateBlock,
  error,
  handleEditBlock,
  handleClose,
  handleRemoveError,
}: {
  index: number;
  block: BlockT | null;
  templateBlock: TemplateBlockT;
  error: boolean;
  handleEditBlock: (block: BlockT) => void;
  handleClose: () => void;
  handleRemoveError: (index: number) => void;
}) {
  const initialValue = useCallback(() => {
    if (block === null) {
      return "";
    }
    if (typeof block.value === "number" || block.value === "") {
      return block.value.toString();
    }
    throw new Error("block.value is not a number");
  }, [block]);

  const [valueState, setValueState] = useState<string>(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isInitialFocus, setIsInitialFocus] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  // displayValue is derived from props when the user hasn't edited the input yet.
  // This avoids calling setState inside effects when `block` changes.
  const displayValue = !isDirty && block !== null ? initialValue() : valueState;

  const handleSubmit = useCallback(() => {
    const submittedValue =
      !isDirty && block !== null ? initialValue() : valueState;
    if (submittedValue !== "") {
      handleEditBlock({
        name: templateBlock.name,
        type: templateBlock.type,
        value: parseInt(submittedValue),
      });
      if (error) {
        handleRemoveError(index);
      }
      handleClose();
    }
  }, [
    templateBlock,
    valueState,
    error,
    index,
    handleEditBlock,
    handleClose,
    handleRemoveError,
    isDirty,
    block,
    initialValue,
  ]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "Escape") {
      handleSubmit();
    }
  };

  const handleBlur = () => {
    // Ignore the first blur event that occurs immediately after mounting
    if (isInitialFocus) {
      setIsInitialFocus(false);
      // Re-focus the input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else {
      handleSubmit();
    }
  };

  return (
    <div>
      <div className="field-input">
        <input
          ref={inputRef}
          type="number"
          value={displayValue}
          onChange={(e) => {
            setValueState(e.target.value);
            setIsDirty(true);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          data-testid="constraint-number-input"
          style={{
            color: ConstraintDefaultColors.shade3,
            appearance: "textfield",
            MozAppearance: "textfield",
            WebkitAppearance: "none",
          }}
        />
      </div>
    </div>
  );
}
