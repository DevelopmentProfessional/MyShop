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
const app = express();

const PORT = process.env.PORT || 3000;

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

pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    require: true
  },
  statement_timeout: 30000, // 30 seconds
  query_timeout: 30000
});

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


const handleError = (res, error, message, details = false) => {
  const response = {
    error: message,
    ...(details && { details: error.message })
  };
  res.status(500).json(response);
};

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
        handleError(res, error, 'Check console');
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
        const result = await pool.query('SELECT * FROM employees ORDER BY last_name');
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
        const result = await pool.query('SELECT * FROM projects ORDER BY start_date DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching projects:', error);
    }
});

app.get('/api/tasks', async (req, res) => {
    try {
        const result = await pool.query(`SELECT t.*, p.name as project_name, e.first_name, e.last_name FROM tasks t LEFT JOIN projects p ON t.project_id = p.project_id LEFT JOIN employees e ON t.assigned_to = e.employee_id ORDER BY t.due_date`);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const { project_id, title, description, assigned_to, due_date, priority, status } = req.body;
        const result = await pool.query('INSERT INTO tasks (project_id, title, description, assigned_to, due_date, priority, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [project_id, title, description, assigned_to, due_date, priority, status]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating task:', error);
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, progress } = req.body;
        const result = await pool.query('UPDATE tasks SET status = $1, progress = $2, updated_at = NOW() WHERE task_id = $3 RETURNING *', [status, progress, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating task:', error);
    }
});

app.get('/api/boards', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM boards ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching boards:', error);
    }
});

app.get('/api/boards/:id/notes', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`SELECT n.*, e.first_name, e.last_name FROM notes n LEFT JOIN employees e ON n.created_by = e.employee_id WHERE n.board_id = $1 ORDER BY n.created_at DESC`, [id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching notes:', error);
    }
});

app.post('/api/boards/:id/notes', async (req, res) => {
    try {
        const { id } = req.params;
        const { content, created_by, color } = req.body;
        const result = await pool.query('INSERT INTO notes (board_id, content, created_by, color) VALUES ($1, $2, $3, $4) RETURNING *', [id, content, created_by, color]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating note:', error);
    }
});

app.get('/api/photos_services', async (req, res) => {
    try { 
        const result = await pool.query('SELECT * FROM photos_services'); 
        res.json(result.rows); 
    } 
    catch (error) { 
        handleError(res, error, 'Failed to fetch service photos', true); 
    }
});
app.get('/api/photos_services/:serviceId', async (req, res) => {
    try {
        const { serviceId } = req.params;
        const result = await pool.query('SELECT * FROM photos_services WHERE service_id = $1', [serviceId]);
        res.json(result.rows);
    }
    catch (error) {
        handleError(res, error, 'Failed to fetch service photos', true);
    }
});

app.post('/api/uploadservicephotos', async (req, res) => {
  try{ 
    const { photos } = req.body;
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
        const result = await client.query(
          'INSERT INTO photos_services (service_id, url, filename) VALUES ($1, $2, $3) RETURNING *',
          [photo.service_id, photo.url, photo.filename]
        );
        results.push(result.rows[0]);
      }
      await client.query('COMMIT');
      res.status(201).json({ success: true, photos: results });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ 
        success: false, 
        error: 'Failed to upload service photos',
        details: error.message
      });
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      details: error.message
    });
  }
});

// Customer Reminder Templates API
app.get('/api/customer-reminders', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM CustomerReminders ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Failed to fetch email templates', true);
    }
});

app.post('/api/customer-reminders', async (req, res) => {
    try {
        const { name, subject, body } = req.body;
        if (!name || !subject || !body) {
            return res.status(400).json({ error: 'Name, subject, and body are required' });
        }
        const result = await pool.query(
            'INSERT INTO CustomerReminders (name, subject, body) VALUES ($1, $2, $3) RETURNING *',
            [name, subject, body]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to create reminder template', true);
    }
});

app.put('/api/customer-reminders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, subject, body } = req.body;
        if (!name || !subject || !body) {
            return res.status(400).json({ error: 'Name, subject, and body are required' });
        }
        const result = await pool.query(
            'UPDATE CustomerReminders SET name = $1, subject = $2, body = $3, updatedAt = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
            [name, subject, body, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to update reminder template', true);
    }
});

app.delete('/api/customer-reminders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM CustomerReminders WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }
        res.json({ message: 'Reminder template deleted successfully' });
    } catch (error) {
        handleError(res, error, 'Failed to delete reminder template', true);
    }
});

