import React, { useState } from "react";
import { useTranslation } from "../../../../app/i18n/client";
// MUI
import TableCell from "@mui/material/TableCell";
// Components
import PopoverAnchorElBelow from "../../../inputs/popover-anchor-el-below";
import UpdateSpecialtiesForm from "./update-specialties-form";
import ColumnSortFilterMenu from "../../../table/ColumnSortFilterMenu";
// Styles
import "../../../../styles/table-styles.css";
//Types
import { SpecialtyT } from "@/types/specialty";
import {
  ColumnDefinition,
  ColumnFilter,
  TableSort,
} from "../../../../types/filter";

interface WorkerSpecialtyHeaderCellProps {
  lng: string;
  teamId: string;
  specialties: SpecialtyT[];
  // New props for sorting/filtering
  column?: ColumnDefinition;
  currentSort?: TableSort;
  onSort?: (sort: TableSort | null) => void;
  onFilter?: (filter: ColumnFilter) => void;
  handleAddSpecialty: (specialty: SpecialtyT) => void;
  handleUpdateSpecialty: (specialty: SpecialtyT) => void;
  handleDeleteSpecialty: (specialtyId: string) => void;
}

export default function WorkerSpecialtyHeaderCell({
  lng,
  teamId,
  specialties,
  column,
  currentSort,
  onSort,
  onFilter,
  handleAddSpecialty,
  handleUpdateSpecialty,
  handleDeleteSpecialty,
}: WorkerSpecialtyHeaderCellProps) {
  const { t } = useTranslation(lng, "worker-page");

  const [popoverAnchorOpen, setPopoverAnchorOpen] = useState(false);

  const cellContent = () => (
    <div className="table-header-default flex items-center justify-between">
      <span>{t("specialties")}</span>
      <div className="flex items-center gap-1">
        {onSort && onFilter && column && (
          <ColumnSortFilterMenu
            column={column}
            currentSort={currentSort}
            currentFilter={undefined}
            onSort={onSort}
            onFilter={onFilter}
          />
        )}
      </div>
    </div>
  );

  return (
    <TableCell
      //   key={}
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
          <UpdateSpecialtiesForm
            lng={lng}
            teamId={teamId}
            specialties={specialties}
            setOpenParent={setPopoverAnchorOpen}
            handleAddSpecialty={handleAddSpecialty}
            handleUpdateSpecialty={handleUpdateSpecialty}
            handleDeleteSpecialty={handleDeleteSpecialty}
          />
        }
        open={popoverAnchorOpen}
        setOpen={setPopoverAnchorOpen}
      />
    </TableCell>
  );
}
