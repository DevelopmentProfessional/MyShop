const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Configure CORS
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'booking-calendar.html'));
});

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://myshopdb_mbpm_user:YDPfxpjJXdYJcpqI1svSr9XquBfKCPQ4@dpg-d09vmq3ipnbc73b7f340-a.oregon-postgres.render.com/myshopdb_mbpm',
  ssl: {
    rejectUnauthorized: false,
    require: true
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20
};

const pool = new Pool(dbConfig);

// Test database connection with retry logic
async function testConnection(retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await pool.query('SELECT NOW()');
      console.log('Database connected successfully');
      return true;
    } catch (err) {
      console.error(`Database connection attempt ${i + 1} failed:`, err);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
}

// Create tables if they don't exist
async function initializeTables() {
  try {
    // Create clients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create services table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        duration INTEGER NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create appointments table with foreign keys
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        time VARCHAR(10) NOT NULL,
        service_id INTEGER REFERENCES services(id),
        duration INTEGER NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        client_id INTEGER REFERENCES clients(id),
        status VARCHAR(30) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price NUMERIC(10,2) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        category VARCHAR(50),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if we need to insert initial data
    const servicesCount = await pool.query('SELECT COUNT(*) FROM services');
    if (servicesCount.rows[0].count === '0') {
      // Insert initial services
      await pool.query(`
        INSERT INTO services (name, duration, price, status) VALUES
        ('Haircut', 30, 25.00, 'active'),
        ('Hair Coloring', 120, 75.00, 'active'),
        ('Manicure', 45, 35.00, 'active'),
        ('Pedicure', 60, 45.00, 'active'),
        ('Massage', 60, 80.00, 'active'),
        ('Facial', 45, 60.00, 'active'),
        ('Waxing', 30, 40.00, 'active')
      `);
      console.log('Initial services inserted');
    }

    const clientsCount = await pool.query('SELECT COUNT(*) FROM clients');
    if (clientsCount.rows[0].count === '0') {
      // Insert initial clients
      await pool.query(`
        INSERT INTO clients (name, email, phone) VALUES
        ('John Doe', 'john@example.com', '555-0101'),
        ('Jane Smith', 'jane@example.com', '555-0102'),
        ('Bob Johnson', 'bob@example.com', '555-0103'),
        ('Alice Brown', 'alice@example.com', '555-0104'),
        ('Charlie Wilson', 'charlie@example.com', '555-0105')
      `);
      console.log('Initial clients inserted');
    }

    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Error initializing tables:', err);
    throw err; // Re-throw to handle in the connection test
  }
}

// Initialize database connection and tables
async function initializeDatabase() {
  try {
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to establish database connection');
    }
    
    await initializeTables();
    console.log('Database initialization completed successfully');
    return true;
  } catch (err) {
    console.error('Database initialization failed:', err);
    return false;
  }
}

// Start server only after database is initialized
initializeDatabase().then(success => {
  if (success) {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } else {
    console.error('Server failed to start due to database initialization failure');
    process.exit(1);
  }
});

// Client Routes
app.get('/clients', async (req, res) => {
  try {
    console.log('Fetching clients...');
    const result = await pool.query('SELECT * FROM clients ORDER BY name');
    console.log(`Successfully fetched ${result.rows.length} clients`);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching clients:', err);
    res.status(500).json({ 
      error: 'Failed to fetch clients',
      details: err.message,
      code: err.code 
    });
  }
});

app.post('/clients', async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO clients (name, email, phone) VALUES ($1, $2, $3) RETURNING *',
      [name, email, phone]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating client:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/clients/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  
  try {
    // Validate client exists
    const clientCheck = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Input validation
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate phone format
    const phoneRegex = /^[\d-]+$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone format' });
    }

    // Check for duplicate email
    const duplicateCheck = await pool.query(
      'SELECT * FROM clients WHERE email = $1 AND id != $2',
      [email, id]
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Update client
    const result = await pool.query(
      'UPDATE clients SET name = $1, email = $2, phone = $3 WHERE id = $4 RETURNING *',
      [name, email, phone, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ 
      error: 'Failed to update client',
      details: err.message,
      code: err.code 
    });
  }
});

