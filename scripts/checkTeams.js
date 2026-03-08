const sql = require('mssql');
const config = {
    server: 'sbrondel.database.windows.net',
    database: 'howdyscout2026',
    user: 'powerbi',
    password: 'HowdyStats!',
    options: { encrypt: true, trustServerCertificate: false, enableArithAbort: true }
};
sql.connect(config).then(async pool => {
    const tae = await pool.request().query("SELECT event_key, COUNT(*) as cnt FROM TeamsAtEvent GROUP BY event_key");
    console.log('TeamsAtEvent counts:', JSON.stringify(tae.recordset));

    const taeRows = await pool.request().query("SELECT TOP 5 * FROM TeamsAtEvent ORDER BY event_key");
    console.log('TeamsAtEvent sample:', JSON.stringify(taeRows.recordset));

    const teams = await pool.request().query("SELECT TOP 5 * FROM Teams ORDER BY team_number");
    console.log('Teams sample:', JSON.stringify(teams.recordset));

    process.exit(0);
}).catch(e => { console.error('Error:', e.message); process.exit(1); });

