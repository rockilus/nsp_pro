import { relative } from "path";
import React from "react";
import RedSquare from "./TestRed";

const BlackSquare = () => {
  return (
    <div
      style={{
        width: "50px",
        height: "50px",
        backgroundColor: "black",
        position: "absolute",
        top: "50px", // Adjust position as needed
        left: "20px", // Adjust position as needed
      }}
    >
      <div style={{ width: "100%", height: "100%", position: "relative" }}>
        <RedSquare />
      </div>
      {/* Content */}
    </div>
  );
};

export default BlackSquare;
