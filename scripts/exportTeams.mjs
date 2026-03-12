/**
 * HowdyScout 2026 — Team Data Export
 * Usage: node scripts/exportTeams.mjs [eventKey]
 * Example: node scripts/exportTeams.mjs 2026txcle
 * Outputs: scripts/out/{eventKey}-teams.csv and .json
 */

import sql from 'mssql';
import fs from 'fs';
import path from 'path';

const EVENT_KEY = process.argv[2] || '2026txcle';

const config = {
    server: 'sbrondel.database.windows.net',
    database: 'howdyscout2026',
    user: 'powerbi',
    password: 'HowdyStats!',
    options: { encrypt: true, trustServerCertificate: false, enableArithAbort: true }
};

const TELE_TOWER = { 'Level1': 10, 'Level2': 20, 'Level3': 30, 'No Attempt': 0, 'Failed': 0 };
const AUTO_TOWER = { 'Level1': 15, 'No Attempt': 0, 'Failed': 0 };

function climbPoints(level, phase) {
    return phase === 'auto' ? (AUTO_TOWER[level] || 0) : (TELE_TOWER[level] || 0);
}

process.stdout.write(`\n🏁  HowdyScout Export — Event: ${EVENT_KEY}\n`);
process.stdout.write(`${'─'.repeat(60)}\n`);

const pool = await sql.connect(config);
process.stdout.write(`✓  Connected to Azure SQL\n`);

// ── Match scouting + notes ────────────────────────────────────────────────
const matchResult = await pool.request()
    .input('eventKey', sql.NVarChar(20), EVENT_KEY)
    .query(`
        SELECT
            m.frc_team, m.match_key, m.match_number, m.scouted_by,
            m.auto_fuel_scored, m.auto_climb_level, m.auto_moved,
            m.tele_fuel_scored, m.tele_climb_level,
            m.mech_failure, m.defender_rating,
            ISNULL(p.other_notes, '') AS other_notes
        FROM frc6377MatchScouting m
        LEFT JOIN frc6377MatchScoutingPrivate p
            ON p.match_key = m.match_key
           AND p.frc_team  = m.frc_team
           AND p.driver_station = m.driver_station
           AND p.scouted_by    = m.scouted_by
        WHERE LOWER(m.event_key) = LOWER(@eventKey)
        ORDER BY m.frc_team ASC, m.match_number ASC
    `);

// ── Pit scouting ──────────────────────────────────────────────────────────
const pitResult = await pool.request()
    .input('eventKey', sql.NVarChar(20), EVENT_KEY)
    .query(`
        SELECT frc_team, drivebase, climb, hopper_capacity, turret,
               trench, bump, can_lob, pickup_floor, shift_tracking,
               robot_quality, pit_quality, other_notes AS pit_notes,
               scouted_by AS pit_scouted_by
        FROM frc6377TeamScoutingPrivate
        WHERE LOWER(event_key) = LOWER(@eventKey)
    `);

// ── All registered teams at event ─────────────────────────────────────────
const rosterResult = await pool.request()
    .input('eventKey', sql.NVarChar(20), EVENT_KEY)
    .query(`
        SELECT tae.frc_team, ISNULL(t.name, '') AS team_name
        FROM TeamsAtEvent tae
        LEFT JOIN Teams t ON t.frc_team = tae.frc_team
        WHERE LOWER(tae.event_key) = LOWER(@eventKey)
        ORDER BY TRY_CAST(tae.frc_team AS INT) ASC
    `);

await pool.close();

const rosterMap = {};
for (const row of rosterResult.recordset) {
    rosterMap[row.frc_team] = row.team_name || '';
}

// ── Group match rows by team ──────────────────────────────────────────────
const teamMap = {};
for (const row of matchResult.recordset) {
    const key = row.frc_team;
    if (!teamMap[key]) teamMap[key] = [];
    teamMap[key].push(row);
}

const pitMap = {};
for (const row of pitResult.recordset) {
    pitMap[row.frc_team] = row;
}

