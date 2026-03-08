import sql from 'mssql';
const config = {
    server: 'sbrondel.database.windows.net',
    database: 'howdyscout2026',
    user: 'powerbi',
    password: 'HowdyStats!',
    options: { encrypt: true, trustServerCertificate: false, enableArithAbort: true }
};
const pool = await sql.connect(config);
const evRows = await pool.request().query('SELECT * FROM frc6377Events');
console.log('Events:', JSON.stringify(evRows.recordset, null, 2));
const evKeys = await pool.request().query('SELECT DISTINCT event_key FROM frc6377MatchScouting');
console.log('Keys in scouting:', JSON.stringify(evKeys.recordset, null, 2));
const teamCols = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Teams' ORDER BY ORDINAL_POSITION");
console.log('Teams cols:', JSON.stringify(teamCols.recordset, null, 2));
const emCols = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='EventMatches' ORDER BY ORDINAL_POSITION");
console.log('EventMatches cols:', JSON.stringify(emCols.recordset, null, 2));
const taeCols = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='TeamsAtEvent' ORDER BY ORDINAL_POSITION");
console.log('TeamsAtEvent cols:', JSON.stringify(taeCols.recordset, null, 2));
process.exit(0);

