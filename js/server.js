require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');  // Add back path for serving static files
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const https = require('https');
const tls = require('tls');
const selfsigned = require('selfsigned');
const os = require('os');
const fs = require('fs');
const http = require('http');
const { sendEmail } = require('./email'); // Import the sendEmail function
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const multer = require('multer');
const helmet = require('helmet');

// Import shift scheduling API
const shiftSchedulingRouter = require('./shift-scheduling-api');

const app = express();

const PORT = process.env.PORT || 3030;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Better environment detection
const isOnRender = process.env.RENDER || process.env.RENDER_EXTERNAL_URL || process.env.RENDER_INTERNAL_URL;
const isProduction = process.env.NODE_ENV === 'production';
const isLocalDevelopment = !isOnRender;

// Get local IP address for development
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return '192.168.4.106'; // fallback
};

const HOST = '0.0.0.0'; // Listen on all interfaces
const DISPLAY_HOST = isOnRender ? (process.env.DOMAIN || 'myshop-5hec.onrender.com') : getLocalIP();
const DOMAIN = process.env.DOMAIN || (isOnRender ? 'shopy.onrender.com' : 'localhost');
const dbUrl = process.env.DATABASE_URL;
let pool;

console.log('=== Environment Debug Info ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('isOnRender:', isOnRender);
console.log('isProduction:', isProduction);
console.log('isLocalDevelopment:', isLocalDevelopment);
console.log('DATABASE_URL set:', !!dbUrl);
console.log('==============================');

if (dbUrl) {
    // Use remote database with SSL
    console.log('Using remote database with SSL');
    pool = new Pool({
        connectionString: dbUrl,
        ssl: {
            rejectUnauthorized: false,
            require: true
        },
        statement_timeout: 30000, // 30 seconds
        query_timeout: 30000
    });
} else {
    // Use local database without SSL
    console.log('Using local database without SSL');
    const localConfig = {
        host: 'localhost',
        user: 'postgres',
        database: 'shopy_db',
        port: 5432,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        password: process.env.DB_PASSWORD || '' // Always provide a password string
    };
    
    console.log('Local database config:', { ...localConfig, password: localConfig.password ? '[SET]' : '[EMPTY]' });
    console.log('Password type:', typeof localConfig.password);
    console.log('Password value:', localConfig.password === '' ? 'empty string' : localConfig.password);
    
    pool = new Pool(localConfig);
}

// Test the database connection immediately
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection test failed:', err);
    } else {
        console.log('Database connection test successful:', res.rows[0]);
    }
});

// Set the pool for the shift scheduling API
shiftSchedulingRouter.setPool(pool);

// Mount shift scheduling API routes FIRST (before static file serving)
app.use('/api', shiftSchedulingRouter.router);

// Middleware
app.use(express.json({ 
  limit: '922kb',
  verify: (req, res, buf) => {
    if (buf.length > 922 * 1024) {
      throw new Error('Request entity too large');
    }
  }
}));
app.use(cors());

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request entity too large',
      details: 'Maximum size is 922KB'
    });
  }
  next(err);
});

