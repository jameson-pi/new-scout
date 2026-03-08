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
console.log('ALL Events:', JSON.stringify(evRows.recordset, null, 2));
process.exit(0);

