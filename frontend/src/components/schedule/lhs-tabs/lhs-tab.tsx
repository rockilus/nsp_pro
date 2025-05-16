import React, { useState } from "react";
// Styles
import "./lhs-tab.css";
// Types
import { LHSTabContentT } from "../../../types/schedule";
import { TeamWithMembership } from "@/types/team";

const LHSTab = ({
  teamWithMembership,
  tabContent,
  selectedTab,
  toggleTab,
}: {
  teamWithMembership: TeamWithMembership;
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
          {tabContent
            .filter((lhsTabContent) => {
              if (
                ["breaches", "quick_staffing"].includes(lhsTabContent.name) &&
                teamWithMembership.team.useSolver === false
              ) {
                return false;
              }
              return lhsTabContent.name !== "create_assignment";
            })
            .map((lhsTabContent) => (
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