// Middleware to redirect HTTP to HTTPS in production (Render)
app.use((req, res, next) => {
  if (isOnRender && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});

// Serve static files and index for all directories
app.use(['/', '/index'],                              express.static(path.join(__dirname, '..')));                    app.get(['/', '/index'], (req, res) => { res.sendFile(path.join(__dirname, '..', 'index.html')); });
app.use(['/assets', '/Assets'],                       express.static(path.join(__dirname, '..', 'Assets')));          app.get(['/assets', '/Assets'], (req, res) => { res.sendFile(path.join(__dirname, '..', 'Assets', 'index.html')); });
app.use(['/booking', '/Booking'],                     express.static(path.join(__dirname, '..', 'booking')));         app.get(['/booking', '/Booking'], (req, res) => { res.sendFile(path.join(__dirname, '..', 'booking', 'index.html')); });
app.use(['/expenses', '/Expenses'],                   express.static(path.join(__dirname, '..', 'Expenses')));        app.get(['/expenses', '/Expenses'], (req, res) => { res.sendFile(path.join(__dirname, '..', 'Expenses', 'index.html')); });
app.use(['/hr', '/humanresources', '/HumanResources'],express.static(path.join(__dirname, '..', 'HumanResources')));  app.get(['/hr', '/humanresources', '/HumanResources'], (req, res) => { res.sendFile(path.join(__dirname, '..', 'HumanResources', 'index.html')); });
app.use(['/it', '/IT'],                               express.static(path.join(__dirname, '..', 'IT')));              app.get(['/it', '/IT'], (req, res) => { res.sendFile(path.join(__dirname, '..', 'IT', 'index.html')); });
app.use(['/inventory', '/Inventory'],                 express.static(path.join(__dirname, '..', 'Inventory')));       app.get(['/inventory', '/Inventory'], (req, res) => { res.sendFile(path.join(__dirname, '..', 'Inventory', 'index.html')); });
app.use(['/reports', '/Reports'],                     express.static(path.join(__dirname, '..', 'Reports')));         app.get(['/reports', '/Reports'], (req, res) => { res.sendFile(path.join(__dirname, '..', 'Reports', 'index.html')); });
app.use(['/payments', '/Payments'],                   express.static(path.join(__dirname, '..', 'Payments')));        app.get(['/payments', '/Payments'], (req, res) => { res.sendFile(path.join(__dirname, '..', 'Payments', 'index.html')); });
app.use(['/products', '/Products'],                   express.static(path.join(__dirname, '..', 'Products')));        app.get(['/products', '/Products'], (req, res) => { res.sendFile(path.join(__dirname, '..', 'Products', 'index.html')); });
app.use(['/profile', '/Profile'],                     express.static(path.join(__dirname, '..', 'Profile')));         app.get(['/profile', '/Profile'], (req, res) => { res.sendFile(path.join(__dirname, '..', 'Profile', 'index.html')); });
app.use(['/projects', '/Projects'],                   express.static(path.join(__dirname, '..', 'Projects')));        app.get(['/projects', '/Projects'], (req, res) => { res.sendFile(path.join(__dirname, '..', 'Projects', 'index.html')); });

function handleError(res, error, message, details = false) {
    console.error('Backend error:', error); // Log the real error for debugging
    const response = {
        error: message,
        ...(details && { details: error.message })
    };
    res.status(500).json(response);
}

const validateService = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive number'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status')
];
const validateEmployee = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().matches(/^\(\d{3}\) \d{3}-\d{4}$/).withMessage('Phone must be in format (555) 555-5555'),
  body('role').trim().notEmpty().withMessage('Role is required'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status')
];

app.get('/api/test', async (req, res) =>  {try{ 
  await pool.query('SELECT NOW()'); res.json({ message: 'Database connection successful' }); } 
catch (error) {handleError(res, error, 'Database connection failed', true);}
});

app.get('/api/test/contracts', async (req, res) => {
    try {
        // Test if contracts table exists and has data
        const result = await pool.query(`
            SELECT 
                table_name,
                column_name,
                data_type
            FROM information_schema.columns 
            WHERE table_name = 'contracts'
            ORDER BY ordinal_position
        `);
        
        const contractsCount = await pool.query('SELECT COUNT(*) as count FROM contracts');
        
        res.json({ 
            message: 'Contracts table check successful',
            columns: result.rows,
            contractsCount: contractsCount.rows[0].count
        });
    } catch (error) {
        handleError(res, error, 'Contracts table check failed', true);
    }
});

