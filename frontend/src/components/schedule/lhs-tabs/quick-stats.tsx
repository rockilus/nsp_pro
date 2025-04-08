import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
// Components
import StatsTable from "../../stats/table/stats-table";
import LHSHEader from "./lhs-header";
// Styles
import "./quick-stats.css";
// Types
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";
import {
  StatsT,
  StatsTimeFrameOptions,
  StatsUnitOptions,
  HeaderUnitOptions,
} from "../../../types/stats";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function QuickStatsTable({
  lng,
  shifts,
  workers,
  stats,
  selectedQuickStatsTimeFrame,
  onClose,
  handleChangeStatsTimeFrame,
}: {
  lng: string;
  shifts: ShiftT[];
  workers: WorkerT[];
  stats: StatsT;
  selectedQuickStatsTimeFrame: StatsTimeFrameOptions;
  onClose: () => void;
  handleChangeStatsTimeFrame: (timeFrame: StatsTimeFrameOptions) => void;
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
      <LHSHEader lhsHeaderTitle={t("quick_stats")} onClose={onClose} />
      <ToggleButtonGroup
        color="primary"
        value={selectedQuickStatsTimeFrame}
        exclusive
        onChange={(event, value) => handleChangeStatsTimeFrame(value)}
        aria-label="Platform"
      >
        <ToggleButton
          value={StatsTimeFrameOptions.CAMPAING}
          sx={{
            textTransform: "none",
            height: "30px",
            fontSize: "0.8rem",
          }}
        >
          {t("campaign")}
        </ToggleButton>
        <ToggleButton
          value={StatsTimeFrameOptions.LTM}
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
        statsOptions={{
          timeFrame: StatsTimeFrameOptions.CAMPAING,
          startDate: dayjs(),
          endDate: dayjs(),
          statsUnit: StatsUnitOptions.NB_DAYS_WORKED,
          headerUnit: HeaderUnitOptions.WEEKDAY,
          selectedShifts: [],
          showFavorites: true,
        }}
        stats={stats}
        workers={workers}
        shifts={shifts}
        statsUnitOptions={[]}
        quickStats={true}
        isLoadingStats={false}
        handleAddHeader={() => {}}
        handleDeleteHeader={() => {}}
      />
    </div>
  );
}
