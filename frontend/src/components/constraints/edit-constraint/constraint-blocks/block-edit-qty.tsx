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

  useEffect(() => {
    if (block !== null) {
      setValueState(initialValue);
    }
  }, [block, initialValue]);

  // Reset initial focus flag when component mounts
  useEffect(() => {
    setIsInitialFocus(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (valueState !== "") {
      handleEditBlock({
        name: templateBlock.name,
        type: templateBlock.type,
        value: parseInt(valueState),
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
          value={valueState}
          onChange={(e) => {
            setValueState(e.target.value);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
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
