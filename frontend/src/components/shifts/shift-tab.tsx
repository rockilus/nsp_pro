import React, { useState, useEffect } from "react";
import { useTranslation } from "../../app/i18n/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import Box from "@mui/material/Box";
// Components
import ShiftTable from "./shift-table";
// Skeletons
import TablesSkeleton from "../skeletons/tables-skeleton";
// Actions
import {
  getShiftsTabData,
  addShift,
  deleteShift,
  addShiftDimension,
  updateShiftProperty,
  updateShiftDimension,
  updateShift,
  deleteShiftDimension,
} from "../../app/lib/shift";
// Styles
import "../../styles/tab-container-styles.css";
// Types
import { ShiftT, ShiftDimensionT, ShiftPropertyT } from "../../types/shift";

dayjs.extend(utc);

export default function ShiftTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  const { t } = useTranslation(lng, "shift-page");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [shiftDimensions, setShiftDimensions] = useState<ShiftDimensionT[]>([]);

  const DefaultWorkShiftFields: Record<string, string>[] = [
    { name: "color", label: t("color") },
    { name: "name", label: t("name") },
    { name: "start_time", label: t("start_time") },
    { name: "end_time", label: t("end_time") },
    { name: "staffing", label: t("staffing") },
  ];
  const DefaultRestShiftFields: Record<string, string>[] = [
    { name: "color", label: t("color") },
    { name: "name", label: t("name") },
    { name: "start_time", label: t("start_time") },
    { name: "end_time", label: t("end_time") },
  ];

  const roundTime = (dt: dayjs.Dayjs): dayjs.Dayjs => {
    let minutes = Math.floor(dt.minute() / 15) * 15;
    return dt.minute(minutes).second(0).millisecond(0);
  };

  //////////////////////////
  // Shift Actions
  //////////////////////////

  const handleAddShift = async (isRest: boolean) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const addedShift = await addShift({
      id: "",
      teamId: selectedTeamId,
      name: "",
      startTime: roundTime(dayjs.utc()),
      endTime: roundTime(dayjs.utc()),
      isTimeOff: isRest,
      staffing: 1,
      color: "grey",
      shiftProperties: [],
    });
    setShifts([...shifts, addedShift]);
  };

  const handleUpdateShift = async (shift: ShiftT) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const updatedShift = await updateShift(shift);
    setShifts((prevShifts) =>
      prevShifts.map((w) => (w.id === updatedShift.id ? updatedShift : w))
    );
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    await deleteShift(shiftId, selectedTeamId);
    setShifts(shifts.filter((shift) => shift.id !== shiftId));
  };

  //////////////////////////
  // Shift Dimension Actions
  //////////////////////////

  const handleAddShiftDimension = async (
    newShiftDimension: ShiftDimensionT
  ) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const { newDimension, newProperties } = await addShiftDimension(
      newShiftDimension
    );
    setShiftDimensions([...shiftDimensions, newDimension]);
    setShifts((prevShifts) =>
      prevShifts.map((shift) => {
        const newShiftProperties = newProperties.filter(
          (property) => property.shiftId === shift.id
        );

        return newShiftProperties
          ? {
              ...shift,
              shiftProperties: [
                ...shift.shiftProperties,
                ...newShiftProperties,
              ],
            }
          : shift;
      })
    );
    return true;
  };

  const handleUpdateShiftDimension = async (
    shiftDimension: ShiftDimensionT
  ) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const updatedShiftDimension = await updateShiftDimension(shiftDimension);
    setShiftDimensions((prevShiftDimensions) =>
      prevShiftDimensions.map((shiftDimension) =>
        shiftDimension.id === updatedShiftDimension.id
          ? updatedShiftDimension
          : shiftDimension
      )
    );
  };

  const handleDeleteShiftDimension = async (shiftDimensionId: string) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    await deleteShiftDimension(shiftDimensionId, selectedTeamId);
    setShiftDimensions(
      shiftDimensions.filter(
        (shiftDimension) => shiftDimension.id !== shiftDimensionId
      )
    );
  };
  //////////////////////////
  // Shift Property Actions
  //////////////////////////

  const handleUpdateShiftProperty = async (shiftProperty: ShiftPropertyT) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const updatedShiftProperty = await updateShiftProperty(
      shiftProperty,
      selectedTeamId
    );
    setShifts((prevShifts) =>
      prevShifts.map((shift) =>
        shift.id === updatedShiftProperty.shiftId
          ? {
              ...shift,
              shiftProperties: shift.shiftProperties.some(
                (shiftProperty) => shiftProperty.id === updatedShiftProperty.id
              )
                ? shift.shiftProperties.map((shiftProperty) =>
                    shiftProperty.id === updatedShiftProperty.id
                      ? { ...shiftProperty, ...updatedShiftProperty }
                      : shiftProperty
                  )
                : [...shift.shiftProperties, updatedShiftProperty],
            }
          : shift
      )
    );
  };

  useEffect(() => {
    const fetchShiftsTabData = async () => {
      setIsLoading(true);
      if (selectedTeamId) {
        const {
          shifts: fetchedShifts,
          shiftDimensions: fetchedShiftDimensions,
        }: { shifts: ShiftT[]; shiftDimensions: ShiftDimensionT[] } =
          await getShiftsTabData(selectedTeamId);
        setShifts(fetchedShifts);
        setShiftDimensions(fetchedShiftDimensions);
        setIsLoading(false);
      }
    };
    fetchShiftsTabData();
  }, [selectedTeamId]);

  return (
    <div className="tab-container-wide">
      {isLoading ? (
        <TablesSkeleton numTables={2} numInternalRows={3} />
      ) : (
        selectedTeamId && (
          <div>
            <ShiftTable
              lng={lng}
              selectedTeamId={selectedTeamId}
              isRest={false}
              shiftDimensions={shiftDimensions.filter((sd) => !sd.isRest)}
              shifts={shifts.filter((s) => !s.isTimeOff)}
              defaultShiftFields={DefaultWorkShiftFields}
              handleAddShift={handleAddShift}
              handleDeleteShift={handleDeleteShift}
              handleAddShiftDimension={handleAddShiftDimension}
              handleUpdateShiftProperty={handleUpdateShiftProperty}
              handleUpdateShiftDimension={handleUpdateShiftDimension}
              handleUpdateShift={handleUpdateShift}
              handleDeleteShiftDimension={handleDeleteShiftDimension}
            />
            <div className="divider" />
            <ShiftTable
              lng={lng}
              selectedTeamId={selectedTeamId}
              isRest={true}
              shiftDimensions={shiftDimensions.filter((sd) => sd.isRest)}
              shifts={shifts.filter((s) => s.isTimeOff)}
              defaultShiftFields={DefaultWorkShiftFields}
              handleAddShift={handleAddShift}
              handleDeleteShift={handleDeleteShift}
              handleAddShiftDimension={handleAddShiftDimension}
              handleUpdateShiftProperty={handleUpdateShiftProperty}
              handleUpdateShiftDimension={handleUpdateShiftDimension}
              handleUpdateShift={handleUpdateShift}
              handleDeleteShiftDimension={handleDeleteShiftDimension}
            />
          </div>
        )
      )}
    </div>
  );
}
