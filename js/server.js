const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const https = require('https');
const fs = require('fs');
const tls = require('tls');
const selfsigned = require('selfsigned');

const app = express();
const router = express.Router();
const PORT = process.env.PORT || 3030;
const isProduction = process.env.NODE_ENV === 'production';
const HOST = process.env.HOST || '0.0.0.0';
const DOMAIN = process.env.DOMAIN || (isProduction ? 'shopy.onrender.com' : 'localhost');

// In your main server file
app.use('../Scanner/', express.static(path.join(__dirname, '../Scanner')));

let server;

if (isProduction) {
  // In production (like Render), use regular HTTP server
  server = require('http').createServer(app);
} else {
  // In development, use HTTPS with self-signed certificate
  try {
    const options = {
      cert: fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem')),
      key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem'))
    };
    server = https.createServer(options, app);
  } catch (err) {
    // Create a simple self-signed certificate in memory for development
    const attrs = [{ name: 'commonName', value: DOMAIN }];
    const pems = selfsigned.generate(attrs, { 
      keySize: 2048, 
      days: 365,
      algorithm: 'sha256',
      extensions: [{
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 2, value: '127.0.0.1' },
          { type: 2, value: DOMAIN }
        ]
      }]
    });
    server = https.createServer({
      key: pems.private,
      cert: pems.cert
    }, app);
    console.log('Using generated self-signed certificate for development');
  }
}

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});

// Apply rate limiting to all routes
app.use(limiter);

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost and local network
    if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
      return callback(null, true);
    }
    
    // Allow production domain
    if (isProduction && origin === `https://${DOMAIN}`) {
      return callback(null, true);
    }
    
    // In development, allow all origins
    if (!isProduction) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '..'))); // Serve static files from root directory

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
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

// Start server
server.listen(PORT, HOST, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
  if (!isProduction) {
    console.log(`Access the development server at: https://localhost:${PORT}`);
  } else {
    console.log(`Production server running at: https://${DOMAIN}`);
  }
});

