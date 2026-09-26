/**
 * Regression tests for the analytics accuracy fixes.
 *
 * Run: node --experimental-strip-types scripts/test-analytics.mjs
 *
 * Covers the four defects found in the audit:
 *  - session id never expired
 *  - device type re-read per event
 *  - `country` written with the region string
 *  - marketing events firing without marketing consent
 */
import { readFileSync } from 'node:fs';

const SRC = readFileSync(new URL('../src/lib/telemetry.ts', import.meta.url), 'utf8');
let pass = 0;
let fail = 0;

const check = (name, ok) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
  ok ? pass++ : fail++;
};

console.log('Analytics accuracy regressions\n');

// 1. Session TTL
check('session has a 30 minute idle expiry', /SESSION_IDLE_MS\s*=\s*30\s*\*\s*60\s*\*\s*1000/.test(SRC));
check('session expiry is actually applied', /now\s*-\s*lastSeen\s*>\s*SESSION_IDLE_MS/.test(SRC));
check('session timestamp is refreshed on each call', /setItem\(STORAGE_SESSION_TS,\s*String\(now\)\)/.test(SRC));

// 2. Device stability
check('device type is pinned to the session', /sessionStorage\.getItem\(STORAGE_DEVICE_KEY\)/.test(SRC));
check('device detection is a separate helper', /function detectDeviceType\(\)/.test(SRC));

// 3. Country correctness
check('country field is not the region string', !/country:\s*locInfo\.region/.test(SRC));
check('country carries the country value', /country:\s*locInfo\.country/.test(SRC));
check('region is preserved separately', /region:\s*locInfo\.region/.test(SRC));

// 4. Consent gate coverage
check('marketing-gated events are declared', /MARKETING_GATED_EVENTS\s*=\s*new Set/.test(SRC));
for (const ev of ['newsletter_subscription', 'ad_click', 'contact_lead']) {
  check(`"${ev}" is consent gated`, new RegExp(`'${ev}'`).test(SRC.split('MARKETING_GATED_EVENTS')[1]?.split(']')[0] || ''));
}
check('marketing consent is enforced before tracking', /MARKETING_GATED_EVENTS\.has\(eventName\)\s*&&\s*!consent\.marketing/.test(SRC));

console.log(`\n${fail === 0 ? '=== ALL CHECKS PASSED ===' : `=== ${fail} FAILED ===`} (${pass} passed)`);
process.exit(fail === 0 ? 0 : 1);
