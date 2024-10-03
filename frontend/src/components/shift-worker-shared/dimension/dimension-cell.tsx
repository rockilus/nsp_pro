import React, { useState } from "react";
// MUI
import AbcIcon from "@mui/icons-material/Abc";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import ListIcon from "@mui/icons-material/List";
import NumbersIcon from "@mui/icons-material/Numbers";
import TableCell from "@mui/material/TableCell";
// Components
import PopoverAnchorElBelow from "../../inputs/popover-anchor-el-below";
import UpdateDimensionForm from "./update-dimension-form";
// Styles
import "../../../styles/table-styles.css";
//Types
import { DimEntryT, DimensionT, DimensionType } from "../../../types/dimension";

export default function DimensionCell({
  lng,
  selectedTeamId,
  dimensionTypeTable,
  dimension,
  dimEntries,
  handleUpdateDimension,
  handleDeleteDimension,
  handleAddDimEntry,
  handleUpdateDimEntry,
  handleDeleteDimEntry,
}: {
  lng: string;
  selectedTeamId: string;
  dimensionTypeTable: DimensionType;
  dimension: DimensionT;
  dimEntries: DimEntryT[];
  handleUpdateDimension: (dimension: DimensionT) => void;
  handleDeleteDimension: (dimensionId: string) => void;
  handleAddDimEntry: (dimEntry: DimEntryT) => void;
  handleUpdateDimEntry: (dimEntry: DimEntryT) => void;
  handleDeleteDimEntry: (dimEntryId: string) => void;
}) {
  const [popoverAnchorOpen, setPopoverAnchorOpen] = useState(false);

  const iconsPrefix: Record<string, React.ReactNode> = {
    str: <AbcIcon color="disabled" fontSize="small" />,
    int: <NumbersIcon color="disabled" fontSize="small" />,
    bool: <CheckBoxIcon color="disabled" fontSize="small" />,
    list: <ListIcon color="disabled" fontSize="small" />,
  };

  const cellContent = () => (
    <div className="table-header-custom-container">
      <span className="table-header-custom">{dimension.name}</span>
      {iconsPrefix[dimension.entryType]}
    </div>
  );

  return (
    <TableCell
      key={dimension.id}
      component="th"
      scope="row"
      sx={{ paddingY: 0 }}
    >
      <PopoverAnchorElBelow
        buttonContent={cellContent()}
        content={
          <UpdateDimensionForm
            lng={lng}
            selectedTeamId={selectedTeamId}
            dimensionTypeTable={dimensionTypeTable}
            dimension={dimension}
            dimEntries={dimEntries}
            setOpenParent={setPopoverAnchorOpen}
            handleUpdateDimension={handleUpdateDimension}
            handleDeleteDimension={handleDeleteDimension}
            handleAddDimEntry={handleAddDimEntry}
            handleUpdateDimEntry={handleUpdateDimEntry}
            handleDeleteDimEntry={handleDeleteDimEntry}
          />
        }
        open={popoverAnchorOpen}
        setOpen={setPopoverAnchorOpen}
      />
    </TableCell>
  );
}