// API Routes - No Authentication Required
app.get('/api/test', async (req, res) => {
  console.log('GET /api/test - Testing database connection');
  try {
    await pool.query('SELECT NOW()');
    console.log('Database test successful');
    res.json({ message: 'Database connection successful' });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.get('/api/services', async (req, res) => {
  console.log('GET /api/services - Fetching all services');
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY name');
    console.log(`Services fetched successfully: ${result.rows.length} services found`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Input validation middleware
const validateService = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive number'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status')
];

// Update service route with validation
app.post('/api/services', validateService, async (req, res) => {
  console.log('POST /api/services - Creating new service:', req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Service validation failed:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { name, duration, price, status } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO services (name, duration, price, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, duration, price, status || 'active']
    );
    console.log('Service created successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ 
      error: 'Failed to create service',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.put('/api/services/:id', async (req, res) => {
  const { name, duration, price, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE services SET name = $1, duration = $2, price = $3, status = $4 WHERE id = $5 RETURNING *',
      [name, duration, price, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update service' });
  }
});

app.delete('/api/services/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]);
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

app.get('/api/clients', async (req, res) => {
  console.log('GET /api/clients - Fetching all clients');
  try {
    const result = await pool.query('SELECT * FROM clients ORDER BY name');
    console.log(`Clients fetched successfully: ${result.rows.length} clients found`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

app.post('/api/clients', async (req, res) => {
  console.log('POST /api/clients - Creating new client:', req.body);
  const { name, email, phone } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO clients (name, email, phone) VALUES ($1, $2, $3) RETURNING *',
      [name, email, phone]
    );
    console.log('Client created successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const result = await pool.query(
      'UPDATE clients SET name = $1, email = $2, phone = $3 WHERE id = $4 RETURNING *',
      [name, email, phone, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update client' });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// Employee API Routes
app.get('/api/employees', async (req, res) => {
  console.log('GET /api/employees - Fetching all employees');
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY name');
    console.log(`Employees fetched successfully: ${result.rows.length} employees found`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Input validation middleware for employees
const validateEmployee = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().matches(/^\(\d{3}\) \d{3}-\d{4}$/).withMessage('Phone must be in format (555) 555-5555'),
  body('role').trim().notEmpty().withMessage('Role is required'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status')
];

app.post('/api/employees', validateEmployee, async (req, res) => {
  console.log('POST /api/employees - Creating new employee:', req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Employee validation failed:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, phone, role, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO employees (name, email, phone, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, phone, role, status || 'active']
    );
    console.log('Employee created successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ 
      error: 'Failed to create employee',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.put('/api/employees/:id', validateEmployee, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, phone, role, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE employees SET name = $1, email = $2, phone = $3, role = $4, status = $5 WHERE id = $6 RETURNING *',
      [name, email, phone, role, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

app.get('/api/appointments', async (req, res) => {
  console.log('GET /api/appointments - Fetching all appointments');
  try {
    const result = await pool.query(`
      SELECT a.*, s.name as service_name, c.name as client_name, e.name as employee_name
      FROM appointments a 
      LEFT JOIN services s ON a.service_id = s.id 
      LEFT JOIN clients c ON a.client_id = c.id 
      LEFT JOIN employees e ON a.employee_id = e.id
      ORDER BY date, time
    `);
    console.log(`Appointments fetched successfully: ${result.rows.length} appointments found`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

app.post('/api/appointments', async (req, res) => {
 
  console.log('POST /api/appointments - Creating new appointment:', req.body);
  const { date, time, service_id, duration, price, client_id, employee_id } = req.body;
  
  // Validate required fields
  if (!date || !time || !service_id || !duration || !price || !client_id || !employee_id) {
    console.error('Missing required fields:', { date, time, service_id, duration, price, client_id, employee_id });
    return res.status(400).json({ 
      error: 'Missing required fields',
      details: 'All fields are required'
    });
  }

  try {
    const result = await pool.query(
      'INSERT INTO appointments (date, time, service_id, duration, price, client_id, employee_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [date, time, service_id, duration, price, client_id, employee_id, 'scheduled']
    );
    console.log('Appointment created successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ 
      error: 'Failed to create appointment',
      details: error.message,
      code: error.code
    });
  }
});

app.put('/api/appointments/:id', async (req, res) => {
  const { date, time, service_id, duration, price, client_id, employee_id, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE appointments SET date = $1, time = $2, service_id = $3, duration = $4, price = $5, client_id = $6, employee_id = $7, status = $8 WHERE id = $9 RETURNING *',
      [date, time, service_id, duration, price, client_id, employee_id, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM appointments WHERE id = $1', [req.params.id]);
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

app.get('/api/products', async (req, res) => {
  console.log('GET /api/products - Fetching all products');
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY name');
    console.log(`Products fetched successfully: ${result.rows.length} products found`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ 
      error: 'Failed to fetch product',
      details: err.message,
      code: err.code 
    });
  }
});

app.post('/api/products', async (req, res) => {
  console.log('POST /api/products - Creating new product:', req.body);
  const { name, description, price, stock } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO products (name, description, price, stock) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, price, stock]
    );
    await client.query('COMMIT');
    console.log('Product created successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  } finally {
    client.release();
  }
});

app.put('/api/products/:id', async (req, res) => {
    const { name, description, price, stock } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            'UPDATE products SET name = $1, description = $2, price = $3, stock = $4 WHERE id = $5 RETURNING *',
            [name, description, price, stock, req.params.id]
        );

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    } finally {
        client.release();
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// Role management routes
app.get('/api/roles', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM roles ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});

app.post('/api/roles', async (req, res) => {
    const { name, description, permissions } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const roleResult = await client.query(
            'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *',
            [name, description]
        );
        const role = roleResult.rows[0];

        if (permissions && permissions.length > 0) {
            const values = permissions.map(permissionId => `(${role.id}, ${permissionId})`).join(',');
            await client.query(`
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES ${values}
            `);
        }

        await client.query('COMMIT');
        res.json(role);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating role:', error);
        res.status(500).json({ error: 'Failed to create role' });
    } finally {
        client.release();
    }
});

app.delete('/api/roles/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM roles WHERE id = $1', [req.params.id]);
        res.json({ message: 'Role deleted successfully' });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ error: 'Failed to delete role' });
    }
});

// Permission management routes
app.get('/api/permissions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM permissions ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ error: 'Failed to fetch permissions' });
    }
});
 
app.get('/api/role_permissions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM role_permissions');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching role permissions:', error);
        res.status(500).json({ error: 'Failed to fetch role permissions' });
    }
});

// User management routes
app.get('/api/users', async (req, res) => {
    console.log('Fetching users...');
    try {
        const result = await pool.query(`
            SELECT u.*, r.name as role_name 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            ORDER BY u.username
        `);
        console.log('Users fetched:', result.rows.length);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            error: 'Failed to fetch users',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.post('/api/users', async (req, res) => {
    const { username, email, password, role_id } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if username or email already exists
        const existingUser = await client.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ 
                error: 'User already exists',
                details: 'Username or email is already in use'
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user
        const result = await client.query(
            'INSERT INTO users (username, email, password, role_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [username, email, hashedPassword, role_id]
        );

        await client.query('COMMIT');
        console.log('User created:', result.rows[0].username);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating user:', error);
        res.status(500).json({ 
            error: 'Failed to create user',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        client.release();
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { username, email, password, role_id } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if user exists
        const userCheck = await client.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if new username or email is already in use by another user
        const existingUser = await client.query(
            'SELECT * FROM users WHERE (username = $1 OR email = $2) AND id != $3',
            [username, email, req.params.id]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ 
                error: 'User already exists',
                details: 'Username or email is already in use by another user'
            });
        }

        let query = 'UPDATE users SET username = $1, email = $2';
        const values = [username, email];
        let paramCount = 2;

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += `, password = $${++paramCount}`;
            values.push(hashedPassword);
        }

        if (role_id) {
            query += `, role_id = $${++paramCount}`;
            values.push(role_id);
        }

        query += ` WHERE id = $${++paramCount} RETURNING *`;
        values.push(req.params.id);

        const result = await client.query(query, values);

        await client.query('COMMIT');
        console.log('User updated:', result.rows[0].username);
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating user:', error);
        res.status(500).json({ 
            error: 'Failed to update user',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        client.release();
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // First check if the user exists
        const userCheck = await client.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent deletion of the last admin user
        const adminCount = await client.query(
            'SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = $1',
            ['admin']
        );

        if (adminCount.rows[0].count === '1' && userCheck.rows[0].role_id === 
            (await client.query('SELECT id FROM roles WHERE name = $1', ['admin'])).rows[0].id) {
            return res.status(400).json({ 
                error: 'Cannot delete user',
                details: 'Cannot delete the last admin user'
            });
        }

        // Delete the user
        await client.query('DELETE FROM users WHERE id = $1', [req.params.id]);

        await client.query('COMMIT');
        console.log('User deleted:', req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            error: 'Failed to delete user',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        client.release();
    }
});

// User permissions endpoints
app.get('/api/users/:id/permissions', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.* FROM permissions p
            LEFT JOIN user_permissions up ON p.id = up.permission_id
            LEFT JOIN role_permissions rp ON p.id = rp.permission_id
            LEFT JOIN users u ON u.id = up.user_id OR u.role_id = rp.role_id
            WHERE u.id = $1
            GROUP BY p.id
        `, [req.params.id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({ 
            error: 'Failed to fetch user permissions',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.get('/api/user_permissions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM user_permissions');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({ 
            error: 'Failed to fetch user permissions',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
 
// Mount router
app.use('/api', router);

// HR Module API Routes
app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY last_name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

app.get('/api/payroll', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, e.first_name, e.last_name, e.email, e.hire_date, e.salary 
      FROM payroll p 
      JOIN employees e ON p.employee_id = e.employee_id 
      ORDER BY p.pay_date DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payroll:', error);
    res.status(500).json({ error: 'Failed to fetch payroll data' });
  }
});

app.post('/api/payroll', async (req, res) => {
  const { employee_id, pay_date, gross_salary, deductions, net_salary } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO payroll (employee_id, pay_date, gross_salary, deductions, net_salary) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [employee_id, pay_date, gross_salary, deductions, net_salary]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating payroll record:', error);
    res.status(500).json({ error: 'Failed to create payroll record' });
  }
});

// Project Management API Routes
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY start_date DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, p.name as project_name, e.first_name, e.last_name 
      FROM tasks t 
      LEFT JOIN projects p ON t.project_id = p.project_id 
      LEFT JOIN employees e ON t.assigned_to = e.employee_id 
      ORDER BY t.due_date
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/tasks', async (req, res) => {
  const { project_id, title, description, assigned_to, due_date, priority, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO tasks (project_id, title, description, assigned_to, due_date, priority, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [project_id, title, description, assigned_to, due_date, priority, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { status, progress } = req.body;
  try {
    const result = await pool.query(
      'UPDATE tasks SET status = $1, progress = $2, updated_at = NOW() WHERE task_id = $3 RETURNING *',
      [status, progress, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Team Collaboration API Routes
app.get('/api/boards', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM boards ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

app.get('/api/boards/:id/notes', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT n.*, e.first_name, e.last_name 
      FROM notes n 
      LEFT JOIN employees e ON n.created_by = e.employee_id 
      WHERE n.board_id = $1 
      ORDER BY n.created_at DESC
    `, [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.post('/api/boards/:id/notes', async (req, res) => {
  const { id } = req.params;
  const { content, created_by, color } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO notes (board_id, content, created_by, color) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, content, created_by, color]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});
 

