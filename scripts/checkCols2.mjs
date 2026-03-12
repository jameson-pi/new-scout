import sql from 'mssql';
const cfg = { server:'sbrondel.database.windows.net', database:'howdyscout2026', user:'powerbi', password:'HowdyStats!', options:{encrypt:true,trustServerCertificate:false} };
const pool = await sql.connect(cfg);
const m = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='frc6377MatchScouting' ORDER BY ORDINAL_POSITION");
console.log('MatchScouting cols:', m.recordset.map(x=>x.COLUMN_NAME).join(', '));
const p = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='frc6377TeamScoutingPrivate' ORDER BY ORDINAL_POSITION");
console.log('PitScouting cols:', p.recordset.map(x=>x.COLUMN_NAME).join(', '));
const s = await pool.request().query("SELECT TOP 1 * FROM frc6377MatchScouting WHERE event_key='2026howdy'");
console.log('Sample match row:', JSON.stringify(s.recordset[0], null, 2));
process.exit(0);

