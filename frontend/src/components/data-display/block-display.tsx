// Constants
import { ConstraintDefaultColors } from "../../constants/constants";
// Styles
import "./block-display.css";

export const blockDislayValue = (value: string | number) => {
  return (
    <div
      className="field-value"
      style={{
        display: "inline-block",
        cursor: "pointer",
        fontWeight: "bold",
        color: ConstraintDefaultColors.shade3,
      }}
    >
      {value}
    </div>
  );
};

export const blockDisplayPlaceholder = (
  placeholder: string | number,
  error?: boolean
) => {
  return (
    <div className={`placeholder-value ${error ? "error" : ""}`}>
      {placeholder}
    </div>
  );
};

export const blockDisplayName = (name: string, error?: boolean) => {
  return (
    <div>
      <hr className={`name-display-line ${error ? "error" : ""}`} />
      <div className={`name-display-field-name ${error ? "error" : ""}`}>
        {name.charAt(0).toUpperCase() + name.slice(1)}
      </div>
    </div>
  );
};

export const blockDisplayText = (text: string) => {
  return (
    <div
      className="field-value"
      style={{
        display: "inline-block",
        color: ConstraintDefaultColors.shade3,
      }}
    >
      {text}
    </div>
  );
};
