const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: 'postgresql://myshopdb_mbpm_user:YDPfxpjJXdYJcpqI1svSr9XquBfKCPQ4@dpg-d09vmq3ipnbc73b7f340-a.oregon-postgres.render.com/myshopdb_mbpm',
    ssl: {
        rejectUnauthorized: false,
        require: true
    },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 20
});

async function updateSchema() {
    const client = await pool.connect();
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'update_schema.sql'), 'utf8');
        await client.query(sql);
        console.log('Database schema updated successfully');
    } catch (error) {
        console.error('Error updating schema:', error);
    } finally {
        client.release();
        pool.end();
    }
}

updateSchema(); 