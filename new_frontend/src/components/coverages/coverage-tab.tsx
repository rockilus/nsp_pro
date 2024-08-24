import React, { useEffect, useState } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
// Components
import CoverageCalendar from "./coverage-calendar";
import CoverageOptions from "./coverage-options";
import WeeklyCalendar from "./weekly-calendar";
// Actions
import {
  getCoveragesTabData,
  addCoverage,
  updateCoverage,
  deleteCoverage,
  addShiftDemand,
  updateShiftDemand,
  deleteShiftDemand,
} from "../../app/lib/coverage";
// Types
import { CoverageT, ShiftDemandT } from "../../types/coverage";
import { ShiftT } from "../../types/shift";

export default function CoverageTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  const { t } = useTranslation(lng, "coverage-page");

  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [coverages, setCoverages] = useState<CoverageT[]>([]);

  const [selectedCoverage, setSelectedCoverage] = useState<
    CoverageT | undefined
  >(undefined);
  const [editingName, setEditingName] = useState<boolean>(false);

  const handleSelectCoverage = (coverage: CoverageT) => {
    setSelectedCoverage(coverage);
    setEditingName(false);
  };

  //////////////////////////
  // Coverage Actions
  //////////////////////////

  const handleAddCoverage = async () => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const newCoverage = await addCoverage({
      // id: `id-${Date.now()}`,
      id: "",
      teamId: selectedTeamId,
      name: t("new_planner"),
      shiftDemands: [],
    });
    setCoverages([...coverages, newCoverage]);
    setSelectedCoverage(newCoverage);
    setEditingName(true);
  };

  const handleUpdateCoverage = async (updatedCoverage: CoverageT) => {
    const newCoverage = await updateCoverage(updatedCoverage);
    setCoverages((prevCoverages) =>
      prevCoverages.map((coverage) =>
        coverage.id === newCoverage.id ? newCoverage : coverage
      )
    );
    setEditingName(false);
  };

  const handleDeleteCoverage = async (coverageId: string) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    await deleteCoverage(coverageId, selectedTeamId);
    setCoverages(coverages.filter((coverage) => coverage.id !== coverageId));
    setSelectedCoverage(undefined);
    setEditingName(false);
  };

  //////////////////////////
  // Shift Demand Actions
  //////////////////////////

  const handleAddShiftDemand = async (shiftDemand: ShiftDemandT) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const newShiftDemand = await addShiftDemand(shiftDemand, selectedTeamId);
    setCoverages((prevCoverages) =>
      prevCoverages.map((coverage) =>
        coverage.id === newShiftDemand.coverageId
          ? {
              ...coverage,
              shiftDemands: [...coverage.shiftDemands, newShiftDemand],
            }
          : coverage
      )
    );
  };

  const handleUpdateShiftDemand = async (updatedShiftDemand: ShiftDemandT) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    await updateShiftDemand(updatedShiftDemand, selectedTeamId);
    setCoverages((prevCoverages) =>
      prevCoverages.map((coverage) =>
        coverage.id === updatedShiftDemand.coverageId
          ? {
              ...coverage,
              shiftDemands: coverage.shiftDemands.map((shiftDemand) =>
                shiftDemand.id === updatedShiftDemand.id
                  ? updatedShiftDemand
                  : shiftDemand
              ),
            }
          : coverage
      )
    );
  };

  const handleDeleteShiftDemand = async (
    coverageId: string,
    shiftDemandId: string
  ) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    await deleteShiftDemand(coverageId, shiftDemandId, selectedTeamId);
    setCoverages((prevCoverages) =>
      prevCoverages.map((coverage) =>
        coverage.id === coverageId
          ? {
              ...coverage,
              shiftDemands: coverage.shiftDemands.filter(
                (shiftDemand) => shiftDemand.id !== shiftDemandId
              ),
            }
          : coverage
      )
    );
  };

  useEffect(() => {
    const fetchCoveragesTabData = async () => {
      if (selectedTeamId) {
        const {
          shifts: fetchedShifts,
          coverages: fetchedCoverages,
        }: { shifts: ShiftT[]; coverages: CoverageT[] } =
          await getCoveragesTabData(selectedTeamId);
        setShifts(fetchedShifts);
        setCoverages(fetchedCoverages);
      }
    };
    fetchCoveragesTabData();
  }, [selectedTeamId]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <WeeklyCalendar />
      <Box sx={{ display: "flex", flexDirection: "row" }}>
        <CoverageOptions
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
        <CoverageCalendar
          lng={lng}
          coverageId={selectedCoverage?.id || ""}
          shiftDemands={
            selectedCoverage
              ? coverages.find(
                  (coverage) => coverage.id === selectedCoverage.id
                )?.shiftDemands || []
              : []
          }
          shifts={shifts}
          handleAddShiftDemand={handleAddShiftDemand}
          handleUpdateShiftDemand={handleUpdateShiftDemand}
          handleDeleteShiftDemand={handleDeleteShiftDemand}
        />
      </Box>
    </Box>
  );
}
