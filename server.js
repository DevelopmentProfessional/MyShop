const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const app = express();
const router = express.Router();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
        employee_id INTEGER REFERENCES users(id),
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

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        dark_mode BOOLEAN DEFAULT FALSE
      )
    `);

    // Create sessions table for managing user sessions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default admin user if not exists
    const hashedPassword = await bcrypt.hash('pinto', 10);
    await pool.query(`
      INSERT INTO users (username, password, email, role)
      VALUES ('pinto', $1, 'pinto@shopy.com', 'admin')
      ON CONFLICT (username) DO NOTHING
    `, [hashedPassword]);

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

    // Create users table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'user',
            phone VARCHAR(20),
            theme_color VARCHAR(20) DEFAULT '#0d6efd',
            dark_mode BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create roles table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS roles (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create permissions table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS permissions (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create role_permissions table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS role_permissions (
            role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
            permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
            PRIMARY KEY (role_id, permission_id)
        )
    `);

    // Create user_permissions table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_permissions (
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, permission_id)
        )
    `);

    // Insert default permissions if they don't exist
    await pool.query(`
        INSERT INTO permissions (name, description) VALUES
        ('view_admin', 'View admin page'),
        ('view_services', 'View services page'),
        ('edit_services', 'Edit services'),
        ('view_clients', 'View clients page'),
        ('edit_clients', 'Edit clients'),
        ('view_products', 'View products page'),
        ('edit_products', 'Edit products'),
        ('view_appointments', 'View appointments'),
        ('edit_appointments', 'Edit appointments')
        ON CONFLICT (name) DO NOTHING
    `);

    // Insert default roles if they don't exist
    await pool.query(`
        INSERT INTO roles (name, description) VALUES
        ('admin', 'Full access to all features'),
        ('staff', 'Access to services, clients, and appointments'),
        ('user', 'Basic access to view appointments')
        ON CONFLICT (name) DO NOTHING
    `);

    // Assign permissions to admin role
    await pool.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        CROSS JOIN permissions p
        WHERE r.name = 'admin'
        ON CONFLICT (role_id, permission_id) DO NOTHING
    `);

    // Assign permissions to staff role
    await pool.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        CROSS JOIN permissions p
        WHERE r.name = 'staff'
        AND p.name IN ('view_services', 'edit_services', 'view_clients', 'edit_clients', 'view_appointments', 'edit_appointments')
        ON CONFLICT (role_id, permission_id) DO NOTHING
    `);

    // Assign permissions to user role
    await pool.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        CROSS JOIN permissions p
        WHERE r.name = 'user'
        AND p.name IN ('view_appointments')
        ON CONFLICT (role_id, permission_id) DO NOTHING
    `);

    console.log('Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
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

// API Routes - No Authentication Required
app.get('/api/test', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ message: 'Database connection successful' });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

app.post('/api/services', async (req, res) => {
  const { name, duration, price, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO services (name, duration, price, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, duration, price, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create service' });
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
  try {
    const result = await pool.query('SELECT * FROM clients ORDER BY name');
    res.json(result.rows);
  } catch (error) {
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
  try {
    const result = await pool.query(`
      SELECT a.*, s.name as service_name, c.name as client_name 
      FROM appointments a 
      LEFT JOIN services s ON a.service_id = s.id 
      LEFT JOIN clients c ON a.client_id = c.id 
      ORDER BY date, time
    `);
    res.json(result.rows);
  } catch (error) {
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

// Update routes to remove authentication
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY name');
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
        res.status(500).json({ error: 'Failed to fetch user permissions' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { username, email, password, role_id, permissions } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Update user
        let query = 'UPDATE users SET username = $1, email = $2';
        const values = [username, email];
        let paramCount = 2;

        if (password) {
            query += `, password = $${++paramCount}`;
            values.push(await bcrypt.hash(password, 10));
        }

        if (role_id) {
            query += `, role_id = $${++paramCount}`;
            values.push(role_id);
        }

        query += ` WHERE id = $${++paramCount} RETURNING *`;
        values.push(req.params.id);

        const result = await client.query(query, values);
        const user = result.rows[0];

        // Update user permissions
        if (permissions) {
            await client.query('DELETE FROM user_permissions WHERE user_id = $1', [user.id]);
            if (permissions.length > 0) {
                const values = permissions.map(permissionId => `(${user.id}, ${permissionId})`).join(',');
                await client.query(`
                    INSERT INTO user_permissions (user_id, permission_id)
                    VALUES ${values}
                `);
            }
        }

        await client.query('COMMIT');
        res.json(user);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    } finally {
        client.release();
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

app.get('/api/user_permissions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM user_permissions');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({ error: 'Failed to fetch user permissions' });
    }
}); 