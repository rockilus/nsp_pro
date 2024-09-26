import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
// Components
import StatsTable from "../../stats/table/stats-table";
// Styles
import "./quick-stats.css";
// Types
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";
import { StatsT } from "../../../types/stats";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function QuickStatsTable({
  lng,
  shifts,
  workers,
  stats,
  selectedQuickStatsTimeFrame,
  handleChangeStatsTimeFrame,
}: {
  lng: string;
  shifts: ShiftT[];
  workers: WorkerT[];
  stats: StatsT;
  selectedQuickStatsTimeFrame: string;
  handleChangeStatsTimeFrame: (timeFrame: string) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        width: "100%",
        margin: "10px 10px 5px 5px",
      }}
    >
      <span
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "#3C4043",
        }}
      >
        {t("quick_stats")}
      </span>
      <ToggleButtonGroup
        color="primary"
        value={selectedQuickStatsTimeFrame}
        exclusive
        onChange={(event, value) => handleChangeStatsTimeFrame(value)}
        aria-label="Platform"
      >
        <ToggleButton
          value="campaign"
          sx={{
            textTransform: "none",
            height: "30px",
            fontSize: "0.8rem",
          }}
        >
          {t("campaign")}
        </ToggleButton>
        <ToggleButton
          value="last_12_months"
          sx={{
            textTransform: "none",
            height: "30px",
            fontSize: "0.8rem",
          }}
        >
          {t("last_12_months")}
        </ToggleButton>
      </ToggleButtonGroup>
      <StatsTable
        lng={lng}
        stats={stats}
        showingCustom={true}
        workers={workers}
        shifts={shifts}
        statsUnitOptions={[]}
        quickStats={true}
        handleAddHeader={() => {}}
        handleDeleteHeader={() => {}}
      />
    </div>
  );
}