app.post('/api/send-reminder-email', async (req, res) => {
    const { templateId, appointmentId } = req.body;

    // -- Diagnostic Logging --
    console.log(`[send-reminder-email] Received request. Template ID: ${templateId}, Appointment ID: ${appointmentId}`);
    console.log(`[send-reminder-email] Type of Appointment ID: ${typeof appointmentId}`);

    if (!templateId || !appointmentId) {
        return res.status(400).json({ error: 'templateId and appointmentId are required' });
    }

    try {
        let template, appointmentData;

        if (!dbUrl) {
            // Use mock data for testing
            const mockTemplates = [
                {
                    id: 1,
                    name: 'Appointment Reminder',
                    subject: 'Reminder: Your appointment with {{company.name}}',
                    body: '<p>Hello {{client.name}},</p><p>This is a reminder for your appointment on {{appointment.date}} at {{appointment.time}}.</p><p>Service: {{service.name}}</p><p>Employee: {{employee.name}}</p>'
                },
                {
                    id: 2,
                    name: 'Welcome Email',
                    subject: 'Welcome to {{company.name}}!',
                    body: '<p>Hello {{client.name}},</p><p>Welcome to {{company.name}}! We\'re excited to have you as a client.</p>'
                }
            ];
            
            template = mockTemplates.find(t => t.id === parseInt(templateId));
            if (!template) {
                return res.status(404).json({ error: 'Template not found' });
            }

            // Mock appointment data
            appointmentData = {
                client_name: 'Test Client',
                client_email: 'test@example.com',
                date: '2024-01-15',
                time: '14:00',
                service_name: 'Test Service',
                employee_name: 'Test Employee'
            };
        } else {
            // 1. Fetch the template
            const templateRes = await pool.query('SELECT * FROM CustomerReminders WHERE id = $1', [templateId]);
            if (templateRes.rows.length === 0) {
                return res.status(404).json({ error: 'Template not found' });
            }
            template = templateRes.rows[0];

            // 2. Fetch appointment and related data
            const appointmentRes = await pool.query(
                `SELECT
                    a.date, a.time,
                    c.name as client_name, c.email as client_email,
                    s.name as service_name,
                    e.name as employee_name
                 FROM appointments a
                 JOIN clients c ON a.client_id = c.id
                 JOIN services s ON a.service_id = s.id
                 JOIN employees e ON a.employee_id = e.id
                 WHERE a.id = $1`,
                [appointmentId]
            );

            if (appointmentRes.rows.length === 0) {
                return res.status(404).json({ error: 'Appointment not found' });
            }
            appointmentData = appointmentRes.rows[0];
        }

        // 3. Replace placeholders
        const replacements = {
            '{{client.name}}': appointmentData.client_name,
            '{{client.email}}': appointmentData.client_email,
            '{{appointment.date}}': new Date(appointmentData.date).toLocaleDateString(),
            '{{appointment.time}}': appointmentData.time,
            '{{appointment.name}}': appointmentData.service_name,
            '{{service.name}}': appointmentData.service_name,
            '{{employee.name}}': appointmentData.employee_name,
            '{{company.name}}': 'Shopy' // Example of a static variable
        };

        let processedBody = template.body;
        let processedSubject = template.subject;
        for (const placeholder in replacements) {
            const value = replacements[placeholder];
            // Use a regex with 'g' flag to replace all occurrences
            processedBody = processedBody.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), value);
            processedSubject = processedSubject.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), value);
        }

        // 4. Send email
        const emailResult = await sendEmail({
            to: appointmentData.client_email,
            subject: processedSubject,
            html: processedBody
        });

        if (emailResult.success) {
            res.json({ message: 'Email sent successfully!', ...emailResult });
        } else {
            throw new Error(emailResult.error);
        }

    } catch (error) {
        handleError(res, error, 'Failed to send reminder email', true);
    }
});

