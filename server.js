const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'MyShop',
  password: 'postgre2002007968', // replace with your actual password
  port: 5432,
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
);`);

// Get all appointments
app.get('/appointments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM appointments ORDER BY date, time');
    res.json(result.rows);
  } catch (err) {
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
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
}); 