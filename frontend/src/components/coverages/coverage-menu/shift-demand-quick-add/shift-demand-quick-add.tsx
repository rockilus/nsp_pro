import React from "react";
import { useTranslation } from "../../../../app/i18n/client";
// Styles
import "../../../../styles/text-styles.css";
import "./shift-demand-quick-add.css";
// Types
import { CoverageT, ShiftDemandT } from "../../../../types/coverage";
import { ShiftT } from "../../../../types/shift";

export default function ShiftDemandQuickAdd({
  lng,
  shifts,
  selectedCoverage,
}: {
  lng: string;
  shifts: ShiftT[];
  selectedCoverage: CoverageT;
}) {
  const { t } = useTranslation(lng, "coverage-page");

  const checkShiftDemandWorkWeek = (shiftId: string): boolean => {
    const requiredIndexes = [0, 1, 2, 3, 4];
    const dayIndexes = selectedCoverage.shiftDemands
      .filter((d) => d.shift.id === shiftId)
      .map((d) => d.dayIndex);
    return requiredIndexes.every((index) => dayIndexes.includes(index));
  };

  const checkShiftDemandWeekend = (shiftId: string): boolean => {
    const requiredIndexes = [5, 6];
    const dayIndexes = selectedCoverage.shiftDemands
      .filter((d) => d.shift.id === shiftId)
      .map((d) => d.dayIndex);
    return requiredIndexes.every((index) => dayIndexes.includes(index));
  };

  const checkShiftDemandWeek = (shiftId: string): boolean => {
    const requiredIndexes = [0, 1, 2, 3, 4, 5, 6];
    const dayIndexes = selectedCoverage.shiftDemands
      .filter((d) => d.shift.id === shiftId)
      .map((d) => d.dayIndex);
    return requiredIndexes.every((index) => dayIndexes.includes(index));
  };

  return (
    <div className="coverage-selector-container">
      {/* <span className="title">{t("weekly_planners")}</span> */}
      <span className="title">Quick add</span>
      {shifts.map((shift) => (
        <div key={shift.id} className="shift-list-item">
          <span>{shift.name}</span>
          <div className="add-buttons-container">
            <button className="add-shift-demands-button">+work week</button>
            <button className="add-shift-demands-button">+weekend</button>
            <button className="add-shift-demands-button">+week</button>
          </div>
        </div>
      ))}
    </div>
  );
}
