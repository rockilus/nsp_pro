/**
 * Global teardown for Playwright tests
 *
 * This file runs after all tests complete and performs cleanup operations.
 */

import { FullConfig } from '@playwright/test';
import { DatabaseTestUtils } from './database-utils';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');

  try {
    const dbUtils = new DatabaseTestUtils();

    // Optional: Final database reset to clean up test data
    console.log('🗃️ Performing final database cleanup...');
    const resetResult = await dbUtils.resetAllData();
    console.log(`✅ Final cleanup completed: ${resetResult.operation_id}`);

    console.log('✨ Global teardown completed successfully');
  } catch (error) {
    console.warn('⚠️ Global teardown encountered an error:', error);
    // Don't fail teardown - this is just cleanup
  }
}

export default globalTeardown;
