import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../../app/i18n/client";
// Styles
import "../../../../styles/text-styles.css";
import "./shift-demand-quick-add.css";
// Types
import { CoverageT, ShiftDemandT } from "../../../../types/coverage";
import { ShiftT } from "../../../../types/shift";

dayjs.extend(utc);

export default function ShiftDemandQuickAdd({
  lng,
  shifts,
  shiftDemands,
  selectedCoverage,
  handleAddShiftDemands,
  handleDeleteShiftDemands,
}: {
  lng: string;
  shifts: ShiftT[];
  shiftDemands: ShiftDemandT[];
  selectedCoverage: CoverageT;
  handleAddShiftDemands: (shiftDemand: ShiftDemandT[]) => void;
  handleDeleteShiftDemands: (shiftDemandId: string[]) => void;
}) {
  const { t } = useTranslation(lng, "coverage-page");

  const [shiftDemandsCoverage, setShiftDemandsCoverage] = useState<
    ShiftDemandT[]
  >(shiftDemands.filter((sd) => sd.coverageId === selectedCoverage.id));

  const timeFrames = [
    {
      name: "work_week",
      label: t("work_week").toLowerCase(),
      requiredIndexes: [0, 1, 2, 3, 4],
    },
    {
      name: "weekend",
      label: t("weekend").toLowerCase(),
      requiredIndexes: [5, 6],
    },
    {
      name: "week",
      label: t("week").toLowerCase(),
      requiredIndexes: [0, 1, 2, 3, 4, 5, 6],
    },
  ];

  const arraysMatch = (arr1: number[], arr2: number[]): boolean => {
    const sortedArr1 = Array.from(new Set(arr1)).sort();
    const sortedArr2 = Array.from(new Set(arr2)).sort();
    if (sortedArr1.length !== sortedArr2.length) {
      return false;
    }
    return sortedArr1.every((value, index) => value === sortedArr2[index]);
  };

  const checkShiftDemandTargetIndexes = (
    shiftId: string,
    requiredIndexes: number[]
  ): boolean => {
    const dayIndexes = shiftDemandsCoverage
      .filter((d) => d.shiftId === shiftId)
      .map((d) => d.dayIndex);
    return arraysMatch(requiredIndexes, dayIndexes);
  };

  const handleSwitchTargetShiftDemands = (
    shiftId: string,
    requiredIndexes: number[]
  ) => {
    const dayIndexes = shiftDemandsCoverage
      .filter((d) => d.shiftId === shiftId)
      .map((d) => d.dayIndex);
    const indexesMatch = arraysMatch(requiredIndexes, dayIndexes);
    if (indexesMatch) {
      const shiftDemandToDeleteIds = shiftDemandsCoverage
        .filter((sd) => sd.shiftId === shiftId)
        .map((sd) => sd.id);
      handleDeleteShiftDemands(shiftDemandToDeleteIds);
      return;
    }
    const missingIndexes = requiredIndexes.filter(
      (index) => !dayIndexes.includes(index)
    );
    const excessIndexes = dayIndexes.filter(
      (index) => !requiredIndexes.includes(index)
    );
    const newShiftDemands: ShiftDemandT[] = missingIndexes.map((index) => ({
      id: `id-${dayjs().valueOf()}`,
      coverageId: selectedCoverage.id,
      shiftId,
      dayIndex: index,
      lastModified: dayjs.utc().unix(),
    }));
    const shiftDemandToDeleteIds = excessIndexes
      .map(
        (index) =>
          shiftDemandsCoverage.find(
            (d) => d.shiftId === shiftId && d.dayIndex === index
          )?.id
      )
      .filter((id) => id !== undefined) as string[];
    if (newShiftDemands.length > 0) {
      handleAddShiftDemands(newShiftDemands);
    }
    if (shiftDemandToDeleteIds.length > 0) {
      handleDeleteShiftDemands(shiftDemandToDeleteIds);
    }
  };

  useEffect(() => {
    setShiftDemandsCoverage(
      shiftDemands.filter((sd) => sd.coverageId === selectedCoverage.id)
    );
  }, [shiftDemands, selectedCoverage]);

  return (
    <div className="quick-add-container">
      <span className="title">{t("quick_add")}</span>
      {shifts.map((shift) => (
        <div key={shift.id} className="shift-list-item">
          <span>{shift.name}</span>
          <div className="add-buttons-container">
            {timeFrames.map((timeFrame) => (
              <button
                key={timeFrame.name}
                className={`add-shift-demands-button ${
                  checkShiftDemandTargetIndexes(
                    shift.id,
                    timeFrame.requiredIndexes
                  )
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleSwitchTargetShiftDemands(
                    shift.id,
                    timeFrame.requiredIndexes
                  )
                }
              >
                {`+${timeFrame.label}`}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
