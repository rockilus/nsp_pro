import React from "react";
import GreyElement from "./TestGrey";
import BlackSquare from "./TestBlack";

const ParentComponent = () => {
  return (
    <div style={{ position: "relative", width: "500px", height: "500px" }}>
      <GreyElement />
      <BlackSquare />
    </div>
  );
};

export default ParentComponent;
