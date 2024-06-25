// Constants
import { ConstraintDefaultColors } from "../../constants/constants";

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

export const blockDisplayPlaceholder = (placeholder: string | number) => {
  return (
    <div
      className="field-value"
      style={{
        display: "inline-block",
        cursor: "pointer",
        fontStyle: "italic",
        fontWeight: "bold",
        color: ConstraintDefaultColors.shade2,
      }}
    >
      {placeholder}
    </div>
  );
};

export const blockDisplayName = (name: string) => {
  return (
    <div>
      <hr style={{ marginTop: "1px", marginBottom: "0px" }} />
      <div
        className="field-name"
        style={{
          fontSize: "10px",
          color: ConstraintDefaultColors.shade3,
        }}
      >
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
