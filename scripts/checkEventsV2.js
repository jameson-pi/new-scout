const sql = require('mssql');
const config = {
    server: 'sbrondel.database.windows.net',
    database: 'howdyscout2026',
    user: 'powerbi',
    password: 'HowdyStats!',
    options: { encrypt: true, trustServerCertificate: false, enableArithAbort: true }
};
sql.connect(config).then(pool => {
    return pool.request().query("SELECT event_key, event_name FROM frc6377Events ORDER BY event_key");
}).then(r => {
    console.log('All events:', JSON.stringify(r.recordset));
    process.exit(0);
}).catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});

