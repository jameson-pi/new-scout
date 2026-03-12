const sql = require('mssql');
const config = {
    server: 'sbrondel.database.windows.net',
    database: 'howdyscout2026',
    user: 'powerbi',
    password: 'HowdyStats!',
    options: { encrypt: true, trustServerCertificate: false, enableArithAbort: true }
};

sql.connect(config).then(async pool => {
    const tables = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
    process.stdout.write('Tables:\n');
    tables.recordset.forEach(r => process.stdout.write(`  - ${r.TABLE_NAME}\n`));

    const cols = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='frc6377MatchScoutingPrivate' ORDER BY ORDINAL_POSITION");
    process.stdout.write('\nfrc6377MatchScoutingPrivate columns:\n');
    cols.recordset.forEach(r => process.stdout.write(`  - ${r.COLUMN_NAME} (${r.DATA_TYPE})\n`));

    const sample = await pool.request().query("SELECT TOP 1 * FROM frc6377MatchScoutingPrivate");
    process.stdout.write('\nSample row:\n' + JSON.stringify(sample.recordset[0], null, 2) + '\n');

    process.exit(0);
}).catch(e => {
    process.stderr.write('Error: ' + e.message + '\n');
    process.exit(1);
});
