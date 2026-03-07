/**
 * Azure SQL Server connection pool
 * HowdyScout 2026 — REBUILT™ Edition
 */

import sql from 'mssql';

const config: sql.config = {
    server: process.env.DB_SERVER || 'sbrondel.database.windows.net',
    database: process.env.DB_DATABASE || 'howdyscout2026',
    user: process.env.DB_USER || 'powerbi',
    password: process.env.DB_PASSWORD || 'HowdyStats!',
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
};

// Singleton pool — reused across requests in Next.js server environment
let pool: sql.ConnectionPool | null = null;
let poolPromise: Promise<sql.ConnectionPool> | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
    if (pool && pool.connected) return pool;
    if (poolPromise) return poolPromise;

    poolPromise = new sql.ConnectionPool(config)
        .connect()
        .then(p => {
            pool = p;
            poolPromise = null;
            console.log('[DB] Connected to Azure SQL — howdyscout2026');
            return p;
        })
        .catch(err => {
            poolPromise = null;
            console.error('[DB] Connection failed:', err.message);
            throw err;
        });

    return poolPromise;
}

export { sql };