// SSL certificate generation
const pems = selfsigned.generate([{ name: 'commonName', value: DISPLAY_HOST }], {
  keySize: 2048,
  days: 365,
  algorithm: 'sha256',
  extensions: [{
    name: 'subjectAltName',
    altNames: [
      { type: 2, value: 'localhost' },
      { type: 2, value: '127.0.0.1' },
      { type: 2, value: DISPLAY_HOST },
      { type: 7, ip: '192.168.4.106' }
    ]
  }]
});

// Test database connection with retry logic
const testDatabaseConnection = async (retries = 3) => {
  // Skip database test if we're in test mode
  if (!dbUrl) {
    console.log('Skipping database connection test - running in test mode');
    return true;
  }

  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      console.log('Database connected successfully');
      console.log(`Database URL: ${dbUrl ? dbUrl.substring(0, 20) + '...' : 'Not set'}`);
      console.log(`SSL enabled: ${isOnRender ? 'Yes (Required for Render database)' : 'No (Local development)'}`);
      console.log(`Environment: ${isOnRender ? 'Render' : 'Local'} (NODE_ENV: ${process.env.NODE_ENV})`);
      return true;
    } catch (error) {
      console.error(`Database connection attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) {
        console.error('All database connection attempts failed');
        console.error('Please check your DATABASE_URL environment variable');
        console.error('Make sure your DATABASE_URL is correct and includes SSL parameters');
        return false;
      }
      // Wait 2 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});

// --- Server Startup ---
if (!isOnRender) {
  // Local development: use both HTTPS and HTTP
  const httpsServer = https.createServer(
    { key: pems.private, cert: pems.cert },
    app
  ).listen(PORT, HOST, () => {
    console.log(`HTTPS server running at https://${DISPLAY_HOST}:${PORT}`);
    console.log(`HTTP server running at http://${DISPLAY_HOST}:${PORT}`);
    console.log(`Environment: Local Development (NODE_ENV: ${process.env.NODE_ENV})`);
    // Only test database connection if we have a database URL
    if (dbUrl) {
      testDatabaseConnection();
      createTables(); // Ensure tables are created/updated
    }
  });
  
  // Also start HTTP server for easier development
  const httpServer = app.listen(PORT + 1, HOST, () => {
    console.log(`HTTP server running at http://${DISPLAY_HOST}:${PORT + 1}`);
  });
  
  httpsServer.on('error', (error) => {
    console.error('HTTPS server startup error:', error);
    process.exit(1);
  });
  
  httpServer.on('error', (error) => {
    console.error('HTTP server startup error:', error);
    // Don't exit if HTTP fails, HTTPS might still work
  });
} else {
  // Production (Render): use HTTP only
  const server = app.listen(PORT, HOST, () => {
    // Show the Render domain, no port if DOMAIN is set
    console.log(`HTTP server running at https://${DISPLAY_HOST}`);
    console.log(`Environment: Render Production (NODE_ENV: ${process.env.NODE_ENV})`);
    // Only test database connection if we have a database URL
    if (dbUrl) {
      testDatabaseConnection();
      createTables(); // Ensure tables are created/updated
    }
  });
  server.on('error', (error) => {
    console.error('Server startup error:', error);
    process.exit(1);
  });
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

app.get('/api/debug/photos-products-table', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'photos_products' 
      ORDER BY ordinal_position
    `);
    console.log('[DEBUG] photos_products table structure:', JSON.stringify(result.rows, null, 2));
    res.json(result.rows);
  } catch (error) {
    console.error('[DEBUG] Error getting photos_products table structure:', error);
    res.status(500).json({ error: 'Failed to get table structure', details: error.message });
  }
});

app.get('/api/debug/appointments-table', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
      ORDER BY ordinal_position
    `);
    console.log('[DEBUG] appointments table structure:', JSON.stringify(result.rows, null, 2));
    res.json(result.rows);
  } catch (error) {
    console.error('[DEBUG] Error getting appointments table structure:', error);
    res.status(500).json({ error: 'Failed to get table structure', details: error.message });
  }
});

