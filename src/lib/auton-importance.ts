/**
 * auton-importance CLI
 *
 * Analyzes FRC match data to quantify how often winning autonomous by exactly
 * 1 point correlates with winning the full match.
 *
 * Usage:
 *   npm run auton-importance -- --year 2024
 *   npm run auton-importance -- --year 2024 --event 2024txcle
 *   npm run auton-importance -- --year 2024 --level qm --use-statbotics
 *   npm run auton-importance -- --year 2024 --json-out results.json
 *
 * Required environment variable:
 *   TBA_AUTH_KEY   – The Blue Alliance API auth key
 *
 * Optional environment variable:
 *   STATBOTICS_API_BASE – Override Statbotics API base URL
 */

import * as fs from 'fs';
import {
    runAutonImportanceAnalysis,
    AutonImportanceResult,
    AutonImportanceSummary,
    AutonMatchRecord,
} from './autonImportance';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliArgs {
    year: number;
    event?: string;
    level?: string;
    limit?: number;
    jsonOut?: string;
    useStatbotics: boolean;
    help: boolean;
}

function printHelp(): void {
    console.log(`
auton-importance — FRC Autonomous Importance Analyzer
======================================================

Finds all matches where one alliance won autonomous by exactly 1 point and
reports how often those alliances went on to win the full match.

Usage:
  npm run auton-importance -- [options]

Options:
  --year <year>         Season year (required, e.g. 2024)
  --event <eventKey>    Limit to a single event (e.g. 2024txcle)
  --level <level>       Filter by comp level: qm | ef | qf | sf | f
  --limit <n>           Stop after analysing n qualifying matches
  --json-out <file>     Write full JSON results to this file path
  --use-statbotics      Enrich matches with Statbotics EPA data
  --help                Show this help message

Environment variables:
  TBA_AUTH_KEY          (required) The Blue Alliance API auth key
  STATBOTICS_API_BASE   (optional) Override Statbotics API base URL

Examples:
  # Analyse all 2024 qualification matches
  npm run auton-importance -- --year 2024 --level qm

  # Analyse a single event with Statbotics EPA enrichment
  npm run auton-importance -- --year 2024 --event 2024txcle --use-statbotics

  # Export to JSON
  npm run auton-importance -- --year 2024 --json-out ./out/2024-auton.json
`);
}

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = {
        year: 0,
        useStatbotics: false,
        help: false,
    };

    let i = 0;
    while (i < argv.length) {
        const arg = argv[i];
        switch (arg) {
            case '--help':
            case '-h':
                args.help = true;
                break;
            case '--year':
                args.year = parseInt(argv[++i], 10);
                break;
            case '--event':
                args.event = argv[++i];
                break;
            case '--level':
                args.level = argv[++i];
                break;
            case '--limit':
                args.limit = parseInt(argv[++i], 10);
                break;
            case '--json-out':
                args.jsonOut = argv[++i];
                break;
            case '--use-statbotics':
                args.useStatbotics = true;
                break;
            default:
                console.warn(`Unknown argument: ${arg}`);
        }
        i++;
    }
    return args;
}

// ---------------------------------------------------------------------------
// Human-readable table output
// ---------------------------------------------------------------------------

function pct(n: number): string {
    return `${n.toFixed(1)}%`;
}

function printSummaryTable(label: string, s: AutonImportanceSummary): void {
    const bar = '─'.repeat(52);
    console.log(`\n┌${bar}┐`);
    console.log(`│  ${label.padEnd(50)}│`);
    console.log(`├${bar}┤`);
    console.log(`│  Total qualifying matches (auton margin = ±1): ${String(s.totalMatches).padEnd(3)}│`);
    console.log(`│  Auton winner also won overall:  ${String(s.wins).padEnd(4)} (${pct(s.winPct).padStart(6)})  │`);
    console.log(`│  Auton winner lost overall:      ${String(s.losses).padEnd(4)} (${pct(s.lossPct).padStart(6)})  │`);
    console.log(`│  Tie:                            ${String(s.ties).padEnd(4)} (${pct(s.tiePct).padStart(6)})  │`);
    console.log(`└${bar}┘`);
}

function printMarginDistribution(dist: Record<number, number>): void {
    const entries = Object.entries(dist)
        .map(([k, v]) => ({ margin: Number(k), count: v }))
        .sort((a, b) => a.margin - b.margin);

    if (entries.length === 0) return;

    const maxCount = Math.max(...entries.map((e) => e.count));

    console.log('\nFinal score margin distribution (from auton winner\'s perspective):');
    console.log('  Margin  Count  Bar');
    console.log('  ──────  ─────  ' + '─'.repeat(30));
    for (const { margin, count } of entries) {
        const barLen = Math.round((count / maxCount) * 30);
        const bar = '█'.repeat(barLen);
        const marginStr = String(margin).padStart(6);
        const countStr = String(count).padStart(5);
        console.log(`  ${marginStr}  ${countStr}  ${bar}`);
    }
}

function printRecordsTable(records: AutonMatchRecord[], maxRows = 20): void {
    if (records.length === 0) return;

    const showEpa = records.some((r) => r.epaRed !== undefined);

    const header = showEpa
        ? '  Match                         Yr  Lvl  Auton(B/R)  FinalScore  Result  EPADiff'
        : '  Match                         Yr  Lvl  Auton(B/R)  FinalScore  Result';
    console.log('\nSample matches (auton margin = ±1):');
    console.log(header);
    console.log('  ' + '─'.repeat(header.length - 2));

    const shown = records.slice(0, maxRows);
    for (const r of shown) {
        const auton = `${r.autonBlue}/${r.autonRed}`;
        const score = `${r.finalScoreBlue}/${r.finalScoreRed}`;
        const result = r.matchResultForAutonWinner.padEnd(6);
        const line = [
            r.matchKey.padEnd(30),
            String(r.year).padStart(4),
            r.compLevel.padEnd(4),
            auton.padEnd(11),
            score.padEnd(11),
            result,
        ].join('  ');
        if (showEpa) {
            const epaDiff = r.epaDiff !== undefined ? r.epaDiff.toFixed(1) : 'N/A';
            console.log(`  ${line}  ${epaDiff}`);
        } else {
            console.log(`  ${line}`);
        }
    }

    if (records.length > maxRows) {
        console.log(`  ... and ${records.length - maxRows} more matches`);
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    const rawArgs = process.argv.slice(2);
    const args = parseArgs(rawArgs);

    if (args.help) {
        printHelp();
        return;
    }

    if (!args.year || isNaN(args.year)) {
        console.error('Error: --year <year> is required.\n');
        printHelp();
        process.exit(1);
    }

    if (!process.env.TBA_AUTH_KEY) {
        console.error('Error: TBA_AUTH_KEY environment variable is not set.');
        process.exit(1);
    }

    console.log(`\nAuton Importance Analysis`);
    console.log(`Year: ${args.year}${args.event ? `  Event: ${args.event}` : ''}${args.level ? `  Level: ${args.level}` : ''}${args.useStatbotics ? '  [Statbotics EPA enabled]' : ''}`);
    console.log('Fetching match data from The Blue Alliance...');

    let result: AutonImportanceResult;
    try {
        result = await runAutonImportanceAnalysis({
            year: args.year,
            event: args.event,
            level: args.level,
            limit: args.limit,
            useStatbotics: args.useStatbotics,
        });
    } catch (e) {
        console.error(`\nAnalysis failed: ${(e as Error).message}`);
        process.exit(1);
    }

    if (result.records.length === 0) {
        console.log('\nNo qualifying matches found (auton margin = ±1).');
        console.log('This may mean no score breakdown data is available for the selected filters.');
        return;
    }

    // --- Overall summary ---
    printSummaryTable(`Overall — ${args.year}`, result.summary);

    // --- By event (if multiple events) ---
    const eventKeys = Object.keys(result.byEvent);
    if (eventKeys.length > 1 && eventKeys.length <= 20) {
        console.log('\nBy Event:');
        for (const ek of eventKeys.sort()) {
            const s = result.byEvent[ek];
            const line = `  ${ek.padEnd(20)} | ${String(s.totalMatches).padStart(4)} matches | ` +
                `Win ${pct(s.winPct).padStart(6)} | Loss ${pct(s.lossPct).padStart(6)} | Tie ${pct(s.tiePct).padStart(6)}`;
            console.log(line);
        }
    }

    // --- Margin distribution ---
    printMarginDistribution(result.summary.finalMarginDistribution);

    // --- Sample records ---
    printRecordsTable(result.records);

    // --- JSON export ---
    if (args.jsonOut) {
        const dir = args.jsonOut.split('/').slice(0, -1).join('/');
        if (dir) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(args.jsonOut, JSON.stringify(result, null, 2), 'utf-8');
        console.log(`\nResults written to ${args.jsonOut}`);
    }
}

main().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
