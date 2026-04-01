import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { validateStatsOptions, getDefaultStatsOptions } from '../statsOptionsUtils';
import {
  StatsOptionsT,
  StatsUnitOptions,
  StatsTimeFrameOptions,
  HeaderUnitOptions,
} from '@/types/stats';
import { SWOIdTypes } from '@/types/constraint';

dayjs.extend(utc);

describe('statsOptionsUtils', () => {
  describe('validateStatsOptions', () => {
    it('should return valid options when all fields are correct', () => {
      const now = dayjs.utc();
      const options: StatsOptionsT = {
        timeFrame: StatsTimeFrameOptions.LTM,
        startDate: now.subtract(1, 'year'),
        endDate: now,
        statsUnit: StatsUnitOptions.NB_DAYS_WORKED,
        headerUnit: HeaderUnitOptions.WEEKDAY,
        selectedShifts: [
          {
            name: 'all shifts',
            id: '',
            idType: SWOIdTypes.NONE,
            isBoolDim: false,
            categoryName: 'All',
          },
        ],
        showFavorites: false,
      };

      const validated = validateStatsOptions(options);

      expect(validated.timeFrame).toBe(StatsTimeFrameOptions.LTM);
      expect(validated.statsUnit).toBe(StatsUnitOptions.NB_DAYS_WORKED);
      expect(validated.headerUnit).toBe(HeaderUnitOptions.WEEKDAY);
      expect(validated.selectedShifts).toHaveLength(1);
      expect(validated.showFavorites).toBe(false);
    });

    it('should use defaults for invalid timeFrame', () => {
      const options: Partial<StatsOptionsT> = {
        timeFrame: 999 as StatsTimeFrameOptions, // Invalid value
      };

      const validated = validateStatsOptions(options);

      expect(validated.timeFrame).toBe(StatsTimeFrameOptions.LTM);
    });

    it('should use defaults for invalid dates', () => {
      const options: Partial<StatsOptionsT> = {
        startDate: dayjs.utc('invalid-date'),
        endDate: dayjs.utc('invalid-date'),
      };

      const validated = validateStatsOptions(options);

      expect(validated.startDate.isValid()).toBe(true);
      expect(validated.endDate.isValid()).toBe(true);
    });

    it("should fix end date if it's before start date", () => {
      const now = dayjs.utc();
      const options: Partial<StatsOptionsT> = {
        startDate: now,
        endDate: now.subtract(1, 'month'),
      };

      const validated = validateStatsOptions(options);

      expect(validated.endDate.isAfter(validated.startDate)).toBe(true);
    });

    it('should handle dates that are too far in the past', () => {
      const now = dayjs.utc();
      const options: Partial<StatsOptionsT> = {
        startDate: now.subtract(10, 'years'),
        endDate: now,
      };

      const validated = validateStatsOptions(options);

      // Should reset to default (1 year ago)
      expect(validated.startDate.isAfter(now.subtract(2, 'years'))).toBe(true);
    });
  });

  describe('getDefaultStatsOptions', () => {
    it('should return LTM options when no campaign is provided', () => {
      const defaults = getDefaultStatsOptions();

      expect(defaults.timeFrame).toBe(StatsTimeFrameOptions.LTM);
      expect(defaults.statsUnit).toBe(StatsUnitOptions.NB_DAYS_WORKED);
      expect(defaults.headerUnit).toBe(HeaderUnitOptions.WEEKDAY);
      expect(defaults.showFavorites).toBe(false);
      expect(defaults.selectedShifts).toHaveLength(1);
    });

    it('should return campaign options when campaign is provided', () => {
      const now = dayjs.utc();
      const campaign = {
        startDate: now.startOf('month'),
        endDate: now.endOf('month'),
      };

      const defaults = getDefaultStatsOptions(campaign);

      expect(defaults.timeFrame).toBe(StatsTimeFrameOptions.CAMPAING);
      expect(defaults.startDate.isSame(campaign.startDate, 'day')).toBe(true);
      expect(defaults.endDate.isSame(campaign.endDate, 'day')).toBe(true);
    });
  });
});
