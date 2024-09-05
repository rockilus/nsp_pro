import React, { useState } from "react";
import "./lhs-tab.css";

const LHSTab = ({ tabContent }: { tabContent: React.ReactNode }) => {
  const [isBreachListOpen, setIsBreachListOpen] = useState(false);

  const toggleBreachList = () => {
    setIsBreachListOpen(!isBreachListOpen);
  };

  return (
    <div
      className={`lhs-tab-container ${isBreachListOpen ? "open" : "closed"}`}
    >
      <div className={`drawer ${isBreachListOpen ? "open" : "closed"}`}>
        <div className="drawer-content">{tabContent}</div>
      </div>
      <div className="main-content">
        <button
          className={`tab-button ${isBreachListOpen ? "open" : "closed"}`}
          onClick={toggleBreachList}
        >
          Info
        </button>
        {/* Your main content goes here */}
      </div>
    </div>
  );
};

export default LHSTab;