app.delete('/clients/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    console.error('Error deleting client:', err);
    res.status(500).json({ error: err.message });
  }
});

// Service Routes
app.get('/services', async (req, res) => {
  try {
    console.log('Fetching services...');
    const result = await pool.query('SELECT * FROM services ORDER BY name');
    console.log(`Successfully fetched ${result.rows.length} services`);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ 
      error: 'Failed to fetch services',
      details: err.message,
      code: err.code 
    });
  }
});

app.post('/services', async (req, res) => {
  const { name, duration, price, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO services (name, duration, price, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, duration, price, status]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating service:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/services/:id', async (req, res) => {
  const { id } = req.params;
  const { name, duration, price, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE services SET name = $1, duration = $2, price = $3, status = $4 WHERE id = $5 RETURNING *',
      [name, duration, price, status, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating service:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/services/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM services WHERE id = $1', [id]);
    res.json({ message: 'Service deleted successfully' });
  } catch (err) {
    console.error('Error deleting service:', err);
    res.status(500).json({ error: err.message });
  }
});

// Appointment Routes
app.get('/appointments', async (req, res) => {
  try {
    console.log('Fetching appointments...');
    const result = await pool.query(`
      SELECT a.*, c.name as client_name, s.name as service_name 
      FROM appointments a 
      JOIN clients c ON a.client_id = c.id 
      JOIN services s ON a.service_id = s.id 
      ORDER BY date, time
    `);
    console.log(`Successfully fetched ${result.rows.length} appointments`);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ 
      error: 'Failed to fetch appointments',
      details: err.message,
      code: err.code 
    });
  }
});

app.post('/appointments', async (req, res) => {
  const { date, time, service_id, client_id, status } = req.body;
  
  try {
    // Input validation
    if (!date || !time || !service_id || !client_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate date format
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return res.status(400).json({ error: 'Invalid time format' });
    }

    // Check if service exists
    const serviceResult = await pool.query('SELECT * FROM services WHERE id = $1', [service_id]);
    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    const service = serviceResult.rows[0];

    // Check if service is active
    if (service.status !== 'active') {
      return res.status(400).json({ error: 'Selected service is not currently available' });
    }

    // Check if client exists
    const clientResult = await pool.query('SELECT * FROM clients WHERE id = $1', [client_id]);
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Check for scheduling conflicts
    const conflictCheck = await pool.query(`
      SELECT * FROM appointments 
      WHERE date = $1 
      AND status != 'cancelled'
      AND (
        (time::time <= ($2::time + ($3 || ' minutes')::interval) AND 
        (time::time + (duration || ' minutes')::interval) >= $2::time)
      )
    `, [date, time, service.duration]);

    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Time slot conflicts with existing appointment' });
    }

    // Create appointment
    const result = await pool.query(
      'INSERT INTO appointments (date, time, service_id, duration, price, client_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [date, time, service_id, service.duration, service.price, client_id, status || 'scheduled']
    );

    // Return appointment with client and service details
    const appointmentWithDetails = await pool.query(`
      SELECT a.*, c.name as client_name, s.name as service_name 
      FROM appointments a 
      JOIN clients c ON a.client_id = c.id 
      JOIN services s ON a.service_id = s.id 
      WHERE a.id = $1
    `, [result.rows[0].id]);

    res.json(appointmentWithDetails.rows[0]);
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ error: 'Failed to create appointment', details: err.message });
  }
});

