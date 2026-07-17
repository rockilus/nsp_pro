from typing import List

from pydantic import BaseModel


class WorkerQualityDTO(BaseModel):
    workerId: str
    workerName: str
    workerAcronym: str
    numAvailableDays: int
    numDuties: float
    numOnCall: float
    timeWorkedMinutes: float
    timeWorkedWeekendMinutes: float
    numWorkingDays: int
    shiftDiversityScore: float
    shiftSpreadScore: float
    workTimeConsistencyScore: float
    individualScore: float
    fairnessScore: float


class CampaignQualityDTO(BaseModel):
    campaignId: str
    teamId: str
    startDate: float
    endDate: float
    numWorkers: int
    numWeeks: float
    fairnessDutiesScore: float
    fairnessOnCallScore: float
    fairnessTimeWorkedScore: float
    fairnessWeekendScore: float
    aggregateFairnessScore: float
    aggregateIndividualScore: float
    globalScore: float
    workers: List[WorkerQualityDTO]