app.post('/api/debug/insert-test-data', async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Insert test service
    const serviceResult = await client.query(`
      INSERT INTO services (name, description, category, price, duration, status) 
      VALUES ('Test Service', 'A test service', 'Test Category', 50.00, 60, 'active')
      ON CONFLICT (name) DO NOTHING
      RETURNING id
    `);
    
    // Insert test client
    const clientResult = await client.query(`
      INSERT INTO clients (name, email, phone) 
      VALUES ('Test Client', 'test@example.com', '555-1234')
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `);
    
    // Insert test employee
    const employeeResult = await client.query(`
      INSERT INTO employees (name, email, phone, role, status) 
      VALUES ('Test Employee', 'employee@example.com', '555-5678', 'Test Role', 'active')
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `);
    
    // Insert test appointment
    const appointmentResult = await client.query(`
      INSERT INTO appointments (service_id, client_id, employee_id, date, time, duration, price, status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      serviceResult.rows[0]?.id || 1,
      clientResult.rows[0]?.id || 1,
      employeeResult.rows[0]?.id || 1,
      new Date().toISOString().split('T')[0], // Today's date
      '10:00:00',
      60,
      50.00,
      'scheduled'
    ]);
    
    client.release();
    
    res.json({
      message: 'Test data inserted successfully',
      service: serviceResult.rows[0],
      client: clientResult.rows[0],
      employee: employeeResult.rows[0],
      appointment: appointmentResult.rows[0]
    });
  } catch (error) {
    console.error('[DEBUG] Error inserting test data:', error);
    res.status(500).json({ error: 'Failed to insert test data', details: error.message });
  }
});

// Analytics API endpoints
app.get('/api/analytics/metrics', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_appointments,
                COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
                SUM(COALESCE(a.price, 0)) as total_revenue,
                AVG(COALESCE(a.price, 0)) as avg_revenue
            FROM appointments a
            WHERE a.date >= $1
        `, [cutoffDate.toISOString().split('T')[0]]);
        const servicesResult = await pool.query(`
            SELECT COUNT(*) as active_services 
            FROM services 
            WHERE status = 'active'
        `);
        const metrics = result.rows[0];
        const completionRate = metrics.total_appointments > 0 
            ? Math.round((metrics.completed_appointments / metrics.total_appointments) * 100) 
            : 0;
        res.json({
            totalAppointments: parseInt(metrics.total_appointments) || 0,
            completedAppointments: parseInt(metrics.completed_appointments) || 0,
            completionRate: completionRate,
            totalRevenue: parseFloat(metrics.total_revenue) || 0,
            avgRevenue: parseFloat(metrics.avg_revenue) || 0,
            activeServices: parseInt(servicesResult.rows[0].active_services) || 0
        });
    } catch (error) {
        console.error('Analytics metrics error:', error);
        handleError(res, error, 'Failed to fetch analytics metrics', true);
    }
});

app.get('/api/analytics/trends', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const trends = [];
        const labels = [];
        for (let i = parseInt(days) - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const result = await pool.query(`
                SELECT COUNT(*) as count
                FROM appointments a
                WHERE a.date = $1
            `, [dateStr]);
            trends.push(parseInt(result.rows[0].count) || 0);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
        res.json({ labels, data: trends });
    } catch (error) {
        console.error('Analytics trends error:', error);
        handleError(res, error, 'Failed to fetch trends data', true);
    }
});

app.get('/api/analytics/service-distribution', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
        const result = await pool.query(`
            SELECT 
                s.name,
                COUNT(a.id) as appointment_count
            FROM services s
            LEFT JOIN appointments a ON s.id = a.service_id 
                AND a.date >= $1
            WHERE s.status = 'active'
            GROUP BY s.id, s.name
            ORDER BY appointment_count DESC
        `, [cutoffDate.toISOString().split('T')[0]]);
        const labels = result.rows.map(row => row.name);
        const data = result.rows.map(row => parseInt(row.appointment_count) || 0);
        res.json({ labels, data });
    } catch (error) {
        console.error('Service distribution error:', error);
        handleError(res, error, 'Failed to fetch service distribution', true);
    }
});

app.get('/api/analytics/staff-performance', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
        const result = await pool.query(`
            SELECT 
                e.name,
                COUNT(a.id) as appointment_count,
                COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_count
            FROM employees e
            LEFT JOIN appointments a ON e.id = a.employee_id 
                AND a.date >= $1
            WHERE e.status = 'active'
            GROUP BY e.id, e.name
            ORDER BY appointment_count DESC
        `, [cutoffDate.toISOString().split('T')[0]]);
        const labels = result.rows.map(row => row.name);
        const data = result.rows.map(row => parseInt(row.appointment_count) || 0);
        res.json({ labels, data });
    } catch (error) {
        console.error('Staff performance error:', error);
        handleError(res, error, 'Failed to fetch staff performance', true);
    }
});

