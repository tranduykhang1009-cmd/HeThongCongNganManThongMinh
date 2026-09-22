#!/usr/bin/env node
/**
 * Master Test Runner for SCADA Web Application Test Suite
 * Executes Tiers 1 through 4 and outputs structured results.
 * 
 * Usage:
 *   node tests/run_all_tests.js
 *   node tests/run_all_tests.js --tier=1
 *   node tests/run_all_tests.js --json
 *   node tests/run_all_tests.js --verbose
 */

const { colors } = require('./helpers/test-utils');
const { runTier1 } = require('./tier1_syntax_static');
const { runTier2 } = require('./tier2_boundary_corner');
const { runTier3 } = require('./tier3_hash_routing');
const { runTier4 } = require('./tier4_scada_integrity');
const { runTier5Challenger1 } = require('./tier5_adversarial_challenger1');
const { runTier5 } = require('./tier5_adversarial_challenger2');

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
    tierFilter: null,
    json: args.includes('--json'),
    verbose: args.includes('--verbose'),
    silent: args.includes('--json')
};

const tierArg = args.find(a => a.startsWith('--tier='));
if (tierArg) {
    options.tierFilter = parseInt(tierArg.split('=')[1], 10);
}

async function main() {
    const overallStartTime = Date.now();

    if (!options.silent) {
        console.log(`\n${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
        console.log(`${colors.bold}${colors.cyan}    ESP32 SMART SLUICE GATE SCADA — AUTOMATED TEST SUITE RUNNER     ${colors.reset}`);
        console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
        console.log(`${colors.dim}Target Runtime: Node.js ${process.version} | Timestamp: ${new Date().toISOString()}${colors.reset}\n`);
    }

    const tierRunners = [
        { id: 1, name: 'Tier 1: Syntax & Static Analysis', runner: runTier1 },
        { id: 2, name: 'Tier 2: Boundary & Corner Cases', runner: runTier2 },
        { id: 3, name: 'Tier 3: Client-Side Hash Routing & DOM', runner: runTier3 },
        { id: 4, name: 'Tier 4: SCADA State Integrity & Contracts', runner: runTier4 },
        { id: 5, name: 'Tier 5A: Adversarial Verification (Challenger 1 — Router & HTTP)', runner: runTier5Challenger1 },
        { id: 6, name: 'Tier 5B: Adversarial Verification (Challenger 2 — State & Audio)', runner: runTier5 }
    ];

    const summaries = [];
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    for (const tier of tierRunners) {
        if (options.tierFilter && options.tierFilter !== tier.id) {
            continue;
        }

        try {
            const summary = await tier.runner({ verbose: options.verbose, silent: options.silent });
            summaries.push({
                tierId: tier.id,
                name: tier.name,
                ...summary
            });
            totalTests += summary.total;
            totalPassed += summary.passed;
            totalFailed += summary.failed;
        } catch (e) {
            totalFailed++;
            summaries.push({
                tierId: tier.id,
                name: tier.name,
                total: 1,
                passed: 0,
                failed: 1,
                duration: 0,
                error: e.message,
                results: [{ name: 'Suite Execution', status: 'FAILED', error: e.message }]
            });
            if (!options.silent) {
                console.error(`${colors.red}Critical failure in ${tier.name}: ${e.message}${colors.reset}`);
            }
        }
    }

    const overallDuration = Date.now() - overallStartTime;

    if (options.json) {
        console.log(JSON.stringify({
            status: totalFailed === 0 ? 'SUCCESS' : 'FAILURE',
            totalTests,
            totalPassed,
            totalFailed,
            durationMs: overallDuration,
            tiers: summaries
        }, null, 2));
    } else {
        // Render Summary Table
        console.log(`${colors.bold}${colors.white}-----------------------------------------------------------------------------------------${colors.reset}`);
        console.log(
            `${colors.bold}${'Test Tier'.padEnd(42)} ${'Total'.padEnd(8)} ${'Passed'.padEnd(8)} ${'Failed'.padEnd(8)} ${'Duration'.padEnd(12)} Status${colors.reset}`
        );
        console.log(`${colors.bold}${colors.white}-----------------------------------------------------------------------------------------${colors.reset}`);

        for (const s of summaries) {
            const statusColor = s.failed === 0 ? colors.green : colors.red;
            const statusText = s.failed === 0 ? 'PASSED' : 'FAILED';
            const tierTitle = s.name.length > 40 ? s.name.substring(0, 37) + '...' : s.name;
            console.log(
                `${tierTitle.padEnd(42)} ${String(s.total).padEnd(8)} ${colors.green}${String(s.passed).padEnd(8)}${colors.reset} ${(s.failed > 0 ? colors.red : colors.dim) + String(s.failed).padEnd(8) + colors.reset} ${(`${s.duration}ms`).padEnd(12)} ${statusColor}${statusText}${colors.reset}`
            );
        }

        console.log(`${colors.bold}${colors.white}-----------------------------------------------------------------------------------------${colors.reset}`);
        
        const finalColor = totalFailed === 0 ? colors.bgGreen + colors.white : colors.bgRed + colors.white;
        console.log(`\n${finalColor}${colors.bold}  OVERALL RESULT: ${totalFailed === 0 ? 'ALL TIERS PASSED (100%)' : 'TEST SUITE FAILED'}  ${colors.reset}`);
        console.log(`  Total Tests: ${totalTests} | ${colors.green}Passed: ${totalPassed}${colors.reset} | ${totalFailed > 0 ? colors.red : colors.dim}Failed: ${totalFailed}${colors.reset} | Total Time: ${overallDuration}ms\n`);
    }

    // Exit code policy: 0 for all pass, 1 for any failure
    process.exit(totalFailed === 0 ? 0 : 1);
}

main().catch(err => {
    console.error('Fatal Test Runner Error:', err);
    process.exit(1);
});
