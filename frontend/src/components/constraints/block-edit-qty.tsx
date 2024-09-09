import React, { useState, useEffect, useCallback } from "react";
// Types
import { BlockT, TemplateBlockT } from "../../types/constraint";
// Constants
import { ConstraintDefaultColors } from "../../constants/constants";

export default function BlockEditQty({
  block,
  templateBlock,
  handleEditBlock,
  handleClose,
}: {
  block: BlockT | null;
  templateBlock: TemplateBlockT;
  handleEditBlock: (block: BlockT) => void;
  handleClose: () => void;
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

  useEffect(() => {
    if (block !== null) {
      setValueState(initialValue);
    }
  }, [block, initialValue]);

  const handleSubmit = useCallback(() => {
    if (valueState !== "") {
      handleEditBlock({
        name: templateBlock.name,
        type: templateBlock.type,
        value: parseInt(valueState),
      });
      handleClose();
    }
  }, [handleEditBlock, templateBlock, valueState, handleClose]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "Escape") {
      handleSubmit();
    }
  };

  return (
    <div>
      <div className="field-input">
        <input
          type="number"
          value={valueState}
          onChange={(e) => {
            setValueState(e.target.value);
          }}
          onBlur={handleSubmit}
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
