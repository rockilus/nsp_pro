import React, { useEffect, useState } from "react";
import { useTranslation } from "../../app/i18n/client";
// Components
import CoverageSelector from "./coverage-selector";
import WeeklyCalendar from "./weekly-calendar";
// Skeletons
import CoveragesSkeleton from "../skeletons/coverages-skeleton";
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
// Styles
import "../../styles/tab-container-styles.css";
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

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [coverages, setCoverages] = useState<CoverageT[]>([]);

  const [selectedCoverage, setSelectedCoverage] = useState<CoverageT | null>(
    null
  );
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
    setSelectedCoverage(null);
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
    if (selectedCoverage && selectedCoverage.id === newShiftDemand.coverageId) {
      setSelectedCoverage((prevCoverage) => {
        if (!prevCoverage) {
          return null;
        }
        return {
          ...prevCoverage,
          shiftDemands: [...prevCoverage.shiftDemands, newShiftDemand],
        };
      });
    }
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
    if (
      selectedCoverage &&
      selectedCoverage.id === updatedShiftDemand.coverageId
    ) {
      setSelectedCoverage((prevCoverage) => {
        if (!prevCoverage) {
          return null;
        }
        return {
          ...prevCoverage,
          shiftDemands: prevCoverage.shiftDemands.map((shiftDemand) =>
            shiftDemand.id === updatedShiftDemand.id
              ? updatedShiftDemand
              : shiftDemand
          ),
        };
      });
    }
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
    if (selectedCoverage && selectedCoverage.id === coverageId) {
      setSelectedCoverage((prevCoverage) => {
        if (!prevCoverage) {
          return null;
        }
        return {
          ...prevCoverage,
          shiftDemands: prevCoverage.shiftDemands.filter(
            (shiftDemand) => shiftDemand.id !== shiftDemandId
          ),
        };
      });
    }
  };

  useEffect(() => {
    const fetchCoveragesTabData = async () => {
      setIsLoading(true);
      if (selectedTeamId) {
        const {
          shifts: fetchedShifts,
          coverages: fetchedCoverages,
        }: { shifts: ShiftT[]; coverages: CoverageT[] } =
          await getCoveragesTabData(selectedTeamId);
        setShifts(fetchedShifts);
        setCoverages(fetchedCoverages);
        if (fetchedCoverages.length > 0) {
          setSelectedCoverage(fetchedCoverages[0]);
        }
        setIsLoading(false);
      }
    };
    fetchCoveragesTabData();
  }, [selectedTeamId]);

  return (
    <div className="tab-container-ultrawide">
      {isLoading ? (
        <CoveragesSkeleton />
      ) : (
        <div className="tab-container-row">
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
          <div className="divider-vertical" />
          <WeeklyCalendar
            lng={lng}
            coverage={selectedCoverage}
            shifts={shifts}
            handleAddShiftDemand={handleAddShiftDemand}
            handleUpdateShiftDemand={handleUpdateShiftDemand}
            handleDeleteShiftDemand={handleDeleteShiftDemand}
          />
        </div>
      )}
    </div>
  );
}
