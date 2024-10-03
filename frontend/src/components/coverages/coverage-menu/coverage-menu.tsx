import React from "react";
import { useTranslation } from "../../../app/i18n/client";
// Components
import CoverageSelector from "./coverage-selector/coverage-selector";
import ShiftDemandQuickAdd from "./shift-demand-quick-add/shift-demand-quick-add";
// Styles
import "../../../styles/text-styles.css";
import "../../../styles/tab-container-styles.css";
import "./coverage-menu.css";
// Types
import { CoverageT, ShiftDemandT } from "../../../types/coverage";
import { ShiftT } from "../../../types/shift";

export default function CoverageMenu({
  lng,
  coverages,
  shiftDemands,
  shifts,
  selectedCoverage,
  editingName,
  handleSelectCoverage,
  setEditingName,
  handleAddCoverage,
  handleUpdateCoverage,
  handleDeleteCoverage,
  handleAddShiftDemands,
  handleDeleteShiftDemands,
}: {
  lng: string;
  coverages: CoverageT[];
  shiftDemands: ShiftDemandT[];
  shifts: ShiftT[];
  selectedCoverage: CoverageT | null;
  editingName: boolean;
  handleSelectCoverage: (coverage: CoverageT) => void;
  setEditingName: (editingName: boolean) => void;
  handleAddCoverage: () => void;
  handleUpdateCoverage: (updatedCoverage: CoverageT) => void;
  handleDeleteCoverage: (coverageId: string) => void;
  handleAddShiftDemands: (shiftDemand: ShiftDemandT[]) => void;
  handleDeleteShiftDemands: (shiftDemandId: string[]) => void;
}) {
  const { t } = useTranslation(lng, "coverage-page");

  return (
    <div className="coverage-menu-container">
      <CoverageSelector
        lng={lng}
        coverages={coverages}
        selectedCoverage={selectedCoverage}
        editingName={editingName}
        handleSelectCoverage={handleSelectCoverage}
        setEditingName={setEditingName}
        handleAddCoverage={handleAddCoverage}
        handleUpdateCoverage={handleUpdateCoverage}
        handleDeleteCoverage={handleDeleteCoverage}
      />
      <div className="divider" />
      {selectedCoverage && (
        <ShiftDemandQuickAdd
          lng={lng}
          selectedCoverage={selectedCoverage}
          shifts={shifts}
          shiftDemands={shiftDemands}
          handleAddShiftDemands={handleAddShiftDemands}
          handleDeleteShiftDemands={handleDeleteShiftDemands}
        />
      )}
    </div>
  );
}
