const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://myshopdb_mbpm_user:YDPfxpjJXdYJcpqI1svSr9XquBfKCPQ4@dpg-d09vmq3ipnbc73b7f340-a.oregon-postgres.render.com/myshopdb_mbpm',
  ssl: {
    rejectUnauthorized: false
  }
});

// Create appointments table if not exists
pool.query(`CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  time VARCHAR(10) NOT NULL,
  service VARCHAR(100) NOT NULL,
  duration INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  client VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL
);`).catch(err => console.error('Error creating table:', err));

// Get all appointments
app.get('/appointments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM appointments ORDER BY date, time');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new appointment
app.post('/appointments', async (req, res) => {
  const { date, time, service, duration, price, client, status } = req.body;
  try {
    await pool.query(
      'INSERT INTO appointments (date, time, service, duration, price, client, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [date, time, service, duration, price, client, status]
    );
    const result = await pool.query('SELECT * FROM appointments ORDER BY date, time');
    res.json(result.rows);
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 