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
import { DimensionT, DimensionType } from "../../../types/dimension";
import { DimEntryT } from "@/types/dim-entry";

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
    <div className="table-header-default">
      <span>{dimension.name}</span>
      {iconsPrefix[dimension.entryType]}
    </div>
  );

  return (
    <TableCell
      key={dimension.id}
      component="th"
      scope="row"
      className="worker-table-header"
      sx={{
        paddingY: 0,
        padding: "6px 8px",
        height: "36px",
        fontSize: "0.8rem",
        fontWeight: 500,
        backgroundColor: "#fafafa",
        borderBottom: "1px solid #e0e0e0",
      }}
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
