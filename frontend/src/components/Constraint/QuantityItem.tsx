import React, { useState, useRef, useEffect, useCallback } from "react";

interface Props {
  selector: {
    name: string;
    options: string[];
    selected: string[];
    multiple: boolean;
  };
}

export default function QuantityItem({ selector }: Props) {
  const [edit, setEdit] = useState<boolean>(false);
  const [valueState, setValueState] = useState<string>(selector.selected[0]);

  const handleClick = () => {
    setEdit(true);
  };

  const handleClose = useCallback(() => {
    setEdit(false);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "Escape") {
      handleClose();
    }
  };

  return (
    <div>
      <div className="field-name" style={{ fontSize: "10px" }}>
        {selector.name}
      </div>
      {edit ? (
        <div className="field-input">
          <input
            type="number"
            value={valueState}
            onChange={(e) => {
              setValueState(e.target.value);
            }}
            onBlur={handleClose}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              appearance: "textfield",
              MozAppearance: "textfield",
              WebkitAppearance: "none",
            }}
          />
        </div>
      ) : (
        <div
          className="field-value"
          onClick={handleClick}
          style={{ fontWeight: "bold", cursor: "pointer" }}
        >
          {valueState}
        </div>
      )}
    </div>
  );
}
