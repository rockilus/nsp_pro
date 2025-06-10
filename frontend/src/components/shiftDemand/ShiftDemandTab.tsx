import React, { useState, useEffect } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
// Skeletons
import TablesSkeleton from "../skeletons/tables-skeleton";
// Styles
import "../../styles/tab-container-styles.css";
// Types
import { ShiftT } from "../../types/shift";

export default function ShiftDemandTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  const { t } = useTranslation(lng, "shift-page");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [shifts, setShifts] = useState<ShiftT[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedTeamId) {
        setIsLoading(false);
        return;
      }

      try {
        // TODO: Implement shift demand data fetching
        // This is a placeholder for now
        setShifts([]);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching shift demand data:", error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedTeamId]);

  if (isLoading) {
    return (
      <div className="tab-container-ultrawide">
        <TablesSkeleton numTables={1} numInternalRows={5} />
      </div>
    );
  }

  if (!selectedTeamId) {
    return (
      <div className="tab-container-ultrawide">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <Typography variant="h6" color="textSecondary">
            Please select a team to manage shift demands
          </Typography>
        </Box>
      </div>
    );
  }

  return (
    <div className="tab-container-ultrawide">
      <Paper elevation={1} sx={{ p: 3, mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          Shift Demand Management
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Manage shift demands and staffing requirements for your team.
        </Typography>

        {/* TODO: Add shift demand grid components here */}
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="300px"
          bgcolor="grey.50"
          borderRadius={1}
        >
          <Typography variant="h6" color="textSecondary">
            Shift Demand Grid Coming Soon
          </Typography>
        </Box>
      </Paper>
    </div>
  );
}
