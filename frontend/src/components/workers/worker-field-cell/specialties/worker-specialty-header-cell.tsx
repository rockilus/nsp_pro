import React, { useState } from "react";
import { useTranslation } from "../../../../app/i18n/client";
// MUI
import TableCell from "@mui/material/TableCell";
// Components
import PopoverAnchorElBelow from "../../../inputs/popover-anchor-el-below";
import UpdateSpecialtiesForm from "./update-specialties-form";
// Styles
import "../../../../styles/table-styles.css";
//Types
import { SpecialtyT } from "@/types/specialty";

export default function WorkerSpecialtyHeaderCell({
  lng,
  teamId,
  specialties,
  handleAddSpecialty,
  handleUpdateSpecialty,
  handleDeleteSpecialty,
}: {
  lng: string;
  teamId: string;
  specialties: SpecialtyT[];
  handleAddSpecialty: (specialty: SpecialtyT) => void;
  handleUpdateSpecialty: (specialty: SpecialtyT) => void;
  handleDeleteSpecialty: (specialtyId: string) => void;
}) {
  const { t } = useTranslation(lng, "worker-page");

  const [popoverAnchorOpen, setPopoverAnchorOpen] = useState(false);

  const cellContent = () => (
    <div className="table-header-default">
      <span>{t("specialties")}</span>
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
