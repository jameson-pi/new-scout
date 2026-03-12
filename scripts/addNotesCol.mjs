import sql from 'mssql';
const cfg = { server:'sbrondel.database.windows.net', database:'howdyscout2026', user:'powerbi', password:'HowdyStats!', options:{encrypt:true,trustServerCertificate:false} };
const pool = await sql.connect(cfg);
const cols = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='frc6377MatchScouting' ORDER BY ORDINAL_POSITION");
console.log('Match cols:', cols.recordset.map(x=>x.COLUMN_NAME).join(', '));
try {
    await pool.request().query('ALTER TABLE frc6377MatchScouting ADD other_notes NVARCHAR(MAX)');
    console.log('SUCCESS: Added other_notes column to frc6377MatchScouting');
} catch(e) {
    console.log('Col add result:', e.message);
}
process.exit(0);

