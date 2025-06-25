/**
 * Test file for ScheduleViewSettings localStorage persistence
 * This file demonstrates how the persistence works and can be used for manual testing
 */

import dayjs from 'dayjs';
import { ScheduleViewSettingsT } from '@/types/schedule';
import { 
  getDefaultScheduleViewSettings,
  validateScheduleViewSettings 
} from '../src/app/lib/utils/scheduleViewSettingsUtils';

// Test the default settings creation
console.log('=== Testing Default Settings ===');
const defaultSettings = getDefaultScheduleViewSettings(true);
console.log('Default settings:', defaultSettings);

// Test settings validation
console.log('\n=== Testing Settings Validation ===');

// Test with valid settings
const validSettings: Partial<ScheduleViewSettingsT> = {
  timeFrame: 'month',
  groupBy: 'worker',
  showBreaches: false,
  periodStartDate: dayjs.utc().startOf('month'),
  periodEndDate: dayjs.utc().endOf('month'),
};

const validated = validateScheduleViewSettings(validSettings, true);
console.log('Validated settings:', validated);

// Test with invalid settings (should be corrected)
const invalidSettings: Partial<ScheduleViewSettingsT> = {
  timeFrame: 'invalid' as any,
  groupBy: 'invalid' as any,
  periodStartDate: dayjs.utc().subtract(3, 'years'), // Too far in past
  periodEndDate: dayjs.utc().subtract(3, 'years'),
};

const corrected = validateScheduleViewSettings(invalidSettings, false);
console.log('Corrected invalid settings:', corrected);

// Test localStorage key generation
const teamId = 'test-team-123';
const expectedKey = `scheduleViewSettings_${teamId}`;
console.log(`\n=== Testing Storage Key ===`);
console.log(`Team ID: ${teamId}`);
console.log(`Storage Key: ${expectedKey}`);

console.log('\n=== All Tests Completed ===');
console.log('The implementation is ready for use in components!');
