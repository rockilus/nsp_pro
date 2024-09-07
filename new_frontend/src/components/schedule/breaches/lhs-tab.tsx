import React, { useState } from "react";
import "./lhs-tab.css";
// Components

const LHSTab = ({
  tabContent,
  selectedTab,
  toggleTab,
}: {
  tabContent: { [key: string]: React.ReactNode };
  selectedTab: string | null;
  toggleTab: (tabName: string) => void;
}) => {
  return (
    <div className={`lhs-tab-container ${selectedTab ? "open" : "closed"}`}>
      <div className={`drawer ${selectedTab ? "open" : "closed"}`}>
        <div className="drawer-content">
          {selectedTab ? tabContent[selectedTab] : null}
        </div>
      </div>
      <div className="main-content">
        <div className={`buttons-container ${selectedTab ? "open" : "closed"}`}>
          {Object.keys(tabContent).map((tabName) => (
            <button
              key={tabName}
              className={`tab-button ${
                selectedTab === tabName ? "selected" : ""
              }`}
              onClick={() => toggleTab(tabName)}
            >
              {tabName}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LHSTab;