app.get('/api/services', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM services ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});
app.get('/api/photos_products', async (req, res) => {
    try { 
        const result = await pool.query('SELECT * FROM photos_products'); 
        res.json(result.rows); 
    } 
    catch (error) { 
        handleError(res, error, 'Failed to fetch photos', true); 
    }
});
app.get('/api/photos_products/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const result = await pool.query('SELECT * FROM photos_products WHERE product_id = $1', [productId]);
        res.json(result.rows);
    }
    catch (error) {
        handleError(res, error, 'Failed to fetch product photos', true);
    }
});
app.post('/api/uploadproductphotos', async (req, res) => {
  try{ 
    const { photos } = req.body;
    console.log('[UPLOAD PHOTOS] Incoming payload:', JSON.stringify(photos, null, 2));
    // Validate total payload size
    const totalSize = JSON.stringify(photos).length;
    if (totalSize > 922 * 1024) {
      return res.status(413).json({ 
        success: false, 
        error: 'Total payload size exceeds limit of 922KB',
        details: `Current size: ${Math.round(totalSize / 1024)}KB`
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const photo of photos) {
        console.log('[UPLOAD PHOTOS] Inserting photo:', photo);
        const result = await client.query(
          'INSERT INTO photos_products (product_id, url, filename) VALUES ($1, $2, $3) RETURNING *',
          [photo.product_id, photo.url, photo.filename]
        );
        results.push(result.rows[0]);
      }
      await client.query('COMMIT');
      res.status(201).json({ success: true, photos: results });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[UPLOAD PHOTOS] Error uploading photos:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to upload photos',
        details: error.message
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[UPLOAD PHOTOS] Error in upload endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      details: error.message
    });
  }
});
app.post('/api/services', async (req, res) => {
    try {
        const result = await pool.query('INSERT INTO services (name, description, category, price, duration, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [req.body.name, req.body.description, req.body.category, req.body.price, req.body.duration, req.body.status]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Check console', true);
    }
});
app.put('/api/services/:id', async (req, res) => {
    try {
        const result = await pool.query('UPDATE services SET name = $1, description = $2, category = $3, price = $4, duration = $5, status = $6 WHERE id = $7 RETURNING *', [req.body.name, req.body.description, req.body.category, req.body.price, req.body.duration, req.body.status, req.params.id]);
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});
app.delete('/api/services/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]);
        res.json({ message: 'Service deleted successfully' });
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.get('/api/clients', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clients ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.post('/api/clients', async (req, res) => {
    try {
        const result = await pool.query('INSERT INTO clients (name, email, phone) VALUES ($1, $2, $3) RETURNING *', [req.body.name, req.body.email, req.body.phone]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.put('/api/clients/:id', async (req, res) => {
    try {
        const result = await pool.query('UPDATE clients SET name = $1, email = $2, phone = $3 WHERE id = $4 RETURNING *', [req.body.name, req.body.email, req.body.phone, req.params.id]);
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.delete('/api/clients/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
        res.json({ message: 'Client deleted successfully' });
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.get('/api/employees', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM employees ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

app.post('/api/employees', async (req, res) => {
    try {
        const { name, email, phone, role, status, supervisor_id, department } = req.body;
        const result = await pool.query(
            'INSERT INTO employees (name, email, phone, role, status, supervisor_id, department) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [name, email, phone, role, status || 'active', supervisor_id || null, department || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.put('/api/employees/:id', async (req, res) => {
    try {
        const { name, email, phone, role, status, supervisor_id, department } = req.body;
        const result = await pool.query(
            'UPDATE employees SET name = $1, email = $2, phone = $3, role = $4, status = $5, supervisor_id = $6, department = $7 WHERE id = $8 RETURNING *',
            [name, email, phone, role, status, supervisor_id || null, department || null, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.delete('/api/employees/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.get('/api/appointments', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                a.*,
                s.name as service_name,
                c.name as client_name,
                c.email as client_email,
                e.name as employee_name
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            LEFT JOIN clients c ON a.client_id = c.id
            LEFT JOIN employees e ON a.employee_id = e.id
            ORDER BY a.date, a.time
        `);
        
        // Transform the result to match the expected format
        const appointments = result.rows.map(row => ({
            ...row,
            service: { name: row.service_name || 'Unknown Service' },
            client: { name: row.client_name || 'Unknown Client', email: row.client_email || '' },
            employee: { name: row.employee_name || 'Unknown Employee', username: row.employee_name || 'unknown' }
        }));
        
        res.json(appointments);
    } catch (error) {
        console.error('Appointments endpoint error:', error);
        handleError(res, error, 'Failed to fetch appointments', true);
    }
});

app.post('/api/appointments', async (req, res) => {
    try {
        const { service_id, client_id, employee_id, date, time, duration, price, status } = req.body;
        const result = await pool.query(
            'INSERT INTO appointments (service_id, client_id, employee_id, date, time, duration, price, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [service_id, client_id, employee_id, date, time, duration, price, status]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.put('/api/appointments/:id', async (req, res) => {
    try {
        const { service_id, client_id, employee_id, date, time, duration, price, status } = req.body;
        const result = await pool.query(
            'UPDATE appointments SET service_id = $1, client_id = $2, employee_id = $3, date = $4, time = $5, duration = $6, price = $7, status = $8 WHERE id = $9 RETURNING *',
            [service_id, client_id, employee_id, date, time, duration, price, status, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.delete('/api/appointments/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM appointments WHERE id = $1', [req.params.id]);
        res.json({ message: 'Appointment deleted successfully' });
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, description, price, quantity, category, status, barcode FROM products ORDER BY name');
    console.log('Products API response:', JSON.stringify(result.rows, null, 2));
    res.json(result.rows);
  } catch (error) {
    console.error(error); // Make sure to log the full error
    handleError(res, error, 'Check console', true);
  }
});

// Debug endpoint to check table structure
app.get('/api/debug/products-table', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      ORDER BY ordinal_position
    `);
    console.log('Products table structure:', JSON.stringify(result.rows, null, 2));
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting table structure:', error);
    handleError(res, error, 'Check console', true);
  }
});

// Debug endpoint to see actual product data
app.get('/api/debug/products-data', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products LIMIT 5');
    console.log('Raw products data:', JSON.stringify(result.rows, null, 2));
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting products data:', error);
    handleError(res, error, 'Check console', true);
  }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { name, description, price, quantity, category, status } = req.body;
        const result = await pool.query(
            'INSERT INTO products (name, description, price, quantity, category, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, description, price, quantity, category, status]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const result = await pool.query('UPDATE products SET name = $1, description = $2, price = $3, quantity = $4, category = $5, status = $6, barcode = $7 WHERE id = $8 RETURNING *', [req.body.name, req.body.description, req.body.price, req.body.quantity, req.body.category, req.body.status, req.body.barcode, req.params.id]);
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.put('/api/productbarcode/:id', async (req, res) => {
    try {
        const { barcode } = req.body;
        if (!barcode) {
            return res.status(400).json({ error: 'Barcode is required' });
        }

        const result = await pool.query(
            'UPDATE products SET barcode = $1 WHERE id = $2 RETURNING id, barcode',
            [barcode, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to update barcode');
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.get('/api/roles', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM roles ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.post('/api/roles', async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        const client = await pool.connect();
        await client.query('BEGIN');
        const roleResult = await client.query('INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *', [name, description]);
        const role = roleResult.rows[0];
        if (permissions && permissions.length > 0) {
            const values = permissions.map(permissionId => `(${role.id}, ${permissionId})`).join(',');
            await client.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`);
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
        handleError(res, error, 'Check console');
    }
});

app.get('/api/permissions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM permissions ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.get('/api/role-permissions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM role_permissions');
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY username');
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { username, email, password, role_id } = req.body;
        const client = await pool.connect();
        await client.query('BEGIN');
        const existingUser = await client.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists', details: 'Username or email is already in use' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await client.query('INSERT INTO users (username, email, password, role_id) VALUES ($1, $2, $3, $4) RETURNING *', [username, email, hashedPassword, role_id]);
        await client.query('COMMIT');
        console.log('User created:', result.rows[0].username);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
        client.release();
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { username, email, password, role_id } = req.body;
        const client = await pool.connect();
        await client.query('BEGIN');
        const userCheck = await client.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const existingUser = await client.query('SELECT * FROM users WHERE (username = $1 OR email = $2) AND id != $3', [username, email, req.params.id]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists', details: 'Username or email is already in use by another user' });
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
        res.status(500).json({ error: 'Failed to update user', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
        client.release();
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const client = await pool.connect();
        await client.query('BEGIN');
        const userCheck = await client.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const adminCount = await client.query('SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = $1', ['admin']);
        if (adminCount.rows[0].count === '1' && userCheck.rows[0].role_id === (await client.query('SELECT id FROM roles WHERE name = $1', ['admin'])).rows[0].id) {
            return res.status(400).json({ error: 'Cannot delete user', details: 'Cannot delete the last admin user' });
        }
        await client.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        await client.query('COMMIT');
        console.log('User deleted:', req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
        client.release();
    }
});

app.get('/api/users/:id/permissions', async (req, res) => {
    try {
        const result = await pool.query(`SELECT p.* FROM permissions p LEFT JOIN user_permissions up ON p.id = up.permission_id LEFT JOIN role_permissions rp ON p.id = rp.permission_id LEFT JOIN users u ON u.id = up.user_id OR u.role_id = rp.role_id WHERE u.id = $1 GROUP BY p.id`, [req.params.id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user permissions:', error);
    }
});

app.get('/api/user_permissions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM user_permissions');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({ error: 'Failed to fetch user permissions', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
});

app.get('/api/employees', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM employees ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

app.get('/api/payroll', async (req, res) => {
    try {
        const result = await pool.query(`SELECT p.*, e.first_name, e.last_name, e.email, e.hire_date, e.salary FROM payroll p JOIN employees e ON p.employee_id = e.employee_id ORDER BY p.pay_date DESC`);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching payroll:', error);
    }
});

app.post('/api/payroll', async (req, res) => {
    try {
        const { employee_id, pay_date, gross_salary, deductions, net_salary } = req.body;
        const result = await pool.query('INSERT INTO payroll (employee_id, pay_date, gross_salary, deductions, net_salary) VALUES ($1, $2, $3, $4, $5) RETURNING *', [employee_id, pay_date, gross_salary, deductions, net_salary]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating payroll record:', error);
    }
});

app.get('/api/projects', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Failed to fetch projects');
    }
});

app.get('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM projects WHERE project_id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to fetch project');
    }
});

app.post('/api/projects', async (req, res) => {
    try {
        const { name, description, is_template, roi, swot, review_status, created_by } = req.body;
        const result = await pool.query(
            `INSERT INTO projects (name, description, is_template, roi, swot, review_status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [name, description, is_template || false, roi, swot, review_status || 'pending', created_by]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to create project');
    }
});

app.put('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, is_template, roi, swot, review_status, created_by } = req.body;
        const result = await pool.query(
            `UPDATE projects SET name=$1, description=$2, is_template=$3, roi=$4, swot=$5, review_status=$6, created_by=$7 WHERE project_id=$8 RETURNING *`,
            [name, description, is_template, roi, swot, review_status, created_by, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to update project');
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM projects WHERE project_id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
        res.json({ success: true });
    } catch (error) {
        handleError(res, error, 'Failed to delete project');
    }
});

app.get('/api/tasks', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                a.*,
                s.name as service_name,
                c.name as client_name,
                c.email as client_email,
                e.name as employee_name
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            LEFT JOIN clients c ON a.client_id = c.id
            LEFT JOIN employees e ON a.employee_id = e.id
            ORDER BY a.date, a.time
        `);
        
        // Transform the result to match the expected format
        const appointments = result.rows.map(row => ({
            ...row,
            service: { name: row.service_name || 'Unknown Service' },
            client: { name: row.client_name || 'Unknown Client', email: row.client_email || '' },
            employee: { name: row.employee_name || 'Unknown Employee', username: row.employee_name || 'unknown' }
        }));
        
        res.json(appointments);
    } catch (error) {
        console.error('Appointments endpoint error:', error);
        handleError(res, error, 'Failed to fetch appointments', true);
    }
});

app.post('/api/appointments', async (req, res) => {
    try {
        const { service_id, client_id, employee_id, date, time, duration, price, status } = req.body;
        const result = await pool.query(
            'INSERT INTO appointments (service_id, client_id, employee_id, date, time, duration, price, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [service_id, client_id, employee_id, date, time, duration, price, status]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.put('/api/appointments/:id', async (req, res) => {
    try {
        const { service_id, client_id, employee_id, date, time, duration, price, status } = req.body;
        const result = await pool.query(
            'UPDATE appointments SET service_id = $1, client_id = $2, employee_id = $3, date = $4, time = $5, duration = $6, price = $7, status = $8 WHERE id = $9 RETURNING *',
            [service_id, client_id, employee_id, date, time, duration, price, status, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

app.delete('/api/appointments/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM appointments WHERE id = $1', [req.params.id]);
        res.json({ message: 'Appointment deleted successfully' });
    } catch (error) {
        handleError(res, error, 'Check console');
    }
});

// --- Task Comments ---
// Get all comments for a task
app.get('/api/tasks/:taskId/comments', async (req, res) => {
    try {
        const { taskId } = req.params;
        const result = await pool.query(
            `SELECT tc.*, e.name AS author_name FROM task_comments tc
             LEFT JOIN employees e ON tc.author_id = e.id
             WHERE tc.task_id = $1 ORDER BY tc.created_at`, [taskId]);
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Failed to fetch comments');
    }
});

// Add a comment to a task
app.post('/api/tasks/:taskId/comments', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { author_id, comment } = req.body;
        const result = await pool.query(
            'INSERT INTO task_comments (task_id, author_id, comment) VALUES ($1, $2, $3) RETURNING *',
            [taskId, author_id, comment]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to add comment');
    }
});

// --- Resources CRUD ---
app.get('/api/resources', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM resources ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Failed to fetch resources');
    }
});

app.post('/api/resources', async (req, res) => {
    try {
        const { name, type, description } = req.body;
        const result = await pool.query(
            'INSERT INTO resources (name, type, description) VALUES ($1, $2, $3) RETURNING *',
            [name, type, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to create resource');
    }
});

app.put('/api/resources/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, description } = req.body;
        const result = await pool.query(
            'UPDATE resources SET name=$1, type=$2, description=$3 WHERE resource_id=$4 RETURNING *',
            [name, type, description, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Resource not found' });
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to update resource');
    }
});

app.delete('/api/resources/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM resources WHERE resource_id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Resource not found' });
        res.json({ success: true });
    } catch (error) {
        handleError(res, error, 'Failed to delete resource');
    }
});

// --- Project-Team Assignment ---
// Get all teams assigned to a project (with members)
app.get('/api/projects/:projectId/teams', async (req, res) => {
    try {
        const { projectId } = req.params;
        const teamsResult = await pool.query(
            `SELECT t.* FROM project_teams pt JOIN teams t ON pt.team_id = t.team_id WHERE pt.project_id = $1`,
            [projectId]
        );
        // For each team, fetch members
        const teams = await Promise.all(teamsResult.rows.map(async team => {
            const membersResult = await pool.query(
                `SELECT e.id, e.name, e.email, e.role, e.status FROM team_members tm JOIN employees e ON tm.employee_id = e.id WHERE tm.team_id = $1`,
                [team.team_id]
            );
            return { ...team, members: membersResult.rows };
        }));
        res.json(teams);
    } catch (error) {
        handleError(res, error, 'Failed to fetch project teams');
    }
});
// Assign a team to a project
app.post('/api/projects/:projectId/teams', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { team_id } = req.body;
        await pool.query('INSERT INTO project_teams (project_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [projectId, team_id]);
        res.json({ success: true });
    } catch (error) {
        handleError(res, error, 'Failed to assign team to project');
    }
});
// Remove a team from a project
app.delete('/api/projects/:projectId/teams/:teamId', async (req, res) => {
    try {
        const { projectId, teamId } = req.params;
        const result = await pool.query('DELETE FROM project_teams WHERE project_id = $1 AND team_id = $2 RETURNING *', [projectId, teamId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Team not assigned to project' });
        res.json({ success: true });
    } catch (error) {
        handleError(res, error, 'Failed to remove team from project');
    }
});

// --- Project Review Comments ---
// Get all comments for a project
app.get('/api/projects/:projectId/comments', async (req, res) => {
    try {
        const { projectId } = req.params;
        const result = await pool.query(
            `SELECT pc.*, e.name AS author_name FROM project_comments pc
             LEFT JOIN employees e ON pc.author_id = e.id
             WHERE pc.project_id = $1 ORDER BY pc.created_at`, [projectId]);
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Failed to fetch project comments');
    }
});
// Add a comment to a project
app.post('/api/projects/:projectId/comments', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { author_id, comment } = req.body;
        const result = await pool.query(
            'INSERT INTO project_comments (project_id, author_id, comment) VALUES ($1, $2, $3) RETURNING *',
            [projectId, author_id, comment]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to add project comment');
    }
});

// Teams API
// Get all teams
app.get('/api/teams', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM teams ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Failed to fetch teams');
    }
});

// Get a single team by ID
app.get('/api/teams/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM teams WHERE team_id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Team not found' });
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to fetch team');
    }
});

// Create a new team
app.post('/api/teams', async (req, res) => {
    try {
        const { name, description } = req.body;
        const result = await pool.query(
            'INSERT INTO teams (name, description) VALUES ($1, $2) RETURNING *',
            [name, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to create team');
    }
});

// Update a team
app.put('/api/teams/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const result = await pool.query(
            'UPDATE teams SET name = $1, description = $2 WHERE team_id = $3 RETURNING *',
            [name, description, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Team not found' });
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to update team');
    }
});

// Delete a team
app.delete('/api/teams/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM teams WHERE team_id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Team not found' });
        res.json({ success: true });
    } catch (error) {
        handleError(res, error, 'Failed to delete team');
    }
});

// Get all members of a team
app.get('/api/teams/:id/members', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT e.* FROM team_members tm
             JOIN employees e ON tm.employee_id = e.id
             WHERE tm.team_id = $1`, [id]);
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Failed to fetch team members');
    }
});

// Add a member to a team
app.post('/api/teams/:id/members', async (req, res) => {
    try {
        const { id } = req.params;
        const { employee_id } = req.body;
        await pool.query(
            'INSERT INTO team_members (team_id, employee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [id, employee_id]
        );
        res.json({ success: true });
    } catch (error) {
        handleError(res, error, 'Failed to add member to team');
    }
});

// Remove a member from a team
app.delete('/api/teams/:id/members/:employee_id', async (req, res) => {
    try {
        const { id, employee_id } = req.params;
        const result = await pool.query(
            'DELETE FROM team_members WHERE team_id = $1 AND employee_id = $2 RETURNING *',
            [id, employee_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Member not found in team' });
        res.json({ success: true });
    } catch (error) {
        handleError(res, error, 'Failed to remove member from team');
    }
});

// Get all tasks for a specific project
app.get('/api/projects/:id/tasks', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at', [id]);
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Failed to fetch tasks for project');
    }
});

// Get all resources assigned to a specific task
app.get('/api/tasks/:taskId/resources', async (req, res) => {
    try {
        const { taskId } = req.params;
        const result = await pool.query(
            `SELECT r.* FROM task_resources tr
             JOIN resources r ON tr.resource_id = r.resource_id
             WHERE tr.task_id = $1`, [taskId]);
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Failed to fetch resources for task');
    }
});

// Facilities endpoints
app.get('/api/facilities', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM facilities ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching facilities:', err);
        res.status(500).json({ error: 'Failed to fetch facilities' });
    }
});

app.get('/api/facilities/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM facilities WHERE facility_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Facility not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching facility:', err);
        res.status(500).json({ error: 'Failed to fetch facility' });
    }
});

// Project resources endpoints
app.get('/api/project-resources', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM project_resources ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching project resources:', err);
        res.status(500).json({ error: 'Failed to fetch project resources' });
    }
});

// Enhanced project resource assignments
app.get('/api/projects/:projectId/resource-assignments', async (req, res) => {
    try {
        const { projectId } = req.params;
        const query = `
            SELECT 
                pra.assignment_id,
                pra.project_id,
                pra.resource_type,
                pra.resource_id,
                pra.assigned_quantity,
                pra.start_date,
                pra.end_date,
                pra.daily_rate,
                pra.total_cost,
                pra.status,
                pra.notes,
                pra.assigned_at,
                CASE 
                    WHEN pra.resource_type = 'asset' THEN a.name
                    WHEN pra.resource_type = 'facility' THEN f.name
                    WHEN pra.resource_type = 'equipment' THEN pr.name
                    WHEN pra.resource_type = 'service' THEN pr.name
                    ELSE 'Unknown'
                END as resource_name,
                CASE 
                    WHEN pra.resource_type = 'asset' THEN a.asset_type
                    WHEN pra.resource_type = 'facility' THEN f.facility_type
                    WHEN pra.resource_type = 'equipment' THEN pr.category
                    WHEN pra.resource_type = 'service' THEN pr.category
                    ELSE 'Unknown'
                END as resource_category,
                CASE 
                    WHEN pra.resource_type = 'asset' THEN a.description
                    WHEN pra.resource_type = 'facility' THEN f.description
                    WHEN pra.resource_type = 'equipment' THEN pr.description
                    WHEN pra.resource_type = 'service' THEN pr.description
                    ELSE 'Unknown'
                END as resource_description
            FROM project_resource_assignments pra
            LEFT JOIN assets a ON pra.resource_type = 'asset' AND pra.resource_id = a.id
            LEFT JOIN facilities f ON pra.resource_type = 'facility' AND pra.resource_id = f.facility_id
            LEFT JOIN project_resources pr ON pra.resource_type IN ('equipment', 'service') AND pra.resource_id = pr.resource_id
            WHERE pra.project_id = $1
            ORDER BY pra.assigned_at DESC
        `;
        const result = await pool.query(query, [projectId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching project resource assignments:', err);
        res.status(500).json({ error: 'Failed to fetch project resource assignments' });
    }
});

app.post('/api/projects/:projectId/resource-assignments', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { resourceType, resourceId, assignedQuantity, startDate, endDate, dailyRate, notes } = req.body;
        
        // Calculate total cost
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const totalCost = dailyRate * days * assignedQuantity;
        
        const query = `
            INSERT INTO project_resource_assignments 
            (project_id, resource_type, resource_id, assigned_quantity, start_date, end_date, daily_rate, total_cost, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const result = await pool.query(query, [
            projectId, resourceType, resourceId, assignedQuantity, startDate, endDate, dailyRate, totalCost, notes
        ]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creating project resource assignment:', err);
        res.status(500).json({ error: 'Failed to create project resource assignment' });
    }
});

app.delete('/api/projects/:projectId/resource-assignments/:assignmentId', async (req, res) => {
    try {
        const { assignmentId } = req.params;
        await pool.query('DELETE FROM project_resource_assignments WHERE assignment_id = $1', [assignmentId]);
        res.json({ message: 'Resource assignment deleted successfully' });
    } catch (err) {
        console.error('Error deleting project resource assignment:', err);
        res.status(500).json({ error: 'Failed to delete project resource assignment' });
    }
});

// Enhanced task resources endpoint
app.get('/api/tasks/:taskId/resources', async (req, res) => {
    try {
        const { taskId } = req.params;
        const query = `
            SELECT 
                tra.assignment_id,
                tra.task_id,
                tra.project_assignment_id,
                tra.quantity,
                tra.start_time,
                tra.end_time,
                tra.checked_out_at,
                tra.checked_in_at,
                tra.return_date,
                tra.notes,
                pra.resource_type,
                pra.resource_id,
                CASE 
                    WHEN pra.resource_type = 'asset' THEN a.name
                    WHEN pra.resource_type = 'facility' THEN f.name
                    WHEN pra.resource_type = 'equipment' THEN pr.name
                    WHEN pra.resource_type = 'service' THEN pr.name
                    ELSE 'Unknown'
                END as resource_name,
                CASE 
                    WHEN pra.resource_type = 'asset' THEN a.asset_type
                    WHEN pra.resource_type = 'facility' THEN f.facility_type
                    WHEN pra.resource_type = 'equipment' THEN pr.category
                    WHEN pra.resource_type = 'service' THEN pr.category
                    ELSE 'Unknown'
                END as resource_category,
                CASE 
                    WHEN pra.resource_type = 'asset' THEN a.description
                    WHEN pra.resource_type = 'facility' THEN f.description
                    WHEN pra.resource_type = 'equipment' THEN pr.description
                    WHEN pra.resource_type = 'service' THEN pr.description
                    ELSE 'Unknown'
                END as resource_description
            FROM task_resource_assignments tra
            JOIN project_resource_assignments pra ON tra.project_assignment_id = pra.assignment_id
            LEFT JOIN assets a ON pra.resource_type = 'asset' AND pra.resource_id = a.id
            LEFT JOIN facilities f ON pra.resource_type = 'facility' AND pra.resource_id = f.facility_id
            LEFT JOIN project_resources pr ON pra.resource_type IN ('equipment', 'service') AND pra.resource_id = pr.resource_id
            WHERE tra.task_id = $1
            ORDER BY tra.created_at DESC
        `;
        const result = await pool.query(query, [taskId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching task resources:', err);
        res.status(500).json({ error: 'Failed to fetch task resources' });
    }
});

// Start HTTP server for development
const server = http.createServer(app);
server.listen(PORT, HOST, () => {
  console.log(`HTTP server running at http://${DISPLAY_HOST}:${PORT}/`);
});

// Check if SSL certificates exist and start HTTPS server
const sslDir = path.join(__dirname, 'ssl');
const certPath = path.join(sslDir, 'cert.pem');
const keyPath = path.join(sslDir, 'key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const httpsOptions = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
    };
    
    const httpsServer = https.createServer(httpsOptions, app);
    httpsServer.listen(HTTPS_PORT, () => {
        console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
    });
} else {
    console.log('SSL certificates not found. HTTPS server not started.');
    console.log('Run "npm run generate-cert" to generate SSL certificates.');
}

module.exports = app;
