import math
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from statistics import mean, median, stdev
from typing import Dict, List, Optional

from shared.schemas.core import Assignment, Shift, ShiftType
from shared.schemas.dto.campaign_quality import CampaignQualityDTO, WorkerQualityDTO
from shared.utils.build_dates import build_worker_ids_to_worker_dates

from src.services.base_service import BaseService

WORK_SHIFT_TYPES = {ShiftType.NORMAL, ShiftType.DUTY, ShiftType.ON_CALL}

WEEKDAY_SATURDAY = 5
WEEKDAY_SUNDAY = 6


class CampaignQualityService(BaseService):
    def build_campaign_quality(self, team_id: str) -> Optional[CampaignQualityDTO]:
        campaign = self.collection.schedule_db.get_schedule_campaign(team_id)
        if not campaign:
            return None

        workers = self.collection.worker_db.get_workers_not_deleted(team_id)
        shifts = self.collection.shift_db.get_shifts_not_deleted(team_id)
        assignments = self.collection.assignment_db.get_assignments_by_schedule_id(
            campaign.id
        )

        shift_lookup = {s.id: s for s in shifts}
        shift_duration_min = self._build_shift_dur_map(shifts)

        worker_dates_map = build_worker_ids_to_worker_dates(
            start_date=campaign.start_date,
            end_date=campaign.end_date,
            workers=workers,
            assignments=assignments,
        )

        campaign_days = (campaign.end_date - campaign.start_date).days + 1
        num_weeks = campaign_days / 7.0

        worker_assignments = self._group_assignments_by_worker(assignments)
        week_index = self._build_week_index(campaign.start_date, campaign.end_date)

        worker_metrics: List[dict] = []
        for worker in workers:
            wd = worker_dates_map.get(worker.id)
            num_available = len(wd.dates_campaign) if wd else 0
            w_assignments = worker_assignments.get(worker.id, [])

            metrics = self._compute_raw_metrics(
                w_assignments, shift_lookup, shift_duration_min
            )
            metrics["worker_id"] = worker.id
            metrics["worker_name"] = worker.name
            metrics["worker_acronym"] = worker.acronym
            metrics["num_available"] = num_available
            metrics["_assignments"] = w_assignments
            worker_metrics.append(metrics)

        self._normalize_counts(worker_metrics, campaign_days)

        self._compute_shift_diversity(worker_metrics, shift_lookup)
        self._compute_shift_spread(worker_metrics)
        self._compute_work_time_consistency(
            worker_metrics, shift_lookup, shift_duration_min, week_index
        )
        self._compute_individual_scores(worker_metrics)
        self._compute_fairness_scores(worker_metrics)

        fairness_duties = self._fairness_score_for_metric(
            [m["num_duties"] for m in worker_metrics]
        )
        fairness_oncall = self._fairness_score_for_metric(
            [m["num_on_call"] for m in worker_metrics]
        )
        fairness_time = self._fairness_score_for_metric(
            [m["time_worked_minutes"] for m in worker_metrics]
        )
        fairness_weekend = self._fairness_score_for_metric(
            [m["time_worked_weekend_minutes"] for m in worker_metrics]
        )

        agg_fairness = (
            fairness_duties + fairness_oncall + fairness_time + fairness_weekend
        ) / 4.0
        agg_individual = (
            sum(m["individual_score"] for m in worker_metrics) / len(worker_metrics)
            if worker_metrics
            else 0
        )
        global_score = 0.5 * agg_fairness + 0.5 * agg_individual

        return CampaignQualityDTO(
            campaignId=campaign.id,
            teamId=team_id,
            startDate=datetime.combine(
                campaign.start_date, datetime.min.time(), tzinfo=timezone.utc
            ).timestamp(),
            endDate=datetime.combine(
                campaign.end_date, datetime.min.time(), tzinfo=timezone.utc
            ).timestamp(),
            numWorkers=len(workers),
            numWeeks=round(num_weeks, 1),
            fairnessDutiesScore=round(fairness_duties, 1),
            fairnessOnCallScore=round(fairness_oncall, 1),
            fairnessTimeWorkedScore=round(fairness_time, 1),
            fairnessWeekendScore=round(fairness_weekend, 1),
            aggregateFairnessScore=round(agg_fairness, 1),
            aggregateIndividualScore=round(agg_individual, 1),
            globalScore=round(global_score, 1),
            workers=[
                WorkerQualityDTO(
                    workerId=m["worker_id"],
                    workerName=m["worker_name"],
                    workerAcronym=m["worker_acronym"],
                    numAvailableDays=m["num_available"],
                    numDuties=round(m["num_duties"], 2),
                    numOnCall=round(m["num_on_call"], 2),
                    timeWorkedMinutes=round(m["time_worked_minutes"], 1),
                    timeWorkedWeekendMinutes=round(m["time_worked_weekend_minutes"], 1),
                    numWorkingDays=m["num_working_days"],
                    shiftDiversityScore=round(m["shift_diversity_score"], 1),
                    shiftSpreadScore=round(m["shift_spread_score"], 1),
                    workTimeConsistencyScore=round(m["work_time_consistency_score"], 1),
                    individualScore=round(m["individual_score"], 1),
                    fairnessScore=round(m["fairness_score"], 1),
                )
                for m in worker_metrics
            ],
        )

    def _build_shift_dur_map(self, shifts: List[Shift]) -> Dict[str, int]:
        dur_map: Dict[str, int] = {}
        for s in shifts:
            if s.use_custom_work_time:
                dur_map[s.id] = s.custom_work_time_minutes
            else:
                delta = s.end_time - s.start_time
                dur_map[s.id] = int(delta.total_seconds() / 60)
        return dur_map

    @staticmethod
    def _group_assignments_by_worker(
        assignments: List[Assignment],
    ) -> Dict[str, List[Assignment]]:
        grouped: Dict[str, List[Assignment]] = defaultdict(list)
        for a in assignments:
            grouped[a.worker_id].append(a)
        return grouped

    def _compute_raw_metrics(
        self,
        w_assignments: List[Assignment],
        shift_lookup: Dict[str, Shift],
        shift_dur_map: Dict[str, int],
    ) -> dict:
        duty_count = 0
        on_call_count = 0
        total_work_min = 0
        weekend_work_min = 0
        working_dates: List[date] = []

        for a in w_assignments:
            s = shift_lookup.get(a.shift_id)
            if not s or s.shift_type not in WORK_SHIFT_TYPES:
                continue
            working_dates.append(a.date)
            dur = shift_dur_map.get(a.shift_id, 0)
            total_work_min += dur
            if a.date.weekday() in (WEEKDAY_SATURDAY, WEEKDAY_SUNDAY):
                weekend_work_min += dur
            if s.shift_type == ShiftType.DUTY:
                duty_count += 1
            elif s.shift_type == ShiftType.ON_CALL:
                on_call_count += 1

        working_dates_sorted = sorted(set(working_dates))

        return {
            "duty_count_raw": duty_count,
            "on_call_count_raw": on_call_count,
            "total_work_min_raw": total_work_min,
            "weekend_work_min_raw": weekend_work_min,
            "working_dates": working_dates_sorted,
            "num_working_days": len(working_dates_sorted),
            "num_duties": float(duty_count),
            "num_on_call": float(on_call_count),
            "time_worked_minutes": float(total_work_min),
            "time_worked_weekend_minutes": float(weekend_work_min),
            "shift_diversity_score": 0.0,
            "shift_spread_score": 100.0,
            "work_time_consistency_score": 100.0,
            "individual_score": 0.0,
            "fairness_score": 0.0,
        }

    def _normalize_counts(self, worker_metrics: List[dict], campaign_days: int) -> None:
        if campaign_days <= 0:
            return
        for m in worker_metrics:
            avail = m["num_available"]
            if avail <= 0:
                factor = 0.0
            else:
                factor = campaign_days / float(avail)
            m["num_duties"] = m["duty_count_raw"] * factor
            m["num_on_call"] = m["on_call_count_raw"] * factor
            m["time_worked_minutes"] = m["total_work_min_raw"] * factor
            m["time_worked_weekend_minutes"] = m["weekend_work_min_raw"] * factor

    def _compute_shift_diversity(
        self,
        worker_metrics: List[dict],
        shift_lookup: Dict[str, Shift],
    ) -> None:
        work_shifts = [
            s for s in shift_lookup.values() if s.shift_type in WORK_SHIFT_TYPES
        ]
        n_types = len(work_shifts)
        if n_types <= 1:
            for m in worker_metrics:
                m["shift_diversity_score"] = 0.0
            return

        for m in worker_metrics:
            w_assignments = m.get("_assignments", [])
            if not w_assignments:
                m["shift_diversity_score"] = 0.0
                continue

            type_counts: Dict[str, int] = defaultdict(int)
            total = 0
            for a in w_assignments:
                s = shift_lookup.get(a.shift_id)
                if s and s.shift_type in WORK_SHIFT_TYPES:
                    type_counts[s.shift_type.name] += 1
                    total += 1

            if total == 0:
                m["shift_diversity_score"] = 0.0
                continue

            entropy = 0.0
            for count in type_counts.values():
                p = count / total
                entropy -= p * math.log(p)
            max_entropy = math.log(min(n_types, len(type_counts)))
            if max_entropy > 0:
                m["shift_diversity_score"] = 100.0 * (entropy / max_entropy)
            else:
                m["shift_diversity_score"] = 0.0

    def _compute_shift_spread(self, worker_metrics: List[dict]) -> None:
        for m in worker_metrics:
            working_dates = m["working_dates"]
            total_working = len(working_dates)
            if total_working <= 1:
                m["shift_spread_score"] = 100.0
                continue

            max_streak = 1
            current_streak = 1
            for i in range(1, total_working):
                if (working_dates[i] - working_dates[i - 1]).days == 1:
                    current_streak += 1
                    max_streak = max(max_streak, current_streak)
                else:
                    current_streak = 1

            m["shift_spread_score"] = 100.0 * (1.0 - max_streak / total_working)

    def _compute_work_time_consistency(
        self,
        worker_metrics: List[dict],
        shift_lookup: Dict[str, Shift],
        shift_dur_map: Dict[str, int],
        week_index: Dict[int, int],
    ) -> None:
        for m in worker_metrics:
            w_assignments = m.get("_assignments", [])
            weekly_minutes: Dict[int, int] = defaultdict(int)
            for a in w_assignments:
                s = shift_lookup.get(a.shift_id)
                if not s or s.shift_type not in WORK_SHIFT_TYPES:
                    continue
                date_key = self._serial_date(a.date)
                week_idx = week_index.get(date_key)
                if week_idx is not None:
                    weekly_minutes[week_idx] += shift_dur_map.get(a.shift_id, 0)

            values = list(weekly_minutes.values())
            num_weeks_worked = len(values)
            if num_weeks_worked <= 1:
                m["work_time_consistency_score"] = (
                    100.0 if num_weeks_worked == 1 else 0.0
                )
                continue

            avg = mean(values)
            if avg == 0:
                m["work_time_consistency_score"] = 0.0
            else:
                std = stdev(values)
                m["work_time_consistency_score"] = 100.0 * max(0.0, 1.0 - std / avg)

    def _compute_individual_scores(self, worker_metrics: List[dict]) -> None:
        for m in worker_metrics:
            m["individual_score"] = (
                m["shift_diversity_score"]
                + m["shift_spread_score"]
                + m["work_time_consistency_score"]
            ) / 3.0

    def _compute_fairness_scores(self, worker_metrics: List[dict]) -> None:
        for metric_key in [
            "num_duties",
            "num_on_call",
            "time_worked_minutes",
            "time_worked_weekend_minutes",
        ]:
            values = [m[metric_key] for m in worker_metrics]
            med = median(values) if values else 0.0
            for m in worker_metrics:
                val = m[metric_key]
                if med > 0:
                    dev = abs(val - med) / med
                    m["fairness_score"] += 100.0 * max(0.0, 1.0 - dev)
                else:
                    m["fairness_score"] += 100.0

        for m in worker_metrics:
            m["fairness_score"] /= 4.0

    @staticmethod
    def _fairness_score_for_metric(values: List[float]) -> float:
        if not values:
            return 0.0
        avg = mean(values)
        if avg == 0:
            return 100.0
        if len(values) < 2:
            return 100.0
        std = stdev(values)
        cv = std / avg
        return 100.0 * max(0.0, 1.0 - cv)

    @staticmethod
    def _build_week_index(start: date, end: date) -> Dict[int, int]:
        week_index: Dict[int, int] = {}
        d = start
        while d <= end:
            serial = d.toordinal()
            iso_year, iso_week, _ = d.isocalendar()
            week_key = iso_year * 100 + iso_week
            if week_key not in week_index.values():
                week_index[serial] = week_key
            d = d + timedelta(days=1)
        inverted: Dict[int, int] = {}
        for serial, key in week_index.items():
            inverted[serial] = key
        serial_to_week_idx: Dict[int, int] = {}
        unique_weeks = sorted(set(inverted.values()))
        week_to_idx = {wk: i for i, wk in enumerate(unique_weeks)}
        for serial, wk in inverted.items():
            serial_to_week_idx[serial] = week_to_idx[wk]
        return serial_to_week_idx

    @staticmethod
    def _serial_date(d: date) -> int:
        return d.toordinal()
