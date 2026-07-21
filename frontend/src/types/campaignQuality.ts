export type WorkerQualityT = {
  workerId: string;
  workerName: string;
  workerAcronym: string;
  numAvailableDays: number;
  numDuties: number;
  numOnCall: number;
  timeWorkedMinutes: number;
  timeWorkedWeekendMinutes: number;
  numWorkingDays: number;
  shiftDiversityScore: number;
  shiftSpreadScore: number;
  workTimeConsistencyScore: number;
  individualScore: number;
  fairnessScore: number;
};

export type CampaignQualityT = {
  campaignId: string;
  teamId: string;
  startDate: number;
  endDate: number;
  numWorkers: number;
  numWeeks: number;
  fairnessDutiesScore: number;
  fairnessOnCallScore: number;
  fairnessTimeWorkedScore: number;
  fairnessWeekendScore: number;
  aggregateFairnessScore: number;
  aggregateIndividualScore: number;
  globalScore: number;
  workers: WorkerQualityT[];
};
