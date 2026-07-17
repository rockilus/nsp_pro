/**
 * Pre-generate solver test scenarios cache file.
 *
 * Run before starting Playwright UI mode so that solve-basic.spec.ts
 * can discover available scenarios at test-discovery time:
 *   npx tsx tests/utils/generate-scenarios.ts
 *
 * Also available via:  npm run generate-scenarios
 */

import * as fs from 'fs';
import * as path from 'path';
import { testConfig } from './test-config';

async function main() {
  const scenariosUrl = `${testConfig.apiUrl}/test-utils/scenarios`;
  console.log(`Fetching scenarios from ${scenariosUrl}...`);

  try {
    const response = await fetch(scenariosUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-User-ID': testConfig.devUserId,
        'X-API-Key': testConfig.devApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed: HTTP ${response.status} — ${errorText}`);
      process.exit(1);
    }

    const scenarios: string[] = await response.json();
    console.log(`Found ${scenarios.length} scenarios: ${scenarios.join(', ')}`);

    const generatedDir = path.join(__dirname, '.generated');
    fs.mkdirSync(generatedDir, { recursive: true });
    const outputPath = path.join(generatedDir, 'solver-scenarios.json');
    fs.writeFileSync(outputPath, JSON.stringify(scenarios, null, 2));

    console.log(`Wrote scenario cache to ${outputPath}`);
  } catch (error) {
    console.error('Failed to generate solver scenarios:', error);
    process.exit(1);
  }
}

main();
