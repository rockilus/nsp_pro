import React, { useState, useEffect } from "react";
import { useTranslation } from "../../app/i18n/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Components
import ShiftTable from "./shift-table";
// Skeletons
import TablesSkeleton from "../skeletons/tables-skeleton";
// Actions
import {
  getShiftsTabData,
  addShift,
  deleteShift,
  updateShift,
} from "../../app/lib/shift";
import {
  addDimension,
  updateDimension,
  deleteDimension,
} from "../../app/lib/dimension";
import {
  addDimEntry,
  updateDimEntry,
  deleteDimEntry,
} from "../../app/lib/dim-entry";
import { updateAttribute } from "../../app/lib/attribute";
// Styles
import "../../styles/tab-container-styles.css";
// Types
import {
  ShiftT,
  ShiftLeaveType,
  ShiftType,
  ShiftRestType,
} from "../../types/shift";
import { DimEntryT, DimensionT, DimensionType } from "../../types/dimension";
import { AttributeT } from "../../types/attribute";

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
  const [dimensions, setDimensions] = useState<DimensionT[]>([]);
  const [dimEntries, setDimEntries] = useState<DimEntryT[]>([]);

  const DefaultWorkShiftFields: Record<string, string>[] = [
    { name: "color", label: t("color") },
    { name: "name", label: t("name") },
    { name: "duty", label: t("duty") },
    { name: "recuperation", label: t("recuperation") },
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
      staffing: 1,
      color: "grey",
      shiftType: isRest ? ShiftType.REST : ShiftType.NORMAL,
      restType: ShiftRestType.NONE,
      leaveType: ShiftLeaveType.NONE,
      recuperationTime: 0,
      recuperationDutyId: null,
      deleted: false,
      attributes: [],
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
  // Dimension Actions
  //////////////////////////

  const handleAddDimension = async (
    newDimension: DimensionT,
    newDimEntries: DimEntryT[]
  ) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const {
      newDimension: newDimensionResponse,
      newDimEntries: newDimEntriesResponse,
      newAttributes: newAttributesResponse,
    } = await addDimension(newDimension, newDimEntries);
    setDimensions([...dimensions, newDimensionResponse]);
    setDimEntries([...dimEntries, ...newDimEntriesResponse]);
    setShifts((prevShifts) =>
      prevShifts.map((shift) => {
        const newAttributes = newAttributesResponse.filter(
          (attribute) => attribute.ownerId === shift.id
        );
        return newAttributes
          ? {
              ...shift,
              attributes: [...shift.attributes, ...newAttributes],
            }
          : shift;
      })
    );
    return true;
  };

  const handleUpdateDimension = async (dimension: DimensionT) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const updatedDimension = await updateDimension(dimension);
    setDimensions((prevDimensions) =>
      prevDimensions.map((prevDim) =>
        prevDim.id === updatedDimension.id ? updatedDimension : prevDim
      )
    );
  };

  const handleDeleteDimension = async (dimensionId: string) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    await deleteDimension(dimensionId, selectedTeamId);
    setDimensions(dimensions.filter((d) => d.id !== dimensionId));
  };

  //////////////////////////
  // DimEntry Actions
  //////////////////////////

  const handleAddDimEntry = async (dimEntry: DimEntryT) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const newDimEntry = await addDimEntry(dimEntry, selectedTeamId);
    setDimEntries([...dimEntries, newDimEntry]);
  };

  const handleUpdateDimEntry = async (dimEntry: DimEntryT) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const updatedDimEntry = await updateDimEntry(dimEntry, selectedTeamId);
    setDimEntries((prevDimEntries) =>
      prevDimEntries.map((de) =>
        de.id === updatedDimEntry.id ? updatedDimEntry : de
      )
    );
  };

  const handleDeleteDimEntry = async (dimEntryId: string) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const updatedAttributes = await deleteDimEntry(dimEntryId, selectedTeamId);
    setDimEntries(dimEntries.filter((dimEntry) => dimEntry.id !== dimEntryId));
    for (const updatedAttribute of updatedAttributes) {
      setShifts((prevShifts) =>
        prevShifts.map((shift) =>
          shift.id === updatedAttribute.ownerId
            ? {
                ...shift,
                attributes: shift.attributes.some(
                  (attribute) => attribute.id === updatedAttribute.id
                )
                  ? shift.attributes.map((attribute) =>
                      attribute.id === updatedAttribute.id
                        ? { ...attribute, ...updatedAttribute }
                        : attribute
                    )
                  : [...shift.attributes, updatedAttribute],
              }
            : shift
        )
      );
    }
  };

  //////////////////////////
  // Attribute Actions
  //////////////////////////

  const handleUpdateAttribute = async (attribute: AttributeT) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const updatedAttribute = await updateAttribute(attribute, selectedTeamId);
    setShifts((prevShifts) =>
      prevShifts.map((shift) =>
        shift.id === updatedAttribute.ownerId
          ? {
              ...shift,
              attributes: shift.attributes.some(
                (attribute) => attribute.id === updatedAttribute.id
              )
                ? shift.attributes.map((attribute) =>
                    attribute.id === updatedAttribute.id
                      ? { ...attribute, ...updatedAttribute }
                      : attribute
                  )
                : [...shift.attributes, updatedAttribute],
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
          dimensions: fetchedDimensions,
          dimEntries: fetchedDimEntries,
        } = await getShiftsTabData(selectedTeamId);
        setShifts(fetchedShifts);
        setDimensions(fetchedDimensions);
        setDimEntries(fetchedDimEntries);
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
              dimensions={dimensions.filter((d) =>
                d.dimTypes.includes(DimensionType.SHIFT)
              )}
              dimEntries={dimEntries}
              shifts={shifts}
              defaultShiftFields={DefaultWorkShiftFields}
              handleAddShift={handleAddShift}
              handleUpdateShift={handleUpdateShift}
              handleDeleteShift={handleDeleteShift}
              handleAddDimension={handleAddDimension}
              handleUpdateDimension={handleUpdateDimension}
              handleDeleteDimension={handleDeleteDimension}
              handleAddDimEntry={handleAddDimEntry}
              handleUpdateDimEntry={handleUpdateDimEntry}
              handleDeleteDimEntry={handleDeleteDimEntry}
              handleUpdateAttribute={handleUpdateAttribute}
            />
            <div className="divider" />
            <ShiftTable
              lng={lng}
              selectedTeamId={selectedTeamId}
              isRest={true}
              dimensions={dimensions.filter((d) =>
                d.dimTypes.includes(DimensionType.REST_SHIFT)
              )}
              dimEntries={dimEntries}
              shifts={shifts}
              defaultShiftFields={DefaultRestShiftFields}
              handleAddShift={handleAddShift}
              handleUpdateShift={handleUpdateShift}
              handleDeleteShift={handleDeleteShift}
              handleAddDimension={handleAddDimension}
              handleUpdateDimension={handleUpdateDimension}
              handleDeleteDimension={handleDeleteDimension}
              handleAddDimEntry={handleAddDimEntry}
              handleUpdateDimEntry={handleUpdateDimEntry}
              handleDeleteDimEntry={handleDeleteDimEntry}
              handleUpdateAttribute={handleUpdateAttribute}
            />
          </div>
        )
      )}
    </div>
  );
}