app.get('/api/analytics/peak-hours', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
        const result = await pool.query(`
            SELECT 
                EXTRACT(HOUR FROM a.time::time) as hour,
                COUNT(*) as appointment_count
            FROM appointments a
            WHERE a.date >= $1 AND a.time IS NOT NULL
            GROUP BY EXTRACT(HOUR FROM a.time::time)
            ORDER BY hour
        `, [cutoffDate.toISOString().split('T')[0]]);
        // Create array for all 24 hours
        const hourData = Array(24).fill(0);
        result.rows.forEach(row => {
            const hour = parseInt(row.hour);
            hourData[hour] = parseInt(row.appointment_count) || 0;
        });
        const labels = hourData.map((_, i) => `${i.toString().padStart(2, '0')}:00`);
        const data = hourData;
        res.json({ labels, data });
    } catch (error) {
        console.error('Peak hours error:', error);
        handleError(res, error, 'Failed to fetch peak hours data', true);
    }
});

app.get('/api/analytics/recent-appointments', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
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
            ORDER BY a.date DESC, a.time DESC
            LIMIT $1
        `, [parseInt(limit)]);
        const appointments = result.rows.map(row => ({
            ...row,
            service: { name: row.service_name || 'Unknown Service' },
            client: { name: row.client_name || 'Unknown Client', email: row.client_email || '' },
            employee: { name: row.employee_name || 'Unknown Employee' }
        }));
        res.json(appointments);
    } catch (error) {
        console.error('Recent appointments error:', error);
        handleError(res, error, 'Failed to fetch recent appointments', true);
    }
});

const createTables = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS services (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                price NUMERIC(10, 2) NOT NULL,
                duration INT NOT NULL,
                status VARCHAR(20) DEFAULT 'active'
            );
            CREATE TABLE IF NOT EXISTS clients (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE,
                phone VARCHAR(50)
            );
            CREATE TABLE IF NOT EXISTS employees (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE,
                phone VARCHAR(50),
                role VARCHAR(100),
                profile_picture TEXT,
                status VARCHAR(20) DEFAULT 'active'
            );
            CREATE TABLE IF NOT EXISTS appointments (
                id SERIAL PRIMARY KEY,
                service_id INT REFERENCES services(id),
                client_id INT REFERENCES clients(id),
                employee_id INT REFERENCES employees(id),
                date DATE NOT NULL,
                time TIME NOT NULL,
                duration INT,
                price NUMERIC(10, 2),
                notes TEXT,
                status VARCHAR(20) DEFAULT 'scheduled'
            );
            CREATE TABLE IF NOT EXISTS photos (
                id SERIAL PRIMARY KEY,
                product_id INTEGER,
                url TEXT,
                filename TEXT
            );
            CREATE TABLE IF NOT EXISTS photos_products (
                id SERIAL PRIMARY KEY,
                product_id INTEGER,
                url TEXT,
                filename TEXT
            );
            CREATE TABLE IF NOT EXISTS photos_services (
                id SERIAL PRIMARY KEY,
                service_id INTEGER,
                url TEXT,
                filename TEXT
            );
        `);
        // Add the new table separately to avoid issues
        await client.query(`
            CREATE TABLE IF NOT EXISTS CustomerReminders (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                body TEXT NOT NULL,
                createdAt TIMESTAMPTZ DEFAULT NOW(),
                updatedAt TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('Tables checked/created successfully.');
        
        // Check if appointments table needs to be updated with new columns
        try {
            const columnsResult = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'appointments'
            `);
            const existingColumns = columnsResult.rows.map(row => row.column_name);
            
            if (!existingColumns.includes('duration')) {
                await client.query('ALTER TABLE appointments ADD COLUMN duration INT');
                console.log('Added duration column to appointments table');
            }
            
            if (!existingColumns.includes('price')) {
                await client.query('ALTER TABLE appointments ADD COLUMN price NUMERIC(10, 2)');
                console.log('Added price column to appointments table');
            }
        } catch (error) {
            console.error('Error updating appointments table:', error);
        }
    } catch (error) {
        console.error('Error creating tables:', error);
    } finally {
        client.release();
    }
};