// ── Aggregate per team ────────────────────────────────────────────────────
const teams = Object.entries(teamMap).map(([team, rows]) => {
    const n = rows.length;

    const avgAutoFuel   = rows.reduce((a, r) => a + (Number(r.auto_fuel_scored) || 0), 0) / n;
    const avgTeleFuel   = rows.reduce((a, r) => a + (Number(r.tele_fuel_scored)  || 0), 0) / n;
    const avgTotalFuel  = avgAutoFuel + avgTeleFuel;
    const avgAutoTower  = rows.reduce((a, r) => a + climbPoints(r.auto_climb_level, 'auto'), 0) / n;
    const avgTeleTower  = rows.reduce((a, r) => a + climbPoints(r.tele_climb_level, 'tele'), 0) / n;
    const avgTotalPts   = avgAutoFuel + avgTeleFuel + avgAutoTower + avgTeleTower +
                          rows.reduce((a, r) => a + (r.auto_moved === 'Yes' ? 3 : 0), 0) / n;
    const mobilityPct   = Math.round(rows.filter(r => r.auto_moved === 'Yes').length / n * 100);
    const climbRate     = Math.round(rows.filter(r => r.tele_climb_level !== 'No Attempt' && r.tele_climb_level !== 'Failed').length / n * 100);
    const bestClimb     = rows.reduce((best, r) => {
        const pts = climbPoints(r.tele_climb_level, 'tele');
        return pts > climbPoints(best, 'tele') ? r.tele_climb_level : best;
    }, 'No Attempt');
    const failureRate   = Math.round(rows.filter(r => r.mech_failure === 'Yes').length / n * 100);
    const avgDefense    = rows.reduce((a, r) => a + (Number(r.defender_rating) || 0), 0) / n;

    // Compile all notes (skip blanks)
    const allNotes = rows
        .filter(r => r.other_notes && r.other_notes.trim())
        .map(r => `[Q${r.match_number} – ${r.scouted_by}] ${r.other_notes.trim()}`);

    const pit = pitMap[team] || null;

    return {
        team,
        team_name: rosterMap[team] || '',
        matches: n,
        avgTotalPts:   +avgTotalPts.toFixed(1),
        avgAutoFuel:   +avgAutoFuel.toFixed(1),
        avgTeleFuel:   +avgTeleFuel.toFixed(1),
        avgTotalFuel:  +avgTotalFuel.toFixed(1),
        avgAutoTower:  +avgAutoTower.toFixed(1),
        avgTeleTower:  +avgTeleTower.toFixed(1),
        bestClimb,
        climbRate_pct: climbRate,
        mobility_pct:  mobilityPct,
        mechFailure_pct: failureRate,
        avgDefenseRating: +avgDefense.toFixed(1),
        // Pit
        drivebase:     pit?.drivebase       || '',
        maxClimb:      pit?.climb           || '',
        hopperCap:     pit?.hopper_capacity ?? '',
        turret:        pit?.turret          || '',
        trench:        pit?.trench          || '',
        bump:          pit?.bump            || '',
        canLob:        pit?.can_lob         || '',
        floorPickup:   pit?.pickup_floor    || '',
        shiftTracking: pit?.shift_tracking  || '',
        robotQuality:  pit?.robot_quality   ?? '',
        pitNotes:      pit?.pit_notes       || '',
        // Compiled scouter notes
        scouterNotes:  allNotes.join(' | '),
    };
}).sort((a, b) => b.avgTotalPts - a.avgTotalPts);

