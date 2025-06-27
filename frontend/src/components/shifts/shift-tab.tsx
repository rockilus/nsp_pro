import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "../../app/i18n/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
// Components
import ShiftTable from "./shift-table";
import TableFilterBar from "../table/TableFilterBar";
import NewDimensionForm from "../shift-worker-shared/dimension/new-dimension-form";
import PopoverRHS from "../inputs/popover-rhs";
import TableAddButton from "../buttons/table-add-button";
import LinkShiftDialog from "./link-shift/link-shift-dialog";
// Skeletons
import TablesSkeleton from "../skeletons/tables-skeleton";
// Hooks
import { useTableState } from "../../hooks/useTableState";
import { useTableHeight } from "../../hooks/useTableHeight";
// Utils
import { createShiftColumns } from "./shiftColumns";
import { filterWorkShifts, filterRestShifts } from "./shift-utils/shift-utils";
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
import { addLinkShift, deleteLinkShift } from "../../app/lib/link-shift";
// Styles
import "../../styles/tab-container-styles.css";
// Types
import {
  ShiftT,
  ShiftLeaveType,
  ShiftType,
  ShiftRestType,
  LinkShiftT,
} from "../../types/shift";
import { DimensionT } from "../../types/dimension";
import { DimEntryT } from "@/types/dim-entry";
import { AttributeT } from "../../types/attribute";
import { SpecialtyT } from "@/types/specialty";
import { DimensionType } from "../../types/dimension";

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
  const [specialties, setSpecialties] = useState<SpecialtyT[]>([]);
  const [linkShifts, setLinkShifts] = useState<LinkShiftT[]>([]);
  const [workPopoverRhsOpen, setWorkPopoverRhsOpen] = useState(false);
  const [restPopoverRhsOpen, setRestPopoverRhsOpen] = useState(false);
  const [shiftView, setShiftView] = useState<"work" | "rest">("work");

  // Create shift columns for both work and rest shifts
  const workShiftColumns = useMemo(() => {
    return createShiftColumns(
      t,
      specialties,
      dimensions,
      dimEntries,
      filterWorkShifts(shifts),
      false
    );
  }, [t, specialties, dimensions, dimEntries, shifts]);

  const restShiftColumns = useMemo(() => {
    return createShiftColumns(
      t,
      specialties,
      dimensions,
      dimEntries,
      filterRestShifts(shifts),
      true
    );
  }, [t, specialties, dimensions, dimEntries, shifts]);

  // Table state for work shifts
  const {
    tableState: workTableState,
    filteredAndSortedData: filteredWorkShifts,
    addFilter: addWorkFilter,
    removeFilter: removeWorkFilter,
    updateSort: updateWorkSort,
    resetAll: resetWorkAll,
  } = useTableState(
    filterWorkShifts(shifts),
    workShiftColumns,
    "nsp-pro-work-shift-table-state"
  );

  // Table state for rest shifts
  const {
    tableState: restTableState,
    filteredAndSortedData: filteredRestShifts,
    addFilter: addRestFilter,
    removeFilter: removeRestFilter,
    updateSort: updateRestSort,
    resetAll: resetRestAll,
  } = useTableState(
    filterRestShifts(shifts),
    restShiftColumns,
    "nsp-pro-rest-shift-table-state"
  );

  // Show filter toolbars
  const showWorkFilterToolbar =
    workTableState.filters.length > 0 || workTableState.sort !== null;
  const showRestFilterToolbar =
    restTableState.filters.length > 0 || restTableState.sort !== null;

  // Dynamic table heights
  const workTableHeight = useTableHeight(showWorkFilterToolbar);
  const restTableHeight = useTableHeight(showRestFilterToolbar);

  // Toggle handler with state reset
  const handleShiftViewChange = (
    event: React.MouseEvent<HTMLElement>,
    newView: "work" | "rest"
  ) => {
    if (newView !== null) {
      setShiftView(newView);
      // Reset both table states when switching views
      resetWorkAll();
      resetRestAll();
    }
  };

  const DefaultWorkShiftFields: Record<string, string>[] = [
    { name: "color", label: t("color") },
    { name: "name", label: t("name") },
    { name: "acronym", label: t("acronym") },
    { name: "duty", label: t("duty") },
    { name: "recuperation", label: t("recuperation") },
    { name: "start_time", label: t("start_time") },
    { name: "end_time", label: t("end_time") },
    { name: "staffing", label: t("staffing") },
  ];
  const DefaultRestShiftFields: Record<string, string>[] = [
    { name: "color", label: t("color") },
    { name: "name", label: t("name") },
    { name: "acronym", label: t("acronym") },
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
      acronym: "",
      acronymCustom: false,
      startTime: roundTime(dayjs.utc()),
      endTime: roundTime(dayjs.utc()),
      staffing: [
        {
          specialtyId: null,
          staffing: 1,
        },
      ],
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
    const {
      shiftUpdated: updatedShift,
      linkShiftsUpdated,
      linkShiftsIdsDeleted,
    } = await updateShift(shift);
    setShifts((prevShifts) =>
      prevShifts.map((w) => (w.id === updatedShift.id ? updatedShift : w))
    );
    setLinkShifts((prevLinkShifts) => {
      const filteredLinkShifts = prevLinkShifts.filter(
        (linkShift) => !linkShiftsIdsDeleted.includes(linkShift.id)
      );
      const replacedLinkShifts = filteredLinkShifts.map((linkShift) => {
        const lsUpdated = linkShiftsUpdated.find(
          (ls) => ls.id === linkShift.id
        );
        return lsUpdated ? lsUpdated : linkShift;
      });
      const newLinkShifts = linkShiftsUpdated.filter(
        (linkShift) => !filteredLinkShifts.some((ls) => ls.id === linkShift.id)
      );
      return replacedLinkShifts.concat(newLinkShifts);
    });
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const { linkShiftsUpdated, linkShiftsIdsDeleted } = await deleteShift(
      shiftId,
      selectedTeamId
    );
    setShifts(shifts.filter((shift) => shift.id !== shiftId));
    setLinkShifts((prevLinkShifts) => {
      const filteredLinkShifts = prevLinkShifts.filter(
        (linkShift) => !linkShiftsIdsDeleted.includes(linkShift.id)
      );
      const replacedLinkShifts = filteredLinkShifts.map((linkShift) => {
        const lsUpdated = linkShiftsUpdated.find(
          (ls) => ls.id === linkShift.id
        );
        return lsUpdated ? lsUpdated : linkShift;
      });
      const newLinkShifts = linkShiftsUpdated.filter(
        (linkShift) => !filteredLinkShifts.some((ls) => ls.id === linkShift.id)
      );
      return replacedLinkShifts.concat(newLinkShifts);
    });
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

  //////////////////////////
  // LinkShift Actions
  //////////////////////////

  const handleAddLinkShift = async (linkShift: LinkShiftT) => {
    const newLinkShift = await addLinkShift(linkShift);
    setLinkShifts([...linkShifts, newLinkShift]);
  };

  const handleDeleteLinkShift = async (linkShiftId: string) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    await deleteLinkShift(linkShiftId, selectedTeamId);
    setLinkShifts(
      linkShifts.filter((linkShift) => linkShift.id !== linkShiftId)
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
          specialties: fetchedSpecialties,
          linkShifts: fetchedLinkShifts,
        } = await getShiftsTabData(selectedTeamId);
        setShifts(fetchedShifts);
        setDimensions(fetchedDimensions);
        setDimEntries(fetchedDimEntries);
        setSpecialties(fetchedSpecialties);
        setLinkShifts(fetchedLinkShifts);
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
            {/* Consolidated Shifts Section with Toggle */}
            <div className="title-container">
              <div className="title-with-toggle">
                <span className="title">{t("shifts")}</span>
                <ToggleButtonGroup
                  value={shiftView}
                  exclusive
                  onChange={handleShiftViewChange}
                  size="small"
                  sx={{ ml: 2 }}
                >
                  <ToggleButton value="work">{t("shifts")}</ToggleButton>
                  <ToggleButton value="rest">{t("rest")}</ToggleButton>
                </ToggleButtonGroup>
              </div>
              <div className="shift-actions-container">
                {shiftView === "work" ? (
                  <>
                    <LinkShiftDialog
                      lng={lng}
                      teamId={selectedTeamId}
                      shifts={shifts}
                      linkShifts={linkShifts}
                      handleAddLinkShift={handleAddLinkShift}
                      handleDeleteLinkShift={handleDeleteLinkShift}
                    />
                    <TableAddButton
                      text={t("shift")}
                      handleClick={() => handleAddShift(false)}
                    />
                  </>
                ) : (
                  <TableAddButton
                    text={t("rest")}
                    handleClick={() => handleAddShift(true)}
                  />
                )}
                <PopoverRHS
                  title={t("new_property")}
                  buttonContent={<TableAddButton text={t("property")} />}
                  content={
                    <NewDimensionForm
                      lng={lng}
                      selectedTeamId={selectedTeamId}
                      dimensionType={
                        shiftView === "work"
                          ? DimensionType.SHIFT
                          : DimensionType.REST_SHIFT
                      }
                      dimensions={dimensions}
                      dimEntries={dimEntries}
                      setOpenParent={
                        shiftView === "work"
                          ? setWorkPopoverRhsOpen
                          : setRestPopoverRhsOpen
                      }
                      handleAddDimension={handleAddDimension}
                      handleUpdateDimension={handleUpdateDimension}
                    />
                  }
                  open={
                    shiftView === "work"
                      ? workPopoverRhsOpen
                      : restPopoverRhsOpen
                  }
                  setOpen={
                    shiftView === "work"
                      ? setWorkPopoverRhsOpen
                      : setRestPopoverRhsOpen
                  }
                />
              </div>
            </div>

            {/* Conditional filter bar */}
            {((shiftView === "work" && showWorkFilterToolbar) ||
              (shiftView === "rest" && showRestFilterToolbar)) && (
              <TableFilterBar
                filters={
                  shiftView === "work"
                    ? workTableState.filters
                    : restTableState.filters
                }
                sort={
                  shiftView === "work"
                    ? workTableState.sort
                    : restTableState.sort
                }
                onRemoveFilter={
                  shiftView === "work" ? removeWorkFilter : removeRestFilter
                }
                onRemoveSort={() =>
                  shiftView === "work"
                    ? updateWorkSort(null)
                    : updateRestSort(null)
                }
                onResetAll={shiftView === "work" ? resetWorkAll : resetRestAll}
              />
            )}

            {/* Single conditional table */}
            <ShiftTable
              lng={lng}
              selectedTeamId={selectedTeamId}
              isRest={shiftView === "rest"}
              dimensions={dimensions}
              dimEntries={dimEntries}
              shifts={
                shiftView === "work" ? filteredWorkShifts : filteredRestShifts
              }
              specialties={shiftView === "work" ? specialties : []}
              linkShifts={shiftView === "work" ? linkShifts : []}
              defaultShiftFields={
                shiftView === "work"
                  ? DefaultWorkShiftFields
                  : DefaultRestShiftFields
              }
              tableHeight={
                shiftView === "work" ? workTableHeight : restTableHeight
              }
              shiftColumns={
                shiftView === "work" ? workShiftColumns : restShiftColumns
              }
              currentSort={
                shiftView === "work" ? workTableState.sort : restTableState.sort
              }
              onSort={shiftView === "work" ? updateWorkSort : updateRestSort}
              onFilter={shiftView === "work" ? addWorkFilter : addRestFilter}
              handleUpdateShift={handleUpdateShift}
              handleDeleteShift={handleDeleteShift}
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