// Update appointment status
app.put('/appointments/:id', async (req, res) => {
  const { id } = req.params;
  const { status, date, time, service_id, client_id } = req.body;
  
  try {
    // Validate appointment exists
    const appointmentCheck = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    if (appointmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    let updateFields = [];
    let values = [];
    let paramCount = 1;

    // Build dynamic update query
    if (status) {
      updateFields.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (date) {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      updateFields.push(`date = $${paramCount}`);
      values.push(date);
      paramCount++;
    }

    if (time) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(time)) {
        return res.status(400).json({ error: 'Invalid time format' });
      }
      updateFields.push(`time = $${paramCount}`);
      values.push(time);
      paramCount++;
    }

    if (service_id) {
      const serviceResult = await pool.query('SELECT * FROM services WHERE id = $1', [service_id]);
      if (serviceResult.rows.length === 0) {
        return res.status(404).json({ error: 'Service not found' });
      }
      const service = serviceResult.rows[0];
      if (service.status !== 'active') {
        return res.status(400).json({ error: 'Selected service is not currently available' });
      }
      updateFields.push(`service_id = $${paramCount}, duration = $${paramCount + 1}, price = $${paramCount + 2}`);
      values.push(service_id, service.duration, service.price);
      paramCount += 3;
    }

    if (client_id) {
      const clientResult = await pool.query('SELECT * FROM clients WHERE id = $1', [client_id]);
      if (clientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }
      updateFields.push(`client_id = $${paramCount}`);
      values.push(client_id);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // If updating date/time/service, check for conflicts
    if (date || time || service_id) {
      const appointment = appointmentCheck.rows[0];
      const checkDate = date || appointment.date;
      const checkTime = time || appointment.time;
      const checkServiceId = service_id || appointment.service_id;

      const serviceResult = await pool.query('SELECT duration FROM services WHERE id = $1', [checkServiceId]);
      const duration = serviceResult.rows[0].duration;

      const conflictCheck = await pool.query(`
        SELECT * FROM appointments 
        WHERE date = $1 
        AND id != $2
        AND status != 'cancelled'
        AND (
          (time::time <= ($3::time + ($4 || ' minutes')::interval) AND 
          (time::time + (duration || ' minutes')::interval) >= $3::time)
        )
      `, [checkDate, id, checkTime, duration]);

      if (conflictCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Time slot conflicts with existing appointment' });
      }
    }

    // Perform update
    values.push(id);
    const result = await pool.query(
      `UPDATE appointments SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    // Return updated appointment with client and service details
    const appointmentWithDetails = await pool.query(`
      SELECT a.*, c.name as client_name, s.name as service_name 
      FROM appointments a 
      JOIN clients c ON a.client_id = c.id 
      JOIN services s ON a.service_id = s.id 
      WHERE a.id = $1
    `, [result.rows[0].id]);

    res.json(appointmentWithDetails.rows[0]);
  } catch (err) {
    console.error('Error updating appointment:', err);
    res.status(500).json({ error: 'Failed to update appointment', details: err.message });
  }
});

// Product Routes
app.get('/products', async (req, res) => {
  try {
    console.log('Fetching products...');
    const result = await pool.query('SELECT * FROM products ORDER BY name');
    console.log(`Successfully fetched ${result.rows.length} products`);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ 
      error: 'Failed to fetch products',
      details: err.message,
      code: err.code 
    });
  }
});

app.post('/products', async (req, res) => {
  const { name, description, price, quantity, category, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO products (name, description, price, quantity, category, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, description, price, quantity, category, status]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, price, quantity, category, status } = req.body;
  
  try {
    // Validate product exists
    const productCheck = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Input validation
    if (!name || !price || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Update product
    const result = await pool.query(
      'UPDATE products SET name = $1, description = $2, price = $3, quantity = $4, category = $5, status = $6 WHERE id = $7 RETURNING *',
      [name, description, price, quantity, category, status, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ 
      error: 'Failed to update product',
      details: err.message,
      code: err.code 
    });
  }
});

app.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: err.message });
  }
}); 