// Org chart endpoint: returns all employees with supervisor and department info
app.get('/api/org-chart', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM employees');
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Failed to fetch org chart');
    }
});

// Update an employee's supervisor
app.post('/api/UpdateEmployeeSupervisor', async (req, res) => {
    try {
        const { employee_id, supervisor_id } = req.body;
        if (!employee_id) {
            return res.status(400).json({ error: 'employee_id is required' });
        }
        const result = await pool.query(
            'UPDATE employees SET supervisor_id = $1 WHERE id = $2 RETURNING *',
            [supervisor_id || null, employee_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to update employee supervisor');
    }
});

// Generate PDF from HTML and data
app.post('/api/generate-invoice-pdf', async (req, res) => {
    try {
        const { html, data } = req.body;
        // Replace placeholders in html with data
        let filledHtml = html;
        for (const key in data) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            filledHtml = filledHtml.replace(regex, data[key]);
        }
        // Generate PDF with puppeteer
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(filledHtml, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4' });
        await browser.close();
        res.set({ 'Content-Type': 'application/pdf' });
        res.send(pdfBuffer);
    } catch (error) {
        handleError(res, error, 'Failed to generate invoice PDF');
    }
});

// Email PDF invoice
app.post('/api/email-invoice', async (req, res) => {
    try {
        const { email, pdfBuffer, subject, body } = req.body;
        // Configure nodemailer (use your SMTP settings)
        let transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        let info = await transporter.sendMail({
            from: process.env.SMTP_FROM || 'no-reply@shopy.com',
            to: email,
            subject: subject || 'Your Invoice',
            text: body || 'Please find your invoice attached.',
            attachments: [{ filename: 'invoice.pdf', content: Buffer.from(pdfBuffer, 'base64') }]
        });
        res.json({ success: true, info });
    } catch (error) {
        handleError(res, error, 'Failed to email invoice');
    }
});

// Invoice Templates CRUD
app.get('/api/invoice-templates', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM invoice_templates WHERE is_active = TRUE ORDER BY updated_at DESC');
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Failed to fetch invoice templates');
    }
});

app.get('/api/invoice-templates/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM invoice_templates WHERE id = $1 AND is_active = TRUE', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to fetch invoice template');
    }
});

app.post('/api/invoice-templates', async (req, res) => {
    try {
        const { name, html } = req.body;
        const result = await pool.query(
            'INSERT INTO invoice_templates (name, html) VALUES ($1, $2) RETURNING *',
            [name, html]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to create invoice template');
    }
});

app.put('/api/invoice-templates/:id', async (req, res) => {
    try {
        const { name, html } = req.body;
        const result = await pool.query(
            'UPDATE invoice_templates SET name = $1, html = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            [name, html, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to update invoice template');
    }
});

app.delete('/api/invoice-templates/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE invoice_templates SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true });
    } catch (error) {
        handleError(res, error, 'Failed to delete invoice template');
    }
});

// Recruitment Endpoints
app.get('/api/recruits', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM recruits ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Failed to fetch recruits');
    }
});

app.post('/api/recruits', async (req, res) => {
    try {
        const { name, qualifications } = req.body;
        const result = await pool.query(
            'INSERT INTO recruits (name, qualifications) VALUES ($1, $2) RETURNING *',
            [name, qualifications]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to add recruit');
    }
});

app.post('/api/recruits/:id/hire', async (req, res) => {
    try {
        const recruitRes = await pool.query('SELECT * FROM recruits WHERE id = $1', [req.params.id]);
        if (recruitRes.rows.length === 0) return res.status(404).json({ error: 'Recruit not found' });
        const recruit = recruitRes.rows[0];
        // Insert into employees (add more fields as needed)
        const empRes = await pool.query(
            'INSERT INTO employees (name) VALUES ($1) RETURNING *',
            [recruit.name]
        );
        // Update recruit status
        await pool.query('UPDATE recruits SET status = $1 WHERE id = $2', ['hired', req.params.id]);
        res.json({ employee: empRes.rows[0], recruit });
    } catch (error) {
        handleError(res, error, 'Failed to hire recruit');
    }
});

app.delete('/api/recruits/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM recruits WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Recruit not found' });
        res.json({ success: true });
    } catch (error) {
        handleError(res, error, 'Failed to delete recruit');
    }
});

