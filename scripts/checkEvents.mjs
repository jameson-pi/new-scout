import sql from 'mssql';
const config = {
    server: 'sbrondel.database.windows.net',
    database: 'howdyscout2026',
    user: 'powerbi',
    password: 'HowdyStats!',
    options: { encrypt: true, trustServerCertificate: false, enableArithAbort: true }
};
const pool = await sql.connect(config);

// Check what events match our filter
const r = await pool.request().query(`
    SELECT event_key, event_name 
    FROM frc6377Events 
    WHERE event_key IN ('2026howdy','2026Howdy','2026txcle','2026txman')
`);
console.log('Matching events:', JSON.stringify(r.recordset, null, 2));

// Also check all events to see what keys exist
const all = await pool.request().query('SELECT event_key, event_name FROM frc6377Events ORDER BY event_key');
console.log('All events:', JSON.stringify(all.recordset, null, 2));
process.exit(0);

