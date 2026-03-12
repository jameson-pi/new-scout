import sql from 'mssql';
const cfg = { server:'sbrondel.database.windows.net', database:'howdyscout2026', user:'powerbi', password:'HowdyStats!', options:{encrypt:true,trustServerCertificate:false} };
const pool = await sql.connect(cfg);

const matchCols = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='frc6377MatchScouting' ORDER BY ORDINAL_POSITION");
process.stdout.write('MatchScouting cols: ' + matchCols.recordset.map(x=>x.COLUMN_NAME).join(', ') + '\n');

const pitCols = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='frc6377TeamScoutingPrivate' ORDER BY ORDINAL_POSITION");
process.stdout.write('PitScouting cols: ' + pitCols.recordset.map(x=>x.COLUMN_NAME).join(', ') + '\n');

// Add other_notes to match scouting if missing
const hasMatchNotes = matchCols.recordset.some(x => x.COLUMN_NAME === 'other_notes');
if (!hasMatchNotes) {
    await pool.request().query('ALTER TABLE frc6377MatchScouting ADD other_notes NVARCHAR(MAX)');
    process.stdout.write('SUCCESS: Added other_notes to frc6377MatchScouting\n');
} else {
    process.stdout.write('other_notes already exists in frc6377MatchScouting\n');
}

// Add other_notes to pit scouting if missing
const hasPitNotes = pitCols.recordset.some(x => x.COLUMN_NAME === 'other_notes');
if (!hasPitNotes) {
    await pool.request().query('ALTER TABLE frc6377TeamScoutingPrivate ADD other_notes NVARCHAR(MAX)');
    process.stdout.write('SUCCESS: Added other_notes to frc6377TeamScoutingPrivate\n');
} else {
    process.stdout.write('other_notes already exists in frc6377TeamScoutingPrivate\n');
}

// Sample any existing pit notes
const pitSample = await pool.request().query("SELECT TOP 5 frc_team, event_key FROM frc6377TeamScoutingPrivate");
process.stdout.write('Pit rows: ' + JSON.stringify(pitSample.recordset) + '\n');

await pool.close();
process.exit(0);


