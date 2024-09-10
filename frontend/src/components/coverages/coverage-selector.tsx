import React from "react";
import { useTranslation } from "../../app/i18n/client";
// Components
import CoverageList from "./coverage-list";
import TableAddButton from "../buttons/table-add-button";
// Styles
import "../../styles/text-styles.css";
import "./coverage-selector.css";
// Types
import { CoverageT } from "../../types/coverage";

export default function CoverageSelector({
  lng,
  coverages,
  selectedCoverage,
  editingName,
  handleSelectCoverage,
  setEditingName,
  handleAddCoverage,
  handleUpdateCoverage,
  handleDeleteCoverage,
}: {
  lng: string;
  coverages: CoverageT[];
  selectedCoverage: CoverageT | null;
  editingName: boolean;
  handleSelectCoverage: (coverage: CoverageT) => void;
  setEditingName: (editingName: boolean) => void;
  handleAddCoverage: () => void;
  handleUpdateCoverage: (updatedCoverage: CoverageT) => void;
  handleDeleteCoverage: (coverageId: string) => void;
}) {
  const { t } = useTranslation(lng, "coverage-page");

  return (
    <div className="coverage-selector-container">
      <span className="title">{t("weekly_planners")}</span>
      <CoverageList
        coverages={coverages}
        selectedCoverage={selectedCoverage}
        editingName={editingName}
        handleSelectCoverage={handleSelectCoverage}
        setEditingName={setEditingName}
        handleUpdateCoverage={handleUpdateCoverage}
        handleDeleteCoverage={handleDeleteCoverage}
      />
      <TableAddButton text={t("planner")} handleClick={handleAddCoverage} />
    </div>
  );
}
