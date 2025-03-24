import React, { useState } from "react";
// Styles
import "./lhs-tab.css";
// Types
import { LHSTabContentT } from "../../../types/schedule";

const LHSTab = ({
  tabContent,
  selectedTab,
  toggleTab,
}: {
  tabContent: LHSTabContentT[];
  selectedTab: string | null;
  toggleTab: (tabName: string) => void;
}) => {
  const selectedTabContent = tabContent.find((tab) => tab.name === selectedTab);

  return (
    <div className={`lhs-tab-container ${selectedTab ? "open" : "closed"}`}>
      <div className={`drawer ${selectedTab ? "open" : "closed"}`}>
        <div className="drawer-content">
          {selectedTabContent ? selectedTabContent.content : null}
        </div>
      </div>
      <div className="main-content">
        <div className={`buttons-container ${selectedTab ? "open" : "closed"}`}>
          {tabContent.map((lhsTabContent) => (
            <button
              key={lhsTabContent.name}
              className={`tab-button ${
                selectedTab === lhsTabContent.name ? "selected" : ""
              }`}
              onClick={() => toggleTab(lhsTabContent.name)}
            >
              {lhsTabContent.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LHSTab;
