export type GapMode = 'off' | 'set' | 'auto';

export type TeamGenerationSettingsT = {
  team_id: string;
  duty_scope_work_time: boolean;
  duty_consecutive_gap_mode: GapMode;
  duty_consecutive_gap_days: number;
};