// Contract Management Endpoints
app.get('/api/contracts', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, e.name as assigned_employee_name 
            FROM contracts c 
            LEFT JOIN employees e ON c.assigned_employee_id = e.id 
            WHERE c.is_active = TRUE 
            ORDER BY c.updated_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Failed to fetch contracts');
    }
});

app.get('/api/contracts/:id', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, e.name as assigned_employee_name 
            FROM contracts c 
            LEFT JOIN employees e ON c.assigned_employee_id = e.id 
            WHERE c.id = $1 AND c.is_active = TRUE
        `, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to fetch contract');
    }
});

app.post('/api/contracts', async (req, res) => {
    try {
        const { title, contract_type, status, department, description, assigned_employee_id, expires_at } = req.body;
        const result = await pool.query(`
            INSERT INTO contracts (title, contract_type, status, department, description, assigned_employee_id, expires_at, created_by) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
        `, [title, contract_type, status, department, description, assigned_employee_id, expires_at, 1]); // created_by = 1 for demo
        
        // Add to history
        await pool.query(`
            INSERT INTO contract_history (contract_id, action_type, action_description, performed_by) 
            VALUES ($1, $2, $3, $4)
        `, [result.rows[0].id, 'created', 'Contract created', 1]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to create contract');
    }
});

app.put('/api/contracts/:id', async (req, res) => {
    try {
        const { title, contract_type, status, department, description, assigned_employee_id, expires_at, comment } = req.body;
        
        // Get current contract for comparison
        const currentContract = await pool.query('SELECT * FROM contracts WHERE id = $1', [req.params.id]);
        if (currentContract.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
        
        const result = await pool.query(`
            UPDATE contracts 
            SET title = $1, contract_type = $2, status = $3, department = $4, description = $5, 
                assigned_employee_id = $6, expires_at = $7, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $8 RETURNING *
        `, [title, contract_type, status, department, description, assigned_employee_id, expires_at, req.params.id]);
        
        // Add to history
        const historyActions = [];
        if (currentContract.rows[0].status !== status) {
            historyActions.push(`Status changed from ${currentContract.rows[0].status} to ${status}`);
        }
        if (currentContract.rows[0].assigned_employee_id !== assigned_employee_id) {
            if (assigned_employee_id) {
                historyActions.push('Contract assigned to employee');
            } else {
                historyActions.push('Contract unassigned');
            }
        }
        if (comment) {
            historyActions.push(`Comment: ${comment}`);
        }
        
        if (historyActions.length > 0) {
            await pool.query(`
                INSERT INTO contract_history (contract_id, action_type, action_description, performed_by) 
                VALUES ($1, $2, $3, $4)
            `, [req.params.id, 'updated', historyActions.join('; '), 1]);
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to update contract');
    }
});

app.delete('/api/contracts/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE contracts SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
        
        // Add to history
        await pool.query(`
            INSERT INTO contract_history (contract_id, action_type, action_description, performed_by) 
            VALUES ($1, $2, $3, $4)
        `, [req.params.id, 'deleted', 'Contract deleted', 1]);
        
        res.json({ success: true });
    } catch (error) {
        handleError(res, error, 'Failed to delete contract');
    }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'contracts');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Contract upload endpoint
app.post('/api/contracts/upload', upload.single('contract'), async (req, res) => {
    try {
        const { title, contract_type, department, description, status, assigned_employee_id, expires_at, comment, contract_id } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // If contract_id is provided, update existing contract
        if (contract_id) {
            // Check if contract exists
            const existingContract = await pool.query('SELECT * FROM contracts WHERE id = $1', [contract_id]);
            if (existingContract.rows.length === 0) {
                return res.status(404).json({ error: 'Contract not found' });
            }

            // Update existing contract with new file
            const result = await pool.query(`
                UPDATE contracts 
                SET title = $1, contract_type = $2, status = $3, department = $4, description = $5, 
                    assigned_employee_id = $6, expires_at = $7, contract_document = $8, file_name = $9, 
                    file_size = $10, mime_type = $11, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $12 RETURNING *
            `, [
                title || existingContract.rows[0].title,
                contract_type || existingContract.rows[0].contract_type,
                status || existingContract.rows[0].status,
                department || existingContract.rows[0].department,
                description || existingContract.rows[0].description,
                assigned_employee_id || existingContract.rows[0].assigned_employee_id,
                expires_at || existingContract.rows[0].expires_at,
                fs.readFileSync(req.file.path), // Read file as buffer
                req.file.originalname,
                req.file.size,
                req.file.mimetype,
                contract_id
            ]);

            // Clean up the temporary file
            fs.unlinkSync(req.file.path);

            // Add to history
            await pool.query(`
                INSERT INTO contract_history (contract_id, action_type, action_description, performed_by) 
                VALUES ($1, $2, $3, $4)
            `, [contract_id, 'updated', `Contract updated with new file${comment ? ': ' + comment : ''}`, 1]);

            res.json({ success: true, contract: result.rows[0] });
        } else {
            // Create new contract
            const result = await pool.query(`
                INSERT INTO contracts (title, contract_type, status, department, description, created_by, 
                                     contract_document, file_name, file_size, mime_type) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
            `, [
                title || 'Uploaded Contract', 
                contract_type || 'Service Agreement', 
                'draft', 
                department, 
                description, 
                1, // created_by
                fs.readFileSync(req.file.path), // Read file as buffer
                req.file.originalname,
                req.file.size,
                req.file.mimetype
            ]);
            
            // Clean up the temporary file
            fs.unlinkSync(req.file.path);
            
            // Add to history
            await pool.query(`
                INSERT INTO contract_history (contract_id, action_type, action_description, performed_by) 
                VALUES ($1, $2, $3, $4)
            `, [result.rows[0].id, 'uploaded', 'Contract uploaded', 1]);
            
            res.status(201).json({ success: true, contract: result.rows[0] });
        }
    } catch (error) {
        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        handleError(res, error, 'Failed to upload contract');
    }
});

// Contract export endpoint
app.get('/api/contracts/:id/export', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM contracts WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
        
        // Add to history
        await pool.query(`
            INSERT INTO contract_history (contract_id, action_type, action_description, performed_by) 
            VALUES ($1, $2, $3, $4)
        `, [req.params.id, 'exported', 'Contract exported', 1]);
        
        // For demo, return a simple PDF (in production, this would generate from the actual contract document)
        res.json({ success: true, message: 'Contract export initiated' });
    } catch (error) {
        handleError(res, error, 'Failed to export contract');
    }
});

// Contract history endpoint
app.get('/api/contracts/:id/history', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT ch.*, e.name as performed_by_name 
            FROM contract_history ch 
            LEFT JOIN employees e ON ch.performed_by = e.id 
            WHERE ch.contract_id = $1 
            ORDER BY ch.performed_at DESC
        `, [req.params.id]);
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Failed to fetch contract history');
    }
});

