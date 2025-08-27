import React, { useState } from "react";
import { useTranslation } from "../../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
// Component
import UpdateSpecialtiesInput from "./update-specialties-input";
// Types
import { SpecialtyT } from "@/types/specialty";

export default function UpdateSpecialtiesForm({
  lng,
  teamId,
  specialties,
  setOpenParent,
  handleAddSpecialty,
  handleUpdateSpecialty,
  handleDeleteSpecialty,
}: {
  lng: string;
  teamId: string;
  specialties: SpecialtyT[];
  setOpenParent: (open: boolean) => void | null;
  handleAddSpecialty: (specialty: SpecialtyT) => void;
  handleUpdateSpecialty: (specialty: SpecialtyT) => void;
  handleDeleteSpecialty: (specialtyId: string) => void;
}) {
  const { t } = useTranslation(lng, "worker-page");

  const [listError, setListError] = useState<boolean>(false);

  const handleClose = async () => {
    if (specialties.length === 0) {
      setListError(true);
    } else {
      setListError(false);
      setOpenParent(false);
    }
  };

  return (
    <Box sx={{ width: "100%" }} data-testid="update-specialties-form">
      <span data-testid="update-specialties-title">
        {t("update_specialties")}
      </span>
      <Box mt={2}>
        <UpdateSpecialtiesInput
          lng={lng}
          specialties={specialties}
          teamId={teamId}
          listError={listError}
          createSpecialty={handleAddSpecialty}
          updateSpecialty={handleUpdateSpecialty}
          deleteSpecialty={handleDeleteSpecialty}
        />
      </Box>
      <div style={{ display: "flex", justifyContent: "right", marginTop: 2 }}>
        <Button
          variant="contained"
          onClick={handleClose}
          sx={{ marginRight: 1 }}
          data-testid="save-specialties-button"
        >
          {t("save")}
        </Button>
      </div>
    </Box>
  );
}
