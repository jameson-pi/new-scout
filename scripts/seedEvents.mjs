// Seed 2026 HowdyScout events into frc6377Events
import sql from 'mssql';
const config = {
    server: 'sbrondel.database.windows.net',
    database: 'howdyscout2026',
    user: 'powerbi',
    password: 'HowdyStats!',
    options: { encrypt: true, trustServerCertificate: false, enableArithAbort: true }
};

const pool = await sql.connect(config);

const events = [
    { key: '2026howdy',  name: 'HowdyScout Practice', start: '2026-02-01', end: '2026-02-01' },
    { key: '2026txcle',  name: 'Space City #1',        start: '2026-03-19', end: '2026-03-22' },
    { key: '2026txman',  name: 'Manor District',       start: '2026-03-26', end: '2026-03-29' },
    { key: '2026txcmp1', name: 'Texas District Championship Mercury', start: '2026-04-15', end: '2026-04-18' },
];

for (const ev of events) {
    const r = await pool.request()
        .input('ik',    sql.VarChar(50),  ev.key)
        .input('ek',    sql.VarChar(50),  ev.key)
        .input('en',    sql.VarChar(100), ev.name)
        .input('sd',    sql.VarChar(20),  ev.start)
        .input('ed',    sql.VarChar(20),  ev.end)
        .query(`
            MERGE frc6377Events AS target
            USING (SELECT @ik AS internal_key) AS source ON target.internal_key = source.internal_key
            WHEN NOT MATCHED THEN
                INSERT (internal_key, event_key, event_name, start_date, end_date)
                VALUES (@ik, @ek, @en, @sd, @ed)
            WHEN MATCHED THEN
                UPDATE SET event_key = @ek, event_name = @en, start_date = @sd, end_date = @ed;
        `);
    console.log(`Seeded: ${ev.key} — ${ev.name}`);
}

console.log('Done seeding events.');
process.exit(0);