// ── Add unscouted roster teams ────────────────────────────────────────────
const scoutedTeams = new Set(teams.map(t => t.team));
const unscoutedTeams = Object.keys(rosterMap)
    .filter(t => !scoutedTeams.has(t))
    .map(team => {
        const pit = pitMap[team] || null;
        return {
            team,
            team_name: rosterMap[team] || '',
            matches: 0,
            avgTotalPts: 0,
            avgAutoFuel: 0,
            avgTeleFuel: 0,
            avgTotalFuel: 0,
            avgAutoTower: 0,
            avgTeleTower: 0,
            bestClimb: '',
            climbRate_pct: '',
            mobility_pct: '',
            mechFailure_pct: '',
            avgDefenseRating: '',
            drivebase:     pit?.drivebase       || '',
            maxClimb:      pit?.climb           || '',
            hopperCap:     pit?.hopper_capacity ?? '',
            turret:        pit?.turret          || '',
            trench:        pit?.trench          || '',
            bump:          pit?.bump            || '',
            canLob:        pit?.can_lob         || '',
            floorPickup:   pit?.pickup_floor    || '',
            shiftTracking: pit?.shift_tracking  || '',
            robotQuality:  pit?.robot_quality   ?? '',
            pitNotes:      pit?.pit_notes       || '',
            scouterNotes:  '',
        };
    }).sort((a, b) => Number(a.team) - Number(b.team));

const allTeams = [...teams, ...unscoutedTeams];

// ── Console table ─────────────────────────────────────────────────────────
process.stdout.write(`\n📊  ${teams.length} scouted / ${allTeams.length} total teams at event:\n\n`);

const header = ['#', 'Team', 'Name', 'Matches', 'Avg Pts', 'Avg Fuel', 'Best Climb', 'Climb%', 'Fail%', 'Notes'];
const widths  = [3, 6, 24, 7, 8, 9, 11, 7, 5, 40];
const row2str = (cols) => cols.map((c, i) => String(c).padEnd(widths[i])).join('  ');

process.stdout.write(row2str(header) + '\n');
process.stdout.write('─'.repeat(widths.reduce((a,b)=>a+b,0) + widths.length*2) + '\n');

allTeams.forEach((t, i) => {
    const notePreview = t.scouterNotes ? t.scouterNotes.substring(0, 38) + (t.scouterNotes.length > 38 ? '…' : '') : '—';
    const name = t.team_name ? t.team_name.substring(0, 22) : '—';
    process.stdout.write(row2str([
        i + 1, t.team, name, t.matches || '—', t.avgTotalPts || '—', t.avgTotalFuel || '—',
        t.bestClimb || '—', t.climbRate_pct !== '' ? t.climbRate_pct + '%' : '—',
        t.mechFailure_pct !== '' ? t.mechFailure_pct + '%' : '—', notePreview
    ]) + '\n');
});

// Full notes section
const teamsWithNotes = allTeams.filter(t => t.scouterNotes);
if (teamsWithNotes.length > 0) {
    process.stdout.write(`\n📝  Compiled Scouter Notes:\n${'─'.repeat(60)}\n`);
    for (const t of teamsWithNotes) {
        process.stdout.write(`\nTeam ${t.team}${t.team_name ? ` (${t.team_name})` : ''}:\n`);
        t.scouterNotes.split(' | ').forEach(note => {
            process.stdout.write(`  • ${note}\n`);
        });
    }
}

// ── Write files ───────────────────────────────────────────────────────────
const outDir = path.join(process.cwd(), 'scripts', 'out');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// JSON
const jsonPath = path.join(outDir, `${EVENT_KEY}-teams.json`);
fs.writeFileSync(jsonPath, JSON.stringify(allTeams, null, 2));
process.stdout.write(`\n✅  JSON → ${jsonPath}\n`);

// CSV
const csvCols = Object.keys(allTeams[0] || {});
const csvLines = [
    csvCols.join(','),
    ...allTeams.map(t => csvCols.map(k => {
        const v = String(t[k] ?? '').replace(/"/g, '""');
        return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v}"` : v;
    }).join(','))
];
const csvPath = path.join(outDir, `${EVENT_KEY}-teams.csv`);
fs.writeFileSync(csvPath, csvLines.join('\n'));
process.stdout.write(`✅  CSV  → ${csvPath}\n\n`);

