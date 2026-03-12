import sql from 'mssql';
const cfg = { server:'sbrondel.database.windows.net', database:'howdyscout2026', user:'powerbi', password:'HowdyStats!', options:{encrypt:true,trustServerCertificate:false} };
const pool = await sql.connect(cfg);

const tables = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
process.stdout.write('=== ALL TABLES ===\n');
tables.recordset.forEach(r => process.stdout.write(`  ${r.TABLE_NAME}\n`));

const cols = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='frc6377MatchScoutingPrivate' ORDER BY ORDINAL_POSITION");
process.stdout.write('\n=== frc6377MatchScoutingPrivate COLUMNS ===\n');
cols.recordset.forEach(r => process.stdout.write(`  ${r.COLUMN_NAME}  (${r.DATA_TYPE})\n`));

const sample = await pool.request().query("SELECT TOP 1 * FROM frc6377MatchScoutingPrivate WHERE other_notes IS NOT NULL AND other_notes <> ''");
process.stdout.write('\n=== SAMPLE ROW ===\n' + JSON.stringify(sample.recordset[0], null, 2) + '\n');

await pool.close();
process.exit(0);