// Signature Management Endpoints
app.get('/api/signatures', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.*, e.name as employee_name 
            FROM signatures s 
            LEFT JOIN employees e ON s.employee_id = e.id 
            ORDER BY s.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Failed to fetch signatures');
    }
});

app.post('/api/signatures', async (req, res) => {
    try {
        const { signature_name, signature_data } = req.body;
        const result = await pool.query(`
            INSERT INTO signatures (employee_id, signature_name, signature_data) 
            VALUES ($1, $2, $3) RETURNING *
        `, [1, signature_name, signature_data]); // employee_id = 1 for demo
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to create signature');
    }
});

app.delete('/api/signatures/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM signatures WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Signature not found' });
        res.json({ success: true });
    } catch (error) {
        handleError(res, error, 'Failed to delete signature');
    }
});

// Contract signature endpoint
app.post('/api/contracts/:id/sign', async (req, res) => {
    try {
        const { signature_id, signature_comment } = req.body;
        const result = await pool.query(`
            INSERT INTO contract_signatures (contract_id, signature_id, signed_by, signature_comment) 
            VALUES ($1, $2, $3, $4) RETURNING *
        `, [req.params.id, signature_id, 1, signature_comment]); // signed_by = 1 for demo
        
        // Add to history
        await pool.query(`
            INSERT INTO contract_history (contract_id, action_type, action_description, performed_by) 
            VALUES ($1, $2, $3, $4)
        `, [req.params.id, 'signed', `Contract signed${signature_comment ? ': ' + signature_comment : ''}`, 1]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to sign contract');
    }
});
