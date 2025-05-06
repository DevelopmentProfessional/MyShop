const express = require('express');
//const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

const app = express();
const router = express.Router();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});

// Apply rate limiting to all routes
app.use(limiter);
// // Middleware
// app.use(cors({
//   origin: process.env.NODE_ENV === 'production' 
//     ? ['https://myshop-5hec.onrender.com'] 
//     : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true,
//   maxAge: 86400
// }));

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
 

// Start server only after database is initialized
testConnection().then(success => {
  if (success) {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } else {
    console.error('Server failed to start due to database initialization failure');
    process.exit(1);
  }
});

// API Routes - No Authentication Required
app.get('/api/test', async (req, res) => {
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
  console.log('Fetching services...');
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY name');
    console.log('Services fetched:', result.rows.length);
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const { name, duration, price, status } = req.body;
    
    try {
        const result = await pool.query(
            'INSERT INTO services (name, duration, price, status) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, duration, price, status || 'active']
        );
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
  console.log('Fetching clients...');
  try {
    const result = await pool.query('SELECT * FROM clients ORDER BY name');
    console.log('Clients fetched:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

app.post('/api/clients', async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO clients (name, email, phone) VALUES ($1, $2, $3) RETURNING *',
      [name, email, phone]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
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

app.get('/api/appointments', async (req, res) => {
  console.log('Fetching appointments...');
  try {
    const result = await pool.query(`
      SELECT *
      FROM appointments a 
      LEFT JOIN services s ON a.service_id = s.id 
      LEFT JOIN clients c ON a.client_id = c.id 
      ORDER BY date, time
    `);
    console.log('Appointments fetched:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

app.post('/api/appointments', async (req, res) => {
  const { date, time, service_id, duration, price, client_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO appointments (date, time, service_id, duration, price, client_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [date, time, service_id, duration, price, client_id, 'scheduled']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

app.put('/api/appointments/:id', async (req, res) => {
  const { date, time, service_id, duration, price, client_id, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE appointments SET date = $1, time = $2, service_id = $3, duration = $4, price = $5, client_id = $6, status = $7 WHERE id = $8 RETURNING *',
      [date, time, service_id, duration, price, client_id, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
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
    console.log('Fetching products...');
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY name');
        console.log('Products fetched:', result.rows.length); 
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
    const { name, description, price, stock } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            'INSERT INTO products (name, description, price, stock) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description, price, stock]
        );

        await client.query('COMMIT');
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

// Mount router
app.use('/api', router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
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
 
 