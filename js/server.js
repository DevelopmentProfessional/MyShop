require('dotenv').config({ path: require('path').join(__dirname, '.env') });
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

// Enhanced error handling and logging
const logError = (error, context = '') => {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR${context ? ` (${context})` : ''}: ${error.message}`;
    const stackTrace = error.stack ? `\nStack: ${error.stack}` : '';
    
    console.error('\x1b[31m%s\x1b[0m', errorMessage); // Red color for errors
    if (stackTrace) {
        console.error('\x1b[33m%s\x1b[0m', stackTrace); // Yellow color for stack trace
    }
};

const logInfo = (message, context = '') => {
    const timestamp = new Date().toISOString();
    const infoMessage = `[${timestamp}] INFO${context ? ` (${context})` : ''}: ${message}`;
    console.log('\x1b[36m%s\x1b[0m', infoMessage); // Cyan color for info
};

const logWarning = (message, context = '') => {
    const timestamp = new Date().toISOString();
    const warningMessage = `[${timestamp}] WARNING${context ? ` (${context})` : ''}: ${message}`;
    console.warn('\x1b[33m%s\x1b[0m', warningMessage); // Yellow color for warnings
};

const logSuccess = (message, context = '') => {
    const timestamp = new Date().toISOString();
    const successMessage = `[${timestamp}] SUCCESS${context ? ` (${context})` : ''}: ${message}`;
    console.log('\x1b[32m%s\x1b[0m', successMessage); // Green color for success
};

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
console.log('Available env vars:', Object.keys(process.env).filter(key => key.includes('DB') || key.includes('DATABASE')));
console.log('==============================');

// Function to extract password from DATABASE_URL
const extractPasswordFromUrl = (url) => {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        return urlObj.password || null;
    } catch (error) {
        console.log('Could not parse DATABASE_URL:', error.message);
        return null;
    }
};

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
    
    // Try to get password from DATABASE_URL if it exists
    const passwordFromUrl = extractPasswordFromUrl(process.env.DATABASE_URL);
    const envPassword = process.env.DB_PASSWORD || passwordFromUrl;
    
    // Common default passwords to try
    const commonPasswords = ['postgres', 'admin', 'password', '123456', ''];
    const password = envPassword || commonPasswords[0];
    
    const localConfig = {
        host: 'localhost',
        user: 'postgres',
        database: 'shopy_db',
        port: 5432,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
    };
    
    if (password && password.trim() !== '') {
        localConfig.password = password;
        console.log('Local database config:', { ...localConfig, password: '[SET]' });
    } else {
        console.log('Local database config:', localConfig);
        console.log('No password found - attempting connection without password...');
    }
    
    pool = new Pool(localConfig);
}

// Test the database connection immediately
pool.on('error', (err) => {
    logError(err, 'Database Pool Error');
    process.exit(-1);
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        logError(err, 'Database Connection Test');
    } else {
        logSuccess('Database connection test successful', 'Database');
        logInfo(`Database time: ${res.rows[0].now}`, 'Database');
    }
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

// Specific routes for individual project HTML files
app.get(['/projects/projectoverview.html', '/Projects/projectoverview.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Projects', 'ProjectOverview.html'));
});
app.get(['/projects/projectdetails.html', '/Projects/projectdetails.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Projects', 'ProjectDetails.html'));
});
app.get(['/projects/projectresources.html', '/Projects/projectresources.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Projects', 'ProjectResources.html'));
});
app.get(['/projects/projectteams.html', '/Projects/projectteams.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Projects', 'ProjectTeams.html'));
});
app.get(['/projects/projectreview.html', '/Projects/projectreview.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Projects', 'ProjectReview.html'));
});
app.get(['/projects/gantt.html', '/Projects/gantt.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Projects', 'Gantt.html'));
});
app.get(['/projects/projects.html', '/Projects/projects.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Projects', 'Projects.html'));
});
app.get(['/projects/progress_tracking.html', '/Projects/progress_tracking.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Projects', 'progress_tracking.html'));
});
app.get(['/projects/task_assignments.html', '/Projects/task_assignments.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Projects', 'task_assignments.html'));
});
app.get(['/projects/task_dependencies.html', '/Projects/task_dependencies.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Projects', 'task_dependencies.html'));
});
app.get(['/projects/team_collaboration_boards.html', '/Projects/team_collaboration_boards.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Projects', 'team_collaboration_boards.html'));
});
app.get(['/projects/project_timelines.html', '/Projects/project_timelines.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Projects', 'project_timelines.html'));
});
app.get(['/projects/time_logging.html', '/Projects/time_logging.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Projects', 'time_logging.html'));
});

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

// Simple test endpoint without database
app.get('/api/test-server', (req, res) => {
    res.json({ 
        message: 'Server is running successfully',
        timestamp: new Date().toISOString(),
        database: 'Connection status will be shown in logs'
    });
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
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch services', details: error.message });
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
        const { name, description, price, duration, category } = req.body;
        
        // Validate required fields
        if (!name || !price) {
            return res.status(400).json({ 
                success: false, 
                error: 'Service name and price are required',
                details: 'Missing: ' + [
                    !name ? 'name' : null,
                    !price ? 'price' : null
                ].filter(Boolean).join(', ')
            });
        }
        
        const result = await pool.query(
            'INSERT INTO services (name, description, price, duration, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, description || null, price, duration || null, category || null]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({ success: false, error: 'Failed to create service', details: error.message });
    }
});
app.put('/api/services/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, duration, category } = req.body;
        
        // Validate required fields
        if (!name || !price) {
            return res.status(400).json({ 
                success: false, 
                error: 'Service name and price are required',
                details: 'Missing: ' + [
                    !name ? 'name' : null,
                    !price ? 'price' : null
                ].filter(Boolean).join(', ')
            });
        }
        
        const result = await pool.query(
            'UPDATE services SET name = $1, description = $2, price = $3, duration = $4, category = $5 WHERE id = $6 RETURNING *',
            [name, description || null, price, duration || null, category || null, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Service not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({ success: false, error: 'Failed to update service', details: error.message });
    }
});
app.delete('/api/services/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('DELETE FROM services WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Service not found' });
        }
        
        res.json({ success: true, message: 'Service deleted successfully' });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({ success: false, error: 'Failed to delete service', details: error.message });
    }
});

// ========================================
// CLIENT MANAGEMENT API ENDPOINTS
// ========================================

app.get('/api/clients', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clients ORDER BY name');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch clients', details: error.message });
    }
});

// Get client by ID
app.get('/api/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch client', details: error.message });
    }
});

app.post('/api/clients', async (req, res) => {
    try {
        const { name, email, phone, address, notes } = req.body;
        
        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client name and email are required',
                details: 'Missing: ' + [
                    !name ? 'name' : null,
                    !email ? 'email' : null
                ].filter(Boolean).join(', ')
            });
        }
        
        const result = await pool.query(
            'INSERT INTO clients (name, email, phone, address, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, email, phone || null, address || null, notes || null]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ success: false, error: 'Failed to create client', details: error.message });
    }
});

app.put('/api/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, address, notes } = req.body;
        
        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client name and email are required',
                details: 'Missing: ' + [
                    !name ? 'name' : null,
                    !email ? 'email' : null
                ].filter(Boolean).join(', ')
            });
        }
        
        const result = await pool.query(
            'UPDATE clients SET name = $1, email = $2, phone = $3, address = $4, notes = $5 WHERE id = $6 RETURNING *',
            [name, email, phone || null, address || null, notes || null, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ success: false, error: 'Failed to update client', details: error.message });
    }
});

app.delete('/api/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }
        
        res.json({ success: true, message: 'Client deleted successfully' });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ success: false, error: 'Failed to delete client', details: error.message });
    }
});

// ========================================
// EMPLOYEE MANAGEMENT API ENDPOINTS
// ========================================

// Get all employees (standardized response format)
app.get('/api/employees', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, name, email, phone, role, status, supervisor_id, department FROM employees ORDER BY name'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch employees', details: error.message });
    }
});

// Create new employee
app.post('/api/employees', async (req, res) => {
    try {
        const { name, email, phone, role, status, supervisor_id, department } = req.body;
        
        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name and email are required',
                details: 'Missing: ' + [
                    !name ? 'name' : null,
                    !email ? 'email' : null
                ].filter(Boolean).join(', ')
            });
        }
        
        const result = await pool.query(
            'INSERT INTO employees (name, email, phone, role, status, supervisor_id, department) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [name, email, phone || null, role || null, status || 'active', supervisor_id || null, department || null]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ success: false, error: 'Failed to create employee', details: error.message });
    }
});

// Update employee
app.put('/api/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, role, status, supervisor_id, department } = req.body;
        
        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name and email are required',
                details: 'Missing: ' + [
                    !name ? 'name' : null,
                    !email ? 'email' : null
                ].filter(Boolean).join(', ')
            });
        }
        
        const result = await pool.query(
            'UPDATE employees SET name = $1, email = $2, phone = $3, role = $4, status = $5, supervisor_id = $6, department = $7 WHERE id = $8 RETURNING *',
            [name, email, phone || null, role || null, status || 'active', supervisor_id || null, department || null, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ success: false, error: 'Failed to update employee', details: error.message });
    }
});

// Delete employee
app.delete('/api/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('DELETE FROM employees WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }
        
        res.json({ success: true, message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ success: false, error: 'Failed to delete employee', details: error.message });
    }
});

// Get employee by ID
app.get('/api/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { rows } = await pool.query(
            'SELECT id, name, email, phone, role, status, supervisor_id, department FROM employees WHERE id = $1',
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }
        
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch employee', details: error.message });
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
        
        res.json({ success: true, data: appointments });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch appointments', details: error.message });
    }
});

app.post('/api/appointments', async (req, res) => {
    try {
        const { service_id, client_id, employee_id, date, time, duration, price, status } = req.body;
        
        // Validate required fields
        if (!client_id || !date || !time) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client ID, date, and time are required',
                details: 'Missing: ' + [
                    !client_id ? 'client_id' : null,
                    !date ? 'date' : null,
                    !time ? 'time' : null
                ].filter(Boolean).join(', ')
            });
        }
        
        const result = await pool.query(
            'INSERT INTO appointments (service_id, client_id, employee_id, date, time, duration, price, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [service_id || null, client_id, employee_id || null, date, time, duration || null, price || null, status || 'scheduled']
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ success: false, error: 'Failed to create appointment', details: error.message });
    }
});

app.put('/api/appointments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { service_id, client_id, employee_id, date, time, duration, price, status } = req.body;
        
        // Validate required fields
        if (!client_id || !date || !time) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client ID, date, and time are required',
                details: 'Missing: ' + [
                    !client_id ? 'client_id' : null,
                    !date ? 'date' : null,
                    !time ? 'time' : null
                ].filter(Boolean).join(', ')
            });
        }
        
        const result = await pool.query(
            'UPDATE appointments SET service_id = $1, client_id = $2, employee_id = $3, date = $4, time = $5, duration = $6, price = $7, status = $8 WHERE id = $9 RETURNING *',
            [service_id || null, client_id, employee_id || null, date, time, duration || null, price || null, status || 'scheduled', id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Appointment not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ success: false, error: 'Failed to update appointment', details: error.message });
    }
});

app.delete('/api/appointments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('DELETE FROM appointments WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Appointment not found' });
        }
        
        res.json({ success: true, message: 'Appointment deleted successfully' });
    } catch (error) {
        console.error('Error deleting appointment:', error);
        res.status(500).json({ success: false, error: 'Failed to delete appointment', details: error.message });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, description, price, quantity, category, status, barcode FROM products ORDER BY name');
        console.log('Products API response:', JSON.stringify(result.rows, null, 2));
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch products', details: error.message });
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
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error getting table structure:', error);
        res.status(500).json({ success: false, error: 'Failed to get table structure', details: error.message });
    }
});

// Debug endpoint to see actual product data
app.get('/api/debug/products-data', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products LIMIT 5');
        console.log('Raw products data:', JSON.stringify(result.rows, null, 2));
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error getting products data:', error);
        res.status(500).json({ success: false, error: 'Failed to get products data', details: error.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch product', details: error.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { name, description, price, quantity, category, status, barcode } = req.body;
        
        // Validate required fields
        if (!name || !price) {
            return res.status(400).json({ 
                success: false, 
                error: 'Product name and price are required',
                details: 'Missing: ' + [
                    !name ? 'name' : null,
                    !price ? 'price' : null
                ].filter(Boolean).join(', ')
            });
        }
        
        const result = await pool.query(
            'INSERT INTO products (name, description, price, quantity, category, status, barcode) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [name, description || null, price, quantity || 0, category || null, status || 'active', barcode || null]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ success: false, error: 'Failed to create product', details: error.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, quantity, category, status, barcode } = req.body;
        
        // Validate required fields
        if (!name || !price) {
            return res.status(400).json({ 
                success: false, 
                error: 'Product name and price are required',
                details: 'Missing: ' + [
                    !name ? 'name' : null,
                    !price ? 'price' : null
                ].filter(Boolean).join(', ')
            });
        }
        
        const result = await pool.query(
            'UPDATE products SET name = $1, description = $2, price = $3, quantity = $4, category = $5, status = $6, barcode = $7 WHERE id = $8 RETURNING *',
            [name, description || null, price, quantity || 0, category || null, status || 'active', barcode || null, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, error: 'Failed to update product', details: error.message });
    }
});

app.put('/api/productbarcode/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { barcode } = req.body;
        
        if (!barcode) {
            return res.status(400).json({ success: false, error: 'Barcode is required' });
        }

        const result = await pool.query(
            'UPDATE products SET barcode = $1 WHERE id = $2 RETURNING id, barcode',
            [barcode, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating product barcode:', error);
        res.status(500).json({ success: false, error: 'Failed to update product barcode', details: error.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ success: false, error: 'Failed to delete product', details: error.message });
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
        const result = await pool.query(`
            SELECT up.*, p.name as permission_name, p.description as permission_description
            FROM user_permissions up
            JOIN permissions p ON up.permission_id = p.id
            ORDER BY p.name
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({ error: 'Failed to fetch user permissions', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
});

app.get('/api/employees', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, name, email FROM employees ORDER BY name'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch employees', details: error.message });
    }
});

// ========================================
// PAYROLL MANAGEMENT API ENDPOINTS
// ========================================

app.get('/api/payroll', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, e.name as employee_name, e.email as employee_email
            FROM payroll p 
            JOIN employees e ON p.employee_id = e.id 
            ORDER BY p.pay_date DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching payroll:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch payroll', details: error.message });
    }
});

app.post('/api/payroll', async (req, res) => {
    try {
        const { employee_id, pay_date, gross_salary, deductions, net_salary } = req.body;
        
        // Validate required fields
        if (!employee_id || !pay_date || !gross_salary || !net_salary) {
            return res.status(400).json({ 
                success: false, 
                error: 'Employee ID, pay date, gross salary, and net salary are required',
                details: 'Missing: ' + [
                    !employee_id ? 'employee_id' : null,
                    !pay_date ? 'pay_date' : null,
                    !gross_salary ? 'gross_salary' : null,
                    !net_salary ? 'net_salary' : null
                ].filter(Boolean).join(', ')
            });
        }
        
        const result = await pool.query(
            'INSERT INTO payroll (employee_id, pay_date, gross_salary, deductions, net_salary) VALUES ($1, $2, $3, $4, $5) RETURNING *', 
            [employee_id, pay_date, gross_salary, deductions || 0, net_salary]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating payroll record:', error);
        res.status(500).json({ success: false, error: 'Failed to create payroll record', details: error.message });
    }
});

// Get payroll by employee ID
app.get('/api/payroll/employee/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        const result = await pool.query(`
            SELECT p.*, e.name as employee_name, e.email as employee_email
            FROM payroll p 
            JOIN employees e ON p.employee_id = e.id 
            WHERE p.employee_id = $1
            ORDER BY p.pay_date DESC
        `, [employeeId]);
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching employee payroll:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch employee payroll', details: error.message });
    }
});

// Update payroll record
app.put('/api/payroll/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { employee_id, pay_date, gross_salary, deductions, net_salary } = req.body;
        
        const result = await pool.query(
            'UPDATE payroll SET employee_id = $1, pay_date = $2, gross_salary = $3, deductions = $4, net_salary = $5 WHERE payroll_id = $6 RETURNING *',
            [employee_id, pay_date, gross_salary, deductions || 0, net_salary, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Payroll record not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating payroll record:', error);
        res.status(500).json({ success: false, error: 'Failed to update payroll record', details: error.message });
    }
});

// Delete payroll record
app.delete('/api/payroll/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('DELETE FROM payroll WHERE payroll_id = $1 RETURNING payroll_id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Payroll record not found' });
        }
        
        res.json({ success: true, message: 'Payroll record deleted successfully' });
    } catch (error) {
        console.error('Error deleting payroll record:', error);
        res.status(500).json({ success: false, error: 'Failed to delete payroll record', details: error.message });
    }
});

// ========================================
// PROJECT MANAGEMENT API ENDPOINTS
// ========================================

app.get('/api/projects', async (req, res) => {
    try {
        // Check if created_at column exists
        const hasCreatedAt = await columnExists('projects', 'created_at');
        const orderBy = hasCreatedAt ? 'ORDER BY created_at DESC' : 'ORDER BY project_id DESC';
        
        const result = await pool.query(`SELECT * FROM projects ${orderBy}`);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch projects', details: error.message });
    }
});

app.get('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM projects WHERE project_id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch project', details: error.message });
    }
});

app.post('/api/projects', async (req, res) => {
    try {
        const { name, description, is_template, roi, swot, review_status, created_by } = req.body;
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Project name is required',
                details: 'Missing: name'
            });
        }
        
        const result = await pool.query(
            `INSERT INTO projects (name, description, is_template, roi, swot, review_status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [name, description || null, is_template || false, roi || null, swot || null, review_status || 'pending', created_by || null]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ success: false, error: 'Failed to create project', details: error.message });
    }
});

app.put('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, is_template, roi, swot, review_status, created_by } = req.body;
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Project name is required',
                details: 'Missing: name'
            });
        }
        
        const result = await pool.query(
            `UPDATE projects SET name=$1, description=$2, is_template=$3, roi=$4, swot=$5, review_status=$6, created_by=$7 WHERE project_id=$8 RETURNING *`,
            [name, description || null, is_template || false, roi || null, swot || null, review_status || 'pending', created_by || null, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ success: false, error: 'Failed to update project', details: error.message });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM projects WHERE project_id = $1 RETURNING project_id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        
        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ success: false, error: 'Failed to delete project', details: error.message });
    }
});

app.get('/api/tasks', async (req, res) => {
    try {
        logInfo('Fetching all tasks', 'Tasks API');
        
        // Check if tasks table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'tasks'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            logWarning('Tasks table does not exist, returning empty array', 'Tasks API');
            return res.json({ success: true, data: [] });
        }
        
        // Get the actual columns from tasks table
        const tasksColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tasks' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        logInfo(`Tasks columns: ${tasksColumns.rows.map(r => r.column_name).join(', ')}`, 'Tasks API');
        
        // Build query based on available columns
        const availableColumns = tasksColumns.rows.map(r => r.column_name);
        const selectColumns = [];
        
        if (availableColumns.includes('task_id')) selectColumns.push('t.task_id');
        if (availableColumns.includes('project_id')) selectColumns.push('t.project_id');
        if (availableColumns.includes('title')) selectColumns.push('t.title');
        if (availableColumns.includes('description')) selectColumns.push('t.description');
        if (availableColumns.includes('assigned_to')) selectColumns.push('t.assigned_to');
        if (availableColumns.includes('claimed_by')) selectColumns.push('t.claimed_by');
        if (availableColumns.includes('assigned_team_id')) selectColumns.push('t.assigned_team_id');
        if (availableColumns.includes('status')) selectColumns.push('t.status');
        if (availableColumns.includes('is_milestone')) selectColumns.push('t.is_milestone');
        if (availableColumns.includes('successor_task_id')) selectColumns.push('t.successor_task_id');
        if (availableColumns.includes('start_time')) selectColumns.push('t.start_time');
        if (availableColumns.includes('end_time')) selectColumns.push('t.end_time');
        if (availableColumns.includes('created_at')) selectColumns.push('t.created_at');
        
        if (selectColumns.length === 0) {
            logWarning('No valid columns found in tasks table', 'Tasks API');
            return res.json({ success: true, data: [] });
        }
        
        // Check if created_at column exists for ordering
        const hasCreatedAt = availableColumns.includes('created_at');
        const orderBy = hasCreatedAt ? 'ORDER BY t.created_at DESC' : 'ORDER BY t.task_id DESC';
        
        const query = `
            SELECT 
                ${selectColumns.join(', ')},
                p.name as project_name,
                e.name as assigned_employee_name,
                e.email as assigned_employee_email
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.project_id
            LEFT JOIN employees e ON t.assigned_to = e.id
            ${orderBy}
        `;
        
        const { rows } = await pool.query(query);
        logSuccess(`Found ${rows.length} tasks`, 'Tasks API');
        res.json({ success: true, data: rows });
    } catch (error) {
        logError(error, 'Tasks API');
        res.status(500).json({ success: false, error: 'Failed to fetch tasks', details: error.message });
    }
});

// Get task by ID
app.get('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        logInfo(`Fetching task ID: ${id}`, 'Tasks API');
        
        // Get the actual columns from tasks table
        const tasksColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tasks' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        // Build query based on available columns
        const availableColumns = tasksColumns.rows.map(r => r.column_name);
        const selectColumns = [];
        
        if (availableColumns.includes('task_id')) selectColumns.push('t.task_id');
        if (availableColumns.includes('project_id')) selectColumns.push('t.project_id');
        if (availableColumns.includes('title')) selectColumns.push('t.title');
        if (availableColumns.includes('description')) selectColumns.push('t.description');
        if (availableColumns.includes('assigned_to')) selectColumns.push('t.assigned_to');
        if (availableColumns.includes('claimed_by')) selectColumns.push('t.claimed_by');
        if (availableColumns.includes('assigned_team_id')) selectColumns.push('t.assigned_team_id');
        if (availableColumns.includes('status')) selectColumns.push('t.status');
        if (availableColumns.includes('is_milestone')) selectColumns.push('t.is_milestone');
        if (availableColumns.includes('successor_task_id')) selectColumns.push('t.successor_task_id');
        if (availableColumns.includes('start_time')) selectColumns.push('t.start_time');
        if (availableColumns.includes('end_time')) selectColumns.push('t.end_time');
        if (availableColumns.includes('created_at')) selectColumns.push('t.created_at');
        
        if (selectColumns.length === 0) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }
        
        const query = `
            SELECT 
                ${selectColumns.join(', ')},
                p.name as project_name,
                e.name as assigned_employee_name,
                e.email as assigned_employee_email
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.project_id
            LEFT JOIN employees e ON t.assigned_to = e.id
            WHERE t.task_id = $1
        `;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }
        
        logSuccess(`Found task ID: ${id}`, 'Tasks API');
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        logError(error, 'Tasks API');
        res.status(500).json({ success: false, error: 'Failed to fetch task', details: error.message });
    }
});

// Create new task
app.post('/api/tasks', async (req, res) => {
    try {
        const { title, description, project_id, assigned_to, priority, status, due_date, assigned_team_id, is_milestone, start_time, end_time } = req.body;
        logInfo(`Creating new task: ${title}`, 'Tasks API');
        
        // Validate required fields
        if (!title) {
            return res.status(400).json({ 
                success: false, 
                error: 'Task title is required',
                details: 'Missing: title'
            });
        }
        
        // Get available columns for dynamic query building
        const tasksColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tasks' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        const availableColumns = tasksColumns.rows.map(r => r.column_name);
        const insertColumns = [];
        const insertValues = [];
        let paramCount = 1;
        
        if (availableColumns.includes('title')) {
            insertColumns.push('title');
            insertValues.push(title);
            paramCount++;
        }
        if (availableColumns.includes('description')) {
            insertColumns.push('description');
            insertValues.push(description || null);
            paramCount++;
        }
        if (availableColumns.includes('project_id')) {
            insertColumns.push('project_id');
            insertValues.push(project_id || null);
            paramCount++;
        }
        if (availableColumns.includes('assigned_to')) {
            insertColumns.push('assigned_to');
            insertValues.push(assigned_to || null);
            paramCount++;
        }
        if (availableColumns.includes('assigned_team_id')) {
            insertColumns.push('assigned_team_id');
            insertValues.push(assigned_team_id || null);
            paramCount++;
        }
        if (availableColumns.includes('status')) {
            insertColumns.push('status');
            insertValues.push(status || 'pending');
            paramCount++;
        }
        if (availableColumns.includes('is_milestone')) {
            insertColumns.push('is_milestone');
            insertValues.push(is_milestone || false);
            paramCount++;
        }
        if (availableColumns.includes('start_time')) {
            insertColumns.push('start_time');
            insertValues.push(start_time || null);
            paramCount++;
        }
        if (availableColumns.includes('end_time')) {
            insertColumns.push('end_time');
            insertValues.push(end_time || null);
            paramCount++;
        }
        
        const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO tasks (${insertColumns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        
        const result = await pool.query(query, insertValues);
        logSuccess(`Created task with ID: ${result.rows[0].task_id}`, 'Tasks API');
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        logError(error, 'Tasks API');
        res.status(500).json({ success: false, error: 'Failed to create task', details: error.message });
    }
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, project_id, assigned_to, priority, status, due_date, assigned_team_id, is_milestone, start_time, end_time } = req.body;
        logInfo(`Updating task ID: ${id}`, 'Tasks API');
        
        // Validate required fields
        if (!title) {
            return res.status(400).json({ 
                success: false, 
                error: 'Task title is required',
                details: 'Missing: title'
            });
        }
        
        // Get available columns for dynamic query building
        const tasksColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tasks' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        const availableColumns = tasksColumns.rows.map(r => r.column_name);
        const updateColumns = [];
        const updateValues = [];
        let paramCount = 1;
        
        if (availableColumns.includes('title')) {
            updateColumns.push('title = $' + paramCount);
            updateValues.push(title);
            paramCount++;
        }
        if (availableColumns.includes('description')) {
            updateColumns.push('description = $' + paramCount);
            updateValues.push(description || null);
            paramCount++;
        }
        if (availableColumns.includes('project_id')) {
            updateColumns.push('project_id = $' + paramCount);
            updateValues.push(project_id || null);
            paramCount++;
        }
        if (availableColumns.includes('assigned_to')) {
            updateColumns.push('assigned_to = $' + paramCount);
            updateValues.push(assigned_to || null);
            paramCount++;
        }
        if (availableColumns.includes('assigned_team_id')) {
            updateColumns.push('assigned_team_id = $' + paramCount);
            updateValues.push(assigned_team_id || null);
            paramCount++;
        }
        if (availableColumns.includes('status')) {
            updateColumns.push('status = $' + paramCount);
            updateValues.push(status || 'pending');
            paramCount++;
        }
        if (availableColumns.includes('is_milestone')) {
            updateColumns.push('is_milestone = $' + paramCount);
            updateValues.push(is_milestone || false);
            paramCount++;
        }
        if (availableColumns.includes('start_time')) {
            updateColumns.push('start_time = $' + paramCount);
            updateValues.push(start_time || null);
            paramCount++;
        }
        if (availableColumns.includes('end_time')) {
            updateColumns.push('end_time = $' + paramCount);
            updateValues.push(end_time || null);
            paramCount++;
        }
        
        updateValues.push(id); // Add the WHERE clause parameter
        
        const query = `UPDATE tasks SET ${updateColumns.join(', ')} WHERE task_id = $${paramCount} RETURNING *`;
        
        const result = await pool.query(query, updateValues);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }
        
        logSuccess(`Updated task ID: ${id}`, 'Tasks API');
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        logError(error, 'Tasks API');
        res.status(500).json({ success: false, error: 'Failed to update task', details: error.message });
    }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('DELETE FROM tasks WHERE task_id = $1 RETURNING task_id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }
        
        res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ success: false, error: 'Failed to delete task', details: error.message });
    }
});

// --- Task Comments ---
// Get all comments for a task
app.get('/api/tasks/:taskId/comments', async (req, res) => {
    try {
        const { taskId } = req.params;
        logInfo(`Fetching comments for task ID: ${taskId}`, 'Task Comments API');
        
        // Check if task_comments table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'task_comments'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            logWarning('Task comments table does not exist, returning empty array', 'Task Comments API');
            return res.json({ success: true, data: [] });
        }
        
        // Get the actual columns from task_comments table
        const commentsColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'task_comments' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        logInfo(`Task comments columns: ${commentsColumns.rows.map(r => r.column_name).join(', ')}`, 'Task Comments API');
        
        // Build query based on available columns
        const availableColumns = commentsColumns.rows.map(r => r.column_name);
        const selectColumns = [];
        
        if (availableColumns.includes('comment_id')) selectColumns.push('tc.comment_id');
        if (availableColumns.includes('task_id')) selectColumns.push('tc.task_id');
        if (availableColumns.includes('author_id')) selectColumns.push('tc.author_id');
        if (availableColumns.includes('comment')) selectColumns.push('tc.comment');
        if (availableColumns.includes('created_at')) selectColumns.push('tc.created_at');
        
        if (selectColumns.length === 0) {
            logWarning('No valid columns found in task_comments table', 'Task Comments API');
            return res.json({ success: true, data: [] });
        }
        
        // Check if created_at column exists for ordering
        const hasCreatedAt = availableColumns.includes('created_at');
        const orderBy = hasCreatedAt ? 'ORDER BY tc.created_at' : 'ORDER BY tc.comment_id';
        
        const query = `
            SELECT 
                ${selectColumns.join(', ')},
                e.name AS author_name
            FROM task_comments tc
            LEFT JOIN employees e ON tc.author_id = e.id
            WHERE tc.task_id = $1 
            ${orderBy}
        `;
        
        const { rows } = await pool.query(query, [taskId]);
        logSuccess(`Found ${rows.length} comments for task ${taskId}`, 'Task Comments API');
        res.json({ success: true, data: rows });
    } catch (error) {
        logError(error, 'Task Comments API');
        res.status(500).json({ success: false, error: 'Failed to fetch task comments', details: error.message });
    }
});

// Add a comment to a task
app.post('/api/tasks/:taskId/comments', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { author_id, comment } = req.body;
        
        // Validate required fields
        if (!author_id || !comment) {
            return res.status(400).json({ 
                success: false, 
                error: 'Author ID and comment are required',
                details: 'Missing: ' + [
                    !author_id ? 'author_id' : null,
                    !comment ? 'comment' : null
                ].filter(Boolean).join(', ')
            });
        }
        
        const result = await pool.query(
            'INSERT INTO task_comments (task_id, author_id, comment) VALUES ($1, $2, $3) RETURNING *',
            [taskId, author_id, comment]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error adding task comment:', error);
        res.status(500).json({ success: false, error: 'Failed to add task comment', details: error.message });
    }
});

// Get employees for assignment
app.get('/api/employees', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, name, email FROM employees ORDER BY name'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch employees', details: error.message });
    }
});

// Get employee benefits
app.get('/api/employees/:id/benefits', async (req, res) => {
    try {
        const { id } = req.params;
        logInfo(`Fetching benefits for employee ID: ${id}`, 'Employee Benefits');
        
        // Check if employee_benefits table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'employee_benefits'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            logWarning('Employee benefits table does not exist, returning empty array', 'Employee Benefits');
            return res.json([]);
        }
        
        // Check if benefits table exists
        const benefitsExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'benefits'
            )
        `);
        
        if (!benefitsExists.rows[0].exists) {
            logWarning('Benefits table does not exist, returning empty array', 'Employee Benefits');
            return res.json([]);
        }
        
        // Get the actual columns from employee_benefits table
        const employeeBenefitsColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'employee_benefits' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        // Get the actual columns from benefits table
        const benefitsColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'benefits' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        logInfo(`Employee benefits columns: ${employeeBenefitsColumns.rows.map(r => r.column_name).join(', ')}`, 'Employee Benefits');
        logInfo(`Benefits columns: ${benefitsColumns.rows.map(r => r.column_name).join(', ')}`, 'Employee Benefits');
        
        // Check if benefit_level column exists in employee_benefits
        const hasBenefitLevel = employeeBenefitsColumns.rows.some(r => r.column_name === 'benefit_level');
        
        if (!hasBenefitLevel) {
            logWarning('benefit_level column does not exist in employee_benefits table, returning empty array', 'Employee Benefits');
            return res.json([]);
        }
        
        // Find available level value columns in benefits table
        const levelValueColumns = benefitsColumns.rows
            .filter(r => r.column_name.match(/^level_\d+_value$/))
            .map(r => r.column_name)
            .sort();
        
        logInfo(`Available level value columns: ${levelValueColumns.join(', ')}`, 'Employee Benefits');
        
        if (levelValueColumns.length === 0) {
            logWarning('No level value columns found in benefits table, returning empty array', 'Employee Benefits');
            return res.json([]);
        }
        
        // Check if the general 'unit' column exists
        const hasUnitColumn = benefitsColumns.rows.some(r => r.column_name === 'unit');
        logInfo(`Benefits table has 'unit' column: ${hasUnitColumn}`, 'Employee Benefits');
        
        // Build dynamic CASE statement for level values
        const levelValueCase = levelValueColumns.map(col => {
            const levelNum = col.match(/level_(\d+)_value/)[1];
            return `WHEN eb.benefit_level = '${levelNum}' THEN b.${col}`;
        }).join(' ');
        
        // Build the query with dynamic level value selection and single unit column
        const query = `
            SELECT 
                b.name,
                b.type,
                b.description,
                eb.benefit_level,
                CASE 
                    ${levelValueCase}
                    ELSE b.${levelValueColumns[0]} -- Default to first level if no match
                END as value,
                ${hasUnitColumn ? 'b.unit' : "'' as unit"},
                CURRENT_DATE as start_date,
                NULL as end_date,
                TRUE as is_active
            FROM employee_benefits eb
            JOIN benefits b ON eb.benefit_id = b.id
            WHERE eb.employee_id = $1
            ORDER BY b.name
        `;
        
        logInfo(`Executing query for employee ${id}`, 'Employee Benefits');
        const { rows } = await pool.query(query, [id]);
        
        logSuccess(`Found ${rows.length} benefits for employee ${id}`, 'Employee Benefits');
        res.json(rows);
    } catch (error) {
        logError(error, 'Employee Benefits API');
        res.status(500).json({ success: false, error: 'Failed to fetch employee benefits', details: error.message });
    }
});

// Check for shift conflicts
app.post('/api/check-conflicts', async (req, res) => {
    try {
        // Check if req.body exists
        if (!req.body) {
            return res.status(400).json({ 
                success: false, 
                error: 'Request body is missing or invalid',
                details: 'Please ensure Content-Type is application/json'
            });
        }

        const { employee_id, date, start_time, end_time, exclude_id } = req.body;
        
        if (!employee_id || !date || !start_time || !end_time) {
            return res.status(400).json({ 
                success: false, 
                error: 'Employee ID, date, start time, and end time are required',
                details: 'Missing: ' + [
                    !employee_id ? 'employee_id' : null,
                    !date ? 'date' : null,
                    !start_time ? 'start_time' : null,
                    !end_time ? 'end_time' : null
                ].filter(Boolean).join(', ')
            });
        }

        // Improved conflict detection query
        let query = `
            SELECT id, start_time, end_time, template_id 
            FROM shift_assignments 
            WHERE employee_id = $1 
            AND date = $2 
            AND (
                (start_time < $4 AND end_time > $3) OR  -- New shift overlaps with existing
                (start_time = $3 AND end_time = $4)     -- Exact same time
            )
        `;
        const params = [employee_id, date, start_time, end_time];

        if (exclude_id) {
            query += ' AND id != $' + (params.length + 1);
            params.push(exclude_id);
        }

        const { rows } = await pool.query(query, params);

        res.json({ 
            success: true, 
            has_conflicts: rows.length > 0,
            conflicts: rows
        });
    } catch (error) {
        console.error('Error checking conflicts:', error);
        res.status(500).json({ success: false, error: 'Failed to check conflicts', details: error.message });
    }
});

// Get shift scheduling overview/dashboard data
app.get('/api/shift-scheduling', async (req, res) => {
    try {
        // Get counts for dashboard
        const templateCount = await pool.query('SELECT COUNT(*) as count FROM shift_templates WHERE is_active = TRUE');
        const rotationCount = await pool.query('SELECT COUNT(*) as count FROM shift_rotations WHERE status = \'active\'');
        const assignmentCount = await pool.query('SELECT COUNT(*) as count FROM shift_assignments WHERE date >= CURRENT_DATE');
        const employeeCount = await pool.query('SELECT COUNT(*) as count FROM employees');
        
        // Get today's assignments
        const todayAssignments = await pool.query(`
            SELECT 
                sa.*,
                st.name as template_name,
                st.color as template_color,
                e.name as employee_name,
                e.email as employee_email
            FROM shift_assignments sa
            JOIN shift_templates st ON sa.template_id = st.id
            JOIN employees e ON sa.employee_id = e.id
            WHERE sa.date = CURRENT_DATE
            ORDER BY sa.start_time
        `);
        
        // Get upcoming assignments (next 7 days)
        const upcomingAssignments = await pool.query(`
            SELECT 
                sa.*,
                st.name as template_name,
                st.color as template_color,
                e.name as employee_name,
                e.email as employee_email
            FROM shift_assignments sa
            JOIN shift_templates st ON sa.template_id = st.id
            JOIN employees e ON sa.employee_id = e.id
            WHERE sa.date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
            ORDER BY sa.date, sa.start_time
        `);

        res.json({
            success: true,
            data: {
                counts: {
                    templates: parseInt(templateCount.rows[0].count),
                    rotations: parseInt(rotationCount.rows[0].count),
                    assignments: parseInt(assignmentCount.rows[0].count),
                    employees: parseInt(employeeCount.rows[0].count)
                },
                today_assignments: todayAssignments.rows,
                upcoming_assignments: upcomingAssignments.rows
            }
        });
    } catch (error) {
        console.error('Error fetching shift scheduling overview:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch shift scheduling overview', details: error.message });
    }
});

// Get rotation sequence (templates in order)
app.get('/api/shift-rotations/:id/sequence', async (req, res) => {
    try {
        const { id } = req.params;

        const { rows } = await pool.query(`
            SELECT 
                rsa.position,
                st.id as template_id,
                st.name as template_name,
                st.start_time,
                st.end_time,
                st.color,
                st.description
            FROM rotation_shift_assignments rsa
            JOIN shift_templates st ON rsa.template_id = st.id
            WHERE rsa.rotation_id = $1
            ORDER BY rsa.position
        `, [id]);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching rotation sequence:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch rotation sequence', details: error.message });
    }
});

// Pause rotation
app.post('/api/shift-rotations/:id/pause', async (req, res) => {
    try {
        const { id } = req.params;

        const { rows } = await pool.query(
            'UPDATE shift_rotations SET status = $1 WHERE id = $2 RETURNING *',
            ['paused', id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Rotation not found' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error pausing rotation:', error);
        res.status(500).json({ success: false, error: 'Failed to pause rotation', details: error.message });
    }
});

// Resume rotation
app.post('/api/shift-rotations/:id/resume', async (req, res) => {
    try {
        const { id } = req.params;

        const { rows } = await pool.query(
            'UPDATE shift_rotations SET status = $1 WHERE id = $2 RETURNING *',
            ['active', id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Rotation not found' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error resuming rotation:', error);
        res.status(500).json({ success: false, error: 'Failed to resume rotation', details: error.message });
    }
});

// ========================================
// SHIFT ASSIGNMENTS API ENDPOINTS
// ========================================

// Get shift assignments
app.get('/api/shift-assignments', async (req, res) => {
    try {
        const { start_date, end_date, employee_id, template_id } = req.query;
        
        let query = `
            SELECT 
                sa.*,
                st.name as template_name,
                st.color as template_color,
                e.name as employee_name,
                e.email as employee_email
            FROM shift_assignments sa
            JOIN shift_templates st ON sa.template_id = st.id
            JOIN employees e ON sa.employee_id = e.id
        `;
        
        const conditions = [];
        const params = [];
        let paramCount = 0;
        
        if (start_date) {
            paramCount++;
            conditions.push(`sa.date >= $${paramCount}`);
            params.push(start_date);
        }
        
        if (end_date) {
            paramCount++;
            conditions.push(`sa.date <= $${paramCount}`);
            params.push(end_date);
        }
        
        if (employee_id) {
            paramCount++;
            conditions.push(`sa.employee_id = $${paramCount}`);
            params.push(employee_id);
        }
        
        if (template_id) {
            paramCount++;
            conditions.push(`sa.template_id = $${paramCount}`);
            params.push(template_id);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY sa.date, sa.start_time';
        
        const { rows } = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching shift assignments:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch shift assignments', details: error.message });
    }
});

// Create individual shift assignment
app.post('/api/shift-assignments', async (req, res) => {
    try {
        console.log('=== SHIFT ASSIGNMENT CREATE REQUEST ===');
        console.log('Request headers:', req.headers);
        console.log('Request body:', req.body);
        console.log('Request body type:', typeof req.body);
        console.log('Request body keys:', req.body ? Object.keys(req.body) : 'undefined');
        console.log('=====================================');

        // Check if req.body exists
        if (!req.body) {
            console.log('ERROR: req.body is undefined or null');
            return res.status(400).json({ 
                success: false, 
                error: 'Request body is missing or invalid',
                details: 'Please ensure Content-Type is application/json'
            });
        }

        const { template_id, employee_id, date, start_time, end_time, notes } = req.body;

        console.log('Destructured values:', {
            template_id,
            employee_id,
            date,
            start_time,
            end_time,
            notes
        });

        if (!template_id || !employee_id || !date || !start_time || !end_time) {
            return res.status(400).json({ 
                success: false, 
                error: 'All fields are required',
                details: 'Missing: ' + [
                    !template_id ? 'template_id' : null,
                    !employee_id ? 'employee_id' : null,
                    !date ? 'date' : null,
                    !start_time ? 'start_time' : null,
                    !end_time ? 'end_time' : null
                ].filter(Boolean).join(', ')
            });
        }
        
        const { rows } = await pool.query(
            'INSERT INTO shift_assignments (template_id, employee_id, date, start_time, end_time, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [template_id, employee_id, date, start_time, end_time, notes || null]
        );

        const assignmentResult = await pool.query(`
            SELECT 
                sa.*,
                st.name as template_name,
                st.color as template_color,
                e.name as employee_name
            FROM shift_assignments sa
            JOIN shift_templates st ON sa.template_id = st.id
            JOIN employees e ON sa.employee_id = e.id
            WHERE sa.id = $1
        `, [rows[0].id]);

        console.log('Assignment created successfully:', assignmentResult.rows[0]);
        res.json({ success: true, data: assignmentResult.rows[0] });
    } catch (error) {
        console.error('Error creating shift assignment:', error);
        res.status(500).json({ success: false, error: 'Failed to create shift assignment', details: error.message });
    }
});

// Update shift assignment
app.put('/api/shift-assignments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { template_id, employee_id, date, start_time, end_time, status, notes } = req.body;

        const { rows } = await pool.query(
            'UPDATE shift_assignments SET template_id = $1, employee_id = $2, date = $3, start_time = $4, end_time = $5, status = $6, notes = $7 WHERE id = $8 RETURNING *',
            [template_id, employee_id, date, start_time, end_time, status, notes, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Shift assignment not found' });
        }

        const assignmentResult = await pool.query(`
            SELECT 
                sa.*,
                st.name as template_name,
                st.color as template_color,
                e.name as employee_name
            FROM shift_assignments sa
            JOIN shift_templates st ON sa.template_id = st.id
            JOIN employees e ON sa.employee_id = e.id
            WHERE sa.id = $1
        `, [id]);

        res.json({ success: true, data: assignmentResult.rows[0] });
    } catch (error) {
        console.error('Error updating shift assignment:', error);
        res.status(500).json({ success: false, error: 'Failed to update shift assignment', details: error.message });
    }
});

// Delete shift assignment
app.delete('/api/shift-assignments/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { rows } = await pool.query(
            'DELETE FROM shift_assignments WHERE id = $1 RETURNING id',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Shift assignment not found' });
        }

        res.json({ success: true, message: 'Shift assignment deleted successfully' });
    } catch (error) {
        console.error('Error deleting shift assignment:', error);
        res.status(500).json({ success: false, error: 'Failed to delete shift assignment', details: error.message });
    }
});

// Create assignments from rotation
app.post('/api/shift-rotations/:id/generate-assignments', async (req, res) => {
    try {
        // Check if req.body exists
        if (!req.body) {
            return res.status(400).json({ 
                success: false, 
                error: 'Request body is missing or invalid',
                details: 'Please ensure Content-Type is application/json'
            });
        }

        const { id } = req.params;
        const { start_date, days_count } = req.body;

        if (!start_date || !days_count) {
            return res.status(400).json({ 
                success: false, 
                error: 'Start date and days count are required',
                details: 'Missing: ' + [
                    !start_date ? 'start_date' : null,
                    !days_count ? 'days_count' : null
                ].filter(Boolean).join(', ')
            });
        }

        // Call the PostgreSQL function to generate assignments
        await pool.query('SELECT create_rotation_assignments($1, $2, $3)', [id, start_date, days_count]);

        res.json({ success: true, message: 'Assignments generated successfully' });
    } catch (error) {
        console.error('Error generating assignments from rotation:', error);
        res.status(500).json({ success: false, error: 'Failed to generate assignments from rotation', details: error.message });
    }
});

// Get recurring shift patterns
app.get('/api/shift-recurring-patterns', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT 
                rsp.*,
                st.name as template_name,
                e.name as employee_name
            FROM recurring_shift_patterns rsp
            JOIN shift_templates st ON rsp.template_id = st.id
            JOIN employees e ON rsp.employee_id = e.id
            WHERE rsp.is_active = TRUE
            ORDER BY rsp.start_date
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching recurring patterns:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch recurring patterns', details: error.message });
    }
});

// Create recurring shift pattern
app.post('/api/shift-recurring-patterns', async (req, res) => {
    try {
        // Check if req.body exists
        if (!req.body) {
            return res.status(400).json({ 
                success: false, 
                error: 'Request body is missing or invalid',
                details: 'Please ensure Content-Type is application/json'
            });
        }

        const { template_id, employee_id, pattern_type, start_date, end_date, start_time, end_time, notes } = req.body;

        if (!template_id || !employee_id || !pattern_type || !start_date || !end_date || !start_time || !end_time) {
            return res.status(400).json({ 
                success: false, 
                error: 'All fields are required',
                details: 'Missing: ' + [
                    !template_id ? 'template_id' : null,
                    !employee_id ? 'employee_id' : null,
                    !pattern_type ? 'pattern_type' : null,
                    !start_date ? 'start_date' : null,
                    !end_date ? 'end_date' : null,
                    !start_time ? 'start_time' : null,
                    !end_time ? 'end_time' : null
                ].filter(Boolean).join(', ')
            });
        }

        const { rows } = await pool.query(
            'INSERT INTO recurring_shift_patterns (template_id, employee_id, pattern_type, start_date, end_date, start_time, end_time, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [template_id, employee_id, pattern_type, start_date, end_date, start_time, end_time, notes || null]
        );

        const patternResult = await pool.query(`
            SELECT 
                rsp.*,
                st.name as template_name,
                e.name as employee_name
            FROM recurring_shift_patterns rsp
            JOIN shift_templates st ON rsp.template_id = st.id
            JOIN employees e ON rsp.employee_id = e.id
            WHERE rsp.id = $1
        `, [rows[0].id]);

        res.json({ success: true, data: patternResult.rows[0] });
    } catch (error) {
        console.error('Error creating recurring pattern:', error);
        res.status(500).json({ success: false, error: 'Failed to create recurring pattern', details: error.message });
    }
});

// Update recurring shift pattern
app.put('/api/shift-recurring-patterns/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { template_id, employee_id, pattern_type, start_date, end_date, start_time, end_time, is_active, notes } = req.body;

        const { rows } = await pool.query(
            'UPDATE recurring_shift_patterns SET template_id = $1, employee_id = $2, pattern_type = $3, start_date = $4, end_date = $5, start_time = $6, end_time = $7, is_active = $8, notes = $9 WHERE id = $10 RETURNING *',
            [template_id, employee_id, pattern_type, start_date, end_date, start_time, end_time, is_active, notes, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recurring pattern not found' });
        }

        const patternResult = await pool.query(`
            SELECT 
                rsp.*,
                st.name as template_name,
                e.name as employee_name
            FROM recurring_shift_patterns rsp
            JOIN shift_templates st ON rsp.template_id = st.id
            JOIN employees e ON rsp.employee_id = e.id
            WHERE rsp.id = $1
        `, [id]);

        res.json({ success: true, data: patternResult.rows[0] });
    } catch (error) {
        console.error('Error updating recurring pattern:', error);
        res.status(500).json({ success: false, error: 'Failed to update recurring pattern', details: error.message });
    }
});

// Delete recurring shift pattern
app.delete('/api/shift-recurring-patterns/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { rows } = await pool.query(
            'DELETE FROM recurring_shift_patterns WHERE id = $1 RETURNING id',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recurring pattern not found' });
        }

        res.json({ success: true, message: 'Recurring pattern deleted successfully' });
    } catch (error) {
        console.error('Error deleting recurring pattern:', error);
        res.status(500).json({ success: false, error: 'Failed to delete recurring pattern', details: error.message });
    }
});

// Start HTTP server for development
const server = app.listen(PORT, HOST, () => {
    logSuccess(`HTTP Server running on http://${DISPLAY_HOST}:${PORT}`, 'Server');
    logInfo(`Environment: ${isProduction ? 'Production' : 'Development'}`, 'Server');
    logInfo(`Database: ${dbUrl ? 'Remote (SSL)' : 'Local'}`, 'Server');
});

// Start HTTPS server if not on Render
if (isLocalDevelopment) {
    try {
        // Define SSL options for HTTPS server
        const sslOptions = {
            key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
            cert: fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem'))
        };
        
        const httpsServer = https.createServer(sslOptions, app);
        httpsServer.listen(HTTPS_PORT, HOST, () => {
            logSuccess(`HTTPS Server running on https://${DISPLAY_HOST}:${HTTPS_PORT}`, 'Server');
        });
        
        httpsServer.on('error', (err) => {
            logError(err, 'HTTPS Server');
        });
    } catch (error) {
        logError(error, 'HTTPS Server Setup');
    }
}

// Enhanced error handling for HTTP server
server.on('error', (err) => {
    logError(err, 'HTTP Server');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logInfo('SIGTERM received, shutting down gracefully', 'Server');
    server.close(() => {
        logSuccess('HTTP server closed', 'Server');
        pool.end(() => {
            logSuccess('Database pool closed', 'Server');
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    logInfo('SIGINT received, shutting down gracefully', 'Server');
    server.close(() => {
        logSuccess('HTTP server closed', 'Server');
        pool.end(() => {
            logSuccess('Database pool closed', 'Server');
            process.exit(0);
        });
    });
});

// Create benefits tables if they don't exist
app.post('/api/setup-benefits', async (req, res) => {
    try {
        logInfo('Setting up benefits tables...', 'Benefits Setup');
        
        // Read and execute the SQL script
        const sqlScript = fs.readFileSync(path.join(__dirname, '../sql/create_benefits_tables.sql'), 'utf8');
        
        // Split the script into individual statements and execute them
        const statements = sqlScript.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const statement of statements) {
            if (statement.trim()) {
                await pool.query(statement);
            }
        }
        
        logSuccess('Benefits tables setup completed successfully', 'Benefits Setup');
        res.json({ success: true, message: 'Benefits tables created successfully' });
    } catch (error) {
        logError(error, 'Benefits Setup');
        res.status(500).json({ success: false, error: 'Failed to setup benefits tables', details: error.message });
    }
});

// Migration endpoint for adding unit columns to benefits table
app.post('/api/migrate-benefits', async (req, res) => {
    try {
        logInfo('Running benefits table migration...', 'Benefits Migration');
        
        // Read and execute the migration SQL script
        const migrationScript = fs.readFileSync(path.join(__dirname, '../sql/migrate_benefits_table.sql'), 'utf8');
        
        // Split the script into individual statements and execute them
        const statements = migrationScript.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const statement of statements) {
            if (statement.trim()) {
                await pool.query(statement);
            }
        }
        
        logSuccess('Benefits table migration completed successfully', 'Benefits Migration');
        res.json({ success: true, message: 'Benefits table migration completed successfully' });
    } catch (error) {
        logError(error, 'Benefits Migration');
        res.status(500).json({ success: false, error: 'Failed to migrate benefits table', details: error.message });
    }
});

// Get employee deductions
app.get('/api/employees/:id/deductions', async (req, res) => {
    try {
        const { id } = req.params;
        logInfo(`Fetching deductions for employee ID: ${id}`, 'Employee Deductions');
        
        // Check if employee_deductions table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'employee_deductions'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            logWarning('Employee deductions table does not exist, returning empty array', 'Employee Deductions');
            return res.json({ success: true, data: [] });
        }
        
        // Check if deductions table exists
        const deductionsExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'deductions'
            )
        `);
        
        if (!deductionsExists.rows[0].exists) {
            logWarning('Deductions table does not exist, returning empty array', 'Employee Deductions');
            return res.json({ success: true, data: [] });
        }
        
        // Get the actual columns from employee_deductions table
        const employeeDeductionsColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'employee_deductions' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        // Get the actual columns from deductions table
        const deductionsColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'deductions' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        logInfo(`Employee deductions columns: ${employeeDeductionsColumns.rows.map(r => r.column_name).join(', ')}`, 'Employee Deductions');
        logInfo(`Deductions columns: ${deductionsColumns.rows.map(r => r.column_name).join(', ')}`, 'Employee Deductions');
        
        // Check if required columns exist
        const hasEmployeeId = employeeDeductionsColumns.rows.some(r => r.column_name === 'employee_id');
        const hasDeductionId = employeeDeductionsColumns.rows.some(r => r.column_name === 'deduction_id');
        
        if (!hasEmployeeId || !hasDeductionId) {
            logWarning('Required columns (employee_id or deduction_id) do not exist in employee_deductions table, returning empty array', 'Employee Deductions');
            return res.json({ success: true, data: [] });
        }
        
        // Check if deductions table has required columns
        const hasName = deductionsColumns.rows.some(r => r.column_name === 'name');
        const hasType = deductionsColumns.rows.some(r => r.column_name === 'type');
        const hasValue = deductionsColumns.rows.some(r => r.column_name === 'value');
        const hasValueType = deductionsColumns.rows.some(r => r.column_name === 'value_type');
        const hasDescription = deductionsColumns.rows.some(r => r.column_name === 'description');
        
        if (!hasName || !hasType || !hasValue || !hasValueType) {
            logWarning('Required columns do not exist in deductions table, returning empty array', 'Employee Deductions');
            return res.json({ success: true, data: [] });
        }
        
        // Build the query to join employee_deductions with deductions
        const query = `
            SELECT 
                d.name,
                d.type,
                d.value,
                d.value_type,
                ${hasDescription ? 'd.description' : "'' as description"}
            FROM employee_deductions ed
            JOIN deductions d ON ed.deduction_id = d.id
            WHERE ed.employee_id = $1
            ORDER BY d.name
        `;
        
        logInfo(`Executing query for employee ${id}`, 'Employee Deductions');
        const { rows } = await pool.query(query, [id]);
        
        logSuccess(`Found ${rows.length} deductions for employee ${id}`, 'Employee Deductions');
        res.json({ success: true, data: rows });
    } catch (error) {
        logError(error, 'Employee Deductions API');
        res.status(500).json({ success: false, error: 'Failed to fetch employee deductions', details: error.message });
    }
});

// Setup endpoint for creating benefits tables

// Setup endpoint for creating deductions tables
app.post('/api/setup-deductions', async (req, res) => {
    try {
        logInfo('Setting up deductions tables...', 'Deductions Setup');
        
        // Read and execute the SQL script
        const sqlScript = fs.readFileSync(path.join(__dirname, '../sql/create_deductions_tables.sql'), 'utf8');
        
        // Split the script into individual statements and execute them
        const statements = sqlScript.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const statement of statements) {
            if (statement.trim()) {
                await pool.query(statement);
            }
        }
        
        logSuccess('Deductions tables setup completed successfully', 'Deductions Setup');
        res.json({ success: true, message: 'Deductions tables created successfully' });
    } catch (error) {
        logError(error, 'Deductions Setup');
        res.status(500).json({ success: false, error: 'Failed to setup deductions tables', details: error.message });
    }
});

// Get all deductions (for HR management)
app.get('/api/deductions', async (req, res) => {
    try {
        logInfo('Fetching all deductions', 'Deductions API');
        
        // Check if deductions table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'deductions'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            logWarning('Deductions table does not exist, returning empty array', 'Deductions API');
            return res.json({ success: true, data: [] });
        }
        
        // Get the actual columns from deductions table
        const deductionsColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'deductions' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        logInfo(`Deductions columns: ${deductionsColumns.rows.map(r => r.column_name).join(', ')}`, 'Deductions API');
        
        // Build query based on available columns
        const availableColumns = deductionsColumns.rows.map(r => r.column_name);
        const selectColumns = [];
        
        if (availableColumns.includes('id')) selectColumns.push('id');
        if (availableColumns.includes('name')) selectColumns.push('name');
        if (availableColumns.includes('type')) selectColumns.push('type');
        if (availableColumns.includes('value')) selectColumns.push('value');
        if (availableColumns.includes('value_type')) selectColumns.push('value_type');
        if (availableColumns.includes('description')) selectColumns.push('description');
        
        if (selectColumns.length === 0) {
            logWarning('No valid columns found in deductions table', 'Deductions API');
            return res.json({ success: true, data: [] });
        }
        
        const query = `
            SELECT ${selectColumns.join(', ')}
            FROM deductions 
            ORDER BY name
        `;
        
        const { rows } = await pool.query(query);
        logSuccess(`Found ${rows.length} deductions`, 'Deductions API');
        res.json({ success: true, data: rows });
    } catch (error) {
        logError(error, 'Deductions API');
        res.status(500).json({ success: false, error: 'Failed to fetch deductions', details: error.message });
    }
});

// Create new deduction
app.post('/api/deductions', async (req, res) => {
    try {
        const { name, type, value, value_type, description } = req.body;
        logInfo(`Creating new deduction: ${name}`, 'Deductions API');
        
        const query = `
            INSERT INTO deductions (name, type, value, value_type, description)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const { rows } = await pool.query(query, [name, type, value, value_type, description]);
        logSuccess(`Created deduction with ID: ${rows[0].id}`, 'Deductions API');
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        logError(error, 'Deductions API');
        res.status(500).json({ success: false, error: 'Failed to create deduction', details: error.message });
    }
});

// Update deduction
app.put('/api/deductions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, value, value_type, description } = req.body;
        logInfo(`Updating deduction ID: ${id}`, 'Deductions API');
        
        const query = `
            UPDATE deductions 
            SET name = $1, type = $2, value = $3, value_type = $4, description = $5
            WHERE id = $6
            RETURNING *
        `;
        
        const { rows } = await pool.query(query, [name, type, value, value_type, description, id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Deduction not found' });
        }
        
        logSuccess(`Updated deduction ID: ${id}`, 'Deductions API');
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        logError(error, 'Deductions API');
        res.status(500).json({ success: false, error: 'Failed to update deduction', details: error.message });
    }
});

// ========================================
// APPOINTMENT MANAGEMENT API ENDPOINTS
// ========================================

app.get('/api/appointments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
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
            WHERE a.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Appointment not found' });
        }
        
        const appointment = {
            ...result.rows[0],
            service: { name: result.rows[0].service_name || 'Unknown Service' },
            client: { name: result.rows[0].client_name || 'Unknown Client', email: result.rows[0].client_email || '' },
            employee: { name: result.rows[0].employee_name || 'Unknown Employee', username: result.rows[0].employee_name || 'unknown' }
        };
        
        res.json({ success: true, data: appointment });
    } catch (error) {
        console.error('Error fetching appointment:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch appointment', details: error.message });
    }
});

// Get service by ID
app.get('/api/services/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Service not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching service:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch service', details: error.message });
    }
});

// ========================================
// SHIFT TEMPLATES API ENDPOINTS
// ========================================

// Get all shift templates
app.get('/api/shift-templates', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM shift_templates ORDER BY name'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching shift templates:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch shift templates', details: error.message });
    }
});

// Get active shift templates
app.get('/api/shift-templates/active', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM shift_templates WHERE is_active = TRUE ORDER BY name'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching active shift templates:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch active shift templates', details: error.message });
    }
});

// Create new shift template
app.post('/api/shift-templates', async (req, res) => {
    try {
        // Check if req.body exists
        if (!req.body) {
            return res.status(400).json({ 
                success: false, 
                error: 'Request body is missing or invalid',
                details: 'Please ensure Content-Type is application/json'
            });
        }

        const { name, start_time, end_time, description, color } = req.body;
        
        if (!name || !start_time || !end_time) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name, start time, and end time are required',
                details: 'Missing: ' + [
                    !name ? 'name' : null,
                    !start_time ? 'start_time' : null,
                    !end_time ? 'end_time' : null
                ].filter(Boolean).join(', ')
            });
        }

        const { rows } = await pool.query(
            'INSERT INTO shift_templates (name, start_time, end_time, description, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, start_time, end_time, description || null, color || '#007bff']
        );

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error creating shift template:', error);
        res.status(500).json({ success: false, error: 'Failed to create shift template', details: error.message });
    }
});

// Update shift template
app.put('/api/shift-templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, start_time, end_time, description, color, is_active } = req.body;

        const { rows } = await pool.query(
            'UPDATE shift_templates SET name = $1, start_time = $2, end_time = $3, description = $4, color = $5, is_active = $6 WHERE id = $7 RETURNING *',
            [name, start_time, end_time, description, color, is_active, id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Shift template not found' });
        }
        
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error updating shift template:', error);
        res.status(500).json({ success: false, error: 'Failed to update shift template', details: error.message });
    }
});

// Delete shift template
app.delete('/api/shift-templates/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if template is used in any rotations
        const usageCheck = await pool.query(
            'SELECT COUNT(*) as count FROM rotation_shift_assignments WHERE template_id = $1',
            [id]
        );

        if (parseInt(usageCheck.rows[0].count) > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete template that is used in rotations. Remove from rotations first.' 
            });
        }
        
        const { rows } = await pool.query(
            'DELETE FROM shift_templates WHERE id = $1 RETURNING id',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Shift template not found' });
        }

        res.json({ success: true, message: 'Shift template deleted successfully' });
    } catch (error) {
        console.error('Error deleting shift template:', error);
        res.status(500).json({ success: false, error: 'Failed to delete shift template', details: error.message });
    }
});

// ========================================
// SHIFT ROTATIONS API ENDPOINTS
// ========================================

// Get all shift rotations
app.get('/api/shift-rotations', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT 
                r.*,
                COUNT(DISTINCT rsa.position) as total_positions,
                COUNT(DISTINCT rea.employee_id) as total_employees
            FROM shift_rotations r
            LEFT JOIN rotation_shift_assignments rsa ON r.id = rsa.rotation_id
            LEFT JOIN rotation_employee_assignments rea ON r.id = rea.rotation_id
            GROUP BY r.id, r.name, r.description, r.start_date, r.status, r.current_position, r.cycle_duration, r.created_at, r.updated_at
            ORDER BY r.name
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching shift rotations:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch shift rotations', details: error.message });
    }
});

// Get rotation details with templates and employees
app.get('/api/shift-rotations/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get rotation basic info
        const rotationResult = await pool.query(
            'SELECT * FROM shift_rotations WHERE id = $1',
            [id]
        );

        if (rotationResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Rotation not found' });
        }

        // Get rotation templates with positions
        const templatesResult = await pool.query(`
            SELECT 
                rsa.position,
                st.id as template_id,
                st.name as template_name,
                st.start_time,
                st.end_time,
                st.color
            FROM rotation_shift_assignments rsa
            JOIN shift_templates st ON rsa.template_id = st.id
            WHERE rsa.rotation_id = $1
            ORDER BY rsa.position
        `, [id]);

        // Get rotation employees by position
        const employeesResult = await pool.query(`
            SELECT 
                rea.position,
                e.id as employee_id,
                e.name as employee_name,
                e.email
            FROM rotation_employee_assignments rea
            JOIN employees e ON rea.employee_id = e.id
            WHERE rea.rotation_id = $1
            ORDER BY rea.position, e.name
        `, [id]);

        res.json({
            success: true,
            data: {
                rotation: rotationResult.rows[0],
                templates: templatesResult.rows,
                employees: employeesResult.rows
            }
        });
    } catch (error) {
        console.error('Error fetching rotation details:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch rotation details', details: error.message });
    }
});

// Create new shift rotation
app.post('/api/shift-rotations', async (req, res) => {
    try {
        // Check if req.body exists
        if (!req.body) {
            return res.status(400).json({ 
                success: false, 
                error: 'Request body is missing or invalid',
                details: 'Please ensure Content-Type is application/json'
            });
        }

        const { name, description, start_date, cycle_duration } = req.body;

        if (!name || !start_date) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name and start date are required',
                details: 'Missing: ' + [
                    !name ? 'name' : null,
                    !start_date ? 'start_date' : null
                ].filter(Boolean).join(', ')
            });
        }
        
        const { rows } = await pool.query(
            'INSERT INTO shift_rotations (name, description, start_date, cycle_duration) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description || null, start_date, cycle_duration || 1]
        );

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error creating shift rotation:', error);
        res.status(500).json({ success: false, error: 'Failed to create shift rotation', details: error.message });
    }
});

// Update shift rotation
app.put('/api/shift-rotations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, start_date, cycle_duration, status, current_position } = req.body;

        const { rows } = await pool.query(
            'UPDATE shift_rotations SET name = $1, description = $2, start_date = $3, cycle_duration = $4, status = $5, current_position = $6 WHERE id = $7 RETURNING *',
            [name, description, start_date, cycle_duration, status, current_position, id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Rotation not found' });
        }
        
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error updating shift rotation:', error);
        res.status(500).json({ success: false, error: 'Failed to update shift rotation', details: error.message });
    }
});

// Delete shift rotation
app.delete('/api/shift-rotations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { rows } = await pool.query(
            'DELETE FROM shift_rotations WHERE id = $1 RETURNING id',
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Rotation not found' });
        }
        
        res.json({ success: true, message: 'Rotation deleted successfully' });
    } catch (error) {
        console.error('Error deleting shift rotation:', error);
        res.status(500).json({ success: false, error: 'Failed to delete shift rotation', details: error.message });
    }
});

// ========================================
// SHIFT ASSIGNMENTS API ENDPOINTS
// ========================================

// Utility function to check if a column exists in a table
async function columnExists(tableName, columnName) {
    try {
        const result = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = $1 
                AND column_name = $2
            )
        `, [tableName, columnName]);
        return result.rows[0].exists;
    } catch (error) {
        console.error(`Error checking if column ${columnName} exists in ${tableName}:`, error);
        return false;
    }
}

// Utility function to get available columns for a table
async function getTableColumns(tableName) {
    try {
        const result = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1
            ORDER BY ordinal_position
        `, [tableName]);
        return result.rows.map(row => row.column_name);
    } catch (error) {
        console.error(`Error getting columns for table ${tableName}:`, error);
        return [];
    }
}

// ========================================
// BENEFITS MANAGEMENT API ENDPOINTS
// ========================================

// Get all benefits (for HR management)
app.get('/api/benefits', async (req, res) => {
    try {
        logInfo('Fetching all benefits', 'Benefits API');
        
        // Check if benefits table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'benefits'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            logWarning('Benefits table does not exist, returning empty array', 'Benefits API');
            return res.json({ success: true, data: [] });
        }
        
        // Get the actual columns from benefits table
        const benefitsColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'benefits' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        logInfo(`Benefits columns: ${benefitsColumns.rows.map(r => r.column_name).join(', ')}`, 'Benefits API');
        
        // Build query based on available columns
        const availableColumns = benefitsColumns.rows.map(r => r.column_name);
        const selectColumns = [];
        
        if (availableColumns.includes('id')) selectColumns.push('id');
        if (availableColumns.includes('name')) selectColumns.push('name');
        if (availableColumns.includes('type')) selectColumns.push('type');
        if (availableColumns.includes('value')) selectColumns.push('value');
        if (availableColumns.includes('unit')) selectColumns.push('unit');
        if (availableColumns.includes('description')) selectColumns.push('description');
        if (availableColumns.includes('benefit_level')) selectColumns.push('benefit_level');
        
        if (selectColumns.length === 0) {
            logWarning('No valid columns found in benefits table', 'Benefits API');
            return res.json({ success: true, data: [] });
        }
        
        const query = `
            SELECT ${selectColumns.join(', ')}
            FROM benefits 
            ORDER BY name
        `;
        
        const { rows } = await pool.query(query);
        logSuccess(`Found ${rows.length} benefits`, 'Benefits API');
        res.json({ success: true, data: rows });
    } catch (error) {
        logError(error, 'Benefits API');
        res.status(500).json({ success: false, error: 'Failed to fetch benefits', details: error.message });
    }
});

// Create new benefit
app.post('/api/benefits', async (req, res) => {
    try {
        const { name, type, value, unit, description, benefit_level } = req.body;
        logInfo(`Creating new benefit: ${name}`, 'Benefits API');
        
        const query = `
            INSERT INTO benefits (name, type, value, unit, description, benefit_level)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        
        const { rows } = await pool.query(query, [name, type, value, unit, description, benefit_level]);
        logSuccess(`Created benefit with ID: ${rows[0].id}`, 'Benefits API');
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        logError(error, 'Benefits API');
        res.status(500).json({ success: false, error: 'Failed to create benefit', details: error.message });
    }
});

// Update benefit
app.put('/api/benefits/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, value, unit, description, benefit_level } = req.body;
        logInfo(`Updating benefit ID: ${id}`, 'Benefits API');
        
        const query = `
            UPDATE benefits 
            SET name = $1, type = $2, value = $3, unit = $4, description = $5, benefit_level = $6
            WHERE id = $7
            RETURNING *
        `;
        
        const { rows } = await pool.query(query, [name, type, value, unit, description, benefit_level, id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Benefit not found' });
        }
        
        logSuccess(`Updated benefit ID: ${id}`, 'Benefits API');
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        logError(error, 'Benefits API');
        res.status(500).json({ success: false, error: 'Failed to update benefit', details: error.message });
    }
});

// Delete benefit
app.delete('/api/benefits/:id', async (req, res) => {
    try {
        const { id } = req.params;
        logInfo(`Deleting benefit ID: ${id}`, 'Benefits API');
        
        const { rows } = await pool.query('DELETE FROM benefits WHERE id = $1 RETURNING id', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Benefit not found' });
        }
        
        logSuccess(`Deleted benefit ID: ${id}`, 'Benefits API');
        res.json({ success: true, message: 'Benefit deleted successfully' });
    } catch (error) {
        logError(error, 'Benefits API');
        res.status(500).json({ success: false, error: 'Failed to delete benefit', details: error.message });
    }
});

// Get benefit by ID
app.get('/api/benefits/:id', async (req, res) => {
    try {
        const { id } = req.params;
        logInfo(`Fetching benefit ID: ${id}`, 'Benefits API');
        
        const { rows } = await pool.query('SELECT * FROM benefits WHERE id = $1', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Benefit not found' });
        }
        
        logSuccess(`Found benefit ID: ${id}`, 'Benefits API');
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        logError(error, 'Benefits API');
        res.status(500).json({ success: false, error: 'Failed to fetch benefit', details: error.message });
    }
});

// ========================================
// ASSETS MANAGEMENT API ENDPOINTS
// ========================================

// Get all assets
app.get('/api/assets', async (req, res) => {
    try {
        logInfo('Fetching all assets', 'Assets API');
        
        // Check if assets table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'assets'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            logWarning('Assets table does not exist, returning empty array', 'Assets API');
            return res.json({ success: true, data: [] });
        }
        
        // Get the actual columns from assets table
        const assetsColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'assets' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        logInfo(`Assets columns: ${assetsColumns.rows.map(r => r.column_name).join(', ')}`, 'Assets API');
        
        // Build query based on available columns
        const availableColumns = assetsColumns.rows.map(r => r.column_name);
        const selectColumns = [];
        
        if (availableColumns.includes('id')) selectColumns.push('a.id');
        if (availableColumns.includes('name')) selectColumns.push('a.name');
        if (availableColumns.includes('asset_type')) selectColumns.push('a.asset_type');
        if (availableColumns.includes('description')) selectColumns.push('a.description');
        if (availableColumns.includes('serial_number')) selectColumns.push('a.serial_number');
        if (availableColumns.includes('purchase_date')) selectColumns.push('a.purchase_date');
        if (availableColumns.includes('purchase_price')) selectColumns.push('a.purchase_price');
        if (availableColumns.includes('current_value')) selectColumns.push('a.current_value');
        if (availableColumns.includes('location')) selectColumns.push('a.location');
        if (availableColumns.includes('status')) selectColumns.push('a.status');
        if (availableColumns.includes('assigned_to')) selectColumns.push('a.assigned_to');
        if (availableColumns.includes('department')) selectColumns.push('a.department');
        if (availableColumns.includes('manufacturer')) selectColumns.push('a.manufacturer');
        if (availableColumns.includes('model')) selectColumns.push('a.model');
        if (availableColumns.includes('warranty_expiry')) selectColumns.push('a.warranty_expiry');
        if (availableColumns.includes('maintenance_schedule')) selectColumns.push('a.maintenance_schedule');
        if (availableColumns.includes('last_maintenance_date')) selectColumns.push('a.last_maintenance_date');
        if (availableColumns.includes('next_maintenance_date')) selectColumns.push('a.next_maintenance_date');
        if (availableColumns.includes('created_at')) selectColumns.push('a.created_at');
        if (availableColumns.includes('updated_at')) selectColumns.push('a.updated_at');
        
        if (selectColumns.length === 0) {
            logWarning('No valid columns found in assets table', 'Assets API');
            return res.json({ success: true, data: [] });
        }
        
        // Check if created_at column exists for ordering
        const hasCreatedAt = availableColumns.includes('created_at');
        const orderBy = hasCreatedAt ? 'ORDER BY a.created_at DESC' : 'ORDER BY a.id DESC';
        
        const query = `
            SELECT 
                ${selectColumns.join(', ')},
                e.name as assigned_employee_name,
                e.email as assigned_employee_email
            FROM assets a
            LEFT JOIN employees e ON a.assigned_to = e.id
            ${orderBy}
        `;
        
        const { rows } = await pool.query(query);
        logSuccess(`Found ${rows.length} assets`, 'Assets API');
        res.json({ success: true, data: rows });
    } catch (error) {
        logError(error, 'Assets API');
        res.status(500).json({ success: false, error: 'Failed to fetch assets', details: error.message });
    }
});

// Get asset by ID
app.get('/api/assets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        logInfo(`Fetching asset ID: ${id}`, 'Assets API');
        
        const result = await pool.query(`
            SELECT 
                a.*,
                e.name as assigned_employee_name,
                e.email as assigned_employee_email
            FROM assets a
            LEFT JOIN employees e ON a.assigned_to = e.id
            WHERE a.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Asset not found' });
        }
        
        logSuccess(`Found asset ID: ${id}`, 'Assets API');
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        logError(error, 'Assets API');
        res.status(500).json({ success: false, error: 'Failed to fetch asset', details: error.message });
    }
});

// Create new asset
app.post('/api/assets', async (req, res) => {
    try {
        const { 
            name, asset_type, description, serial_number, purchase_date, purchase_price, 
            current_value, location, status, assigned_to, department, manufacturer, 
            model, warranty_expiry, maintenance_schedule, last_maintenance_date, 
            next_maintenance_date 
        } = req.body;
        
        logInfo(`Creating new asset: ${name}`, 'Assets API');
        
        // Validate required fields
        if (!name || !asset_type) {
            return res.status(400).json({ 
                success: false, 
                error: 'Asset name and type are required',
                details: 'Missing: ' + [
                    !name ? 'name' : null,
                    !asset_type ? 'asset_type' : null
                ].filter(Boolean).join(', ')
            });
        }
        
        const query = `
            INSERT INTO assets (
                name, asset_type, description, serial_number, purchase_date, purchase_price,
                current_value, location, status, assigned_to, department, manufacturer,
                model, warranty_expiry, maintenance_schedule, last_maintenance_date, next_maintenance_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
        `;
        
        const values = [
            name, asset_type, description || null, serial_number || null, purchase_date || null,
            purchase_price || null, current_value || null, location || null, status || 'active',
            assigned_to || null, department || null, manufacturer || null, model || null,
            warranty_expiry || null, maintenance_schedule || null, last_maintenance_date || null,
            next_maintenance_date || null
        ];
        
        const { rows } = await pool.query(query, values);
        logSuccess(`Created asset with ID: ${rows[0].id}`, 'Assets API');
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        logError(error, 'Assets API');
        res.status(500).json({ success: false, error: 'Failed to create asset', details: error.message });
    }
});

// Update asset
app.put('/api/assets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, asset_type, description, serial_number, purchase_date, purchase_price, 
            current_value, location, status, assigned_to, department, manufacturer, 
            model, warranty_expiry, maintenance_schedule, last_maintenance_date, 
            next_maintenance_date 
        } = req.body;
        
        logInfo(`Updating asset ID: ${id}`, 'Assets API');
        
        // Validate required fields
        if (!name || !asset_type) {
            return res.status(400).json({ 
                success: false, 
                error: 'Asset name and type are required',
                details: 'Missing: ' + [
                    !name ? 'name' : null,
                    !asset_type ? 'asset_type' : null
                ].filter(Boolean).join(', ')
            });
        }
        
        const query = `
            UPDATE assets SET 
                name = $1, asset_type = $2, description = $3, serial_number = $4, 
                purchase_date = $5, purchase_price = $6, current_value = $7, location = $8,
                status = $9, assigned_to = $10, department = $11, manufacturer = $12,
                model = $13, warranty_expiry = $14, maintenance_schedule = $15, 
                last_maintenance_date = $16, next_maintenance_date = $17
            WHERE id = $18
            RETURNING *
        `;
        
        const values = [
            name, asset_type, description || null, serial_number || null, purchase_date || null,
            purchase_price || null, current_value || null, location || null, status || 'active',
            assigned_to || null, department || null, manufacturer || null, model || null,
            warranty_expiry || null, maintenance_schedule || null, last_maintenance_date || null,
            next_maintenance_date || null, id
        ];
        
        const { rows } = await pool.query(query, values);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Asset not found' });
        }
        
        logSuccess(`Updated asset ID: ${id}`, 'Assets API');
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        logError(error, 'Assets API');
        res.status(500).json({ success: false, error: 'Failed to update asset', details: error.message });
    }
});

// Delete asset
app.delete('/api/assets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        logInfo(`Deleting asset ID: ${id}`, 'Assets API');
        
        const { rows } = await pool.query('DELETE FROM assets WHERE id = $1 RETURNING id', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Asset not found' });
        }
        
        logSuccess(`Deleted asset ID: ${id}`, 'Assets API');
        res.json({ success: true, message: 'Asset deleted successfully' });
    } catch (error) {
        logError(error, 'Assets API');
        res.status(500).json({ success: false, error: 'Failed to delete asset', details: error.message });
    }
});

// ========================================
// RECRUITMENT API ENDPOINTS
// ========================================

// Get all recruits
app.get('/api/recruits', async (req, res) => {
    try {
        logInfo('Fetching all recruits', 'Recruitment API');
        
        // Check if recruits table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'recruits'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            logWarning('Recruits table does not exist, creating it', 'Recruitment API');
            
            // Create the recruits table
            await pool.query(`
                CREATE TABLE IF NOT EXISTS recruits (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    qualifications TEXT,
                    status VARCHAR(50) DEFAULT 'applying',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            logSuccess('Created recruits table', 'Recruitment API');
        }
        
        const { rows } = await pool.query('SELECT * FROM recruits ORDER BY created_at DESC');
        logSuccess(`Found ${rows.length} recruits`, 'Recruitment API');
        res.json({ success: true, data: rows });
    } catch (error) {
        logError(error, 'Recruitment API');
        res.status(500).json({ success: false, error: 'Failed to fetch recruits', details: error.message });
    }
});

// Create new recruit
app.post('/api/recruits', async (req, res) => {
    try {
        const { name, qualifications } = req.body;
        
        logInfo(`Creating new recruit: ${name}`, 'Recruitment API');
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Recruit name is required'
            });
        }
        
        // Check if recruits table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'recruits'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            // Create the recruits table
            await pool.query(`
                CREATE TABLE IF NOT EXISTS recruits (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    qualifications TEXT,
                    status VARCHAR(50) DEFAULT 'applying',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        }
        
        const query = `
            INSERT INTO recruits (name, qualifications, status)
            VALUES ($1, $2, 'applying')
            RETURNING *
        `;
        
        const values = [name, qualifications || null];
        
        const { rows } = await pool.query(query, values);
        logSuccess(`Created recruit with ID: ${rows[0].id}`, 'Recruitment API');
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        logError(error, 'Recruitment API');
        res.status(500).json({ success: false, error: 'Failed to create recruit', details: error.message });
    }
});

// Hire recruit (update status and optionally create employee)
app.post('/api/recruits/:id/hire', async (req, res) => {
    try {
        const { id } = req.params;
        logInfo(`Hiring recruit ID: ${id}`, 'Recruitment API');
        
        // First, get the recruit details
        const recruitResult = await pool.query('SELECT * FROM recruits WHERE id = $1', [id]);
        
        if (recruitResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recruit not found' });
        }
        
        const recruit = recruitResult.rows[0];
        
        // Update recruit status to hired
        await pool.query('UPDATE recruits SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['hired', id]);
        
        // Optionally create an employee record
        try {
            const employeeQuery = `
                INSERT INTO employees (name, email, role, status, hire_date)
                VALUES ($1, $2, $3, $4, CURRENT_DATE)
                RETURNING id
            `;
            
            const employeeEmail = `${recruit.name.toLowerCase().replace(/\s+/g, '.')}@company.com`;
            const employeeValues = [recruit.name, employeeEmail, 'New Hire', 'active'];
            
            const employeeResult = await pool.query(employeeQuery, employeeValues);
            logSuccess(`Created employee with ID: ${employeeResult.rows[0].id}`, 'Recruitment API');
        } catch (employeeError) {
            logWarning(`Failed to create employee record: ${employeeError.message}`, 'Recruitment API');
            // Continue anyway - the recruit is still marked as hired
        }
        
        logSuccess(`Hired recruit ID: ${id}`, 'Recruitment API');
        res.json({ success: true, message: 'Recruit hired successfully' });
    } catch (error) {
        logError(error, 'Recruitment API');
        res.status(500).json({ success: false, error: 'Failed to hire recruit', details: error.message });
    }
});

// Update recruit
app.put('/api/recruits/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, qualifications, status } = req.body;
        
        logInfo(`Updating recruit ID: ${id}`, 'Recruitment API');
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Recruit name is required'
            });
        }
        
        const query = `
            UPDATE recruits SET 
                name = $1, qualifications = $2, status = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `;
        
        const values = [name, qualifications || null, status || 'applying', id];
        
        const { rows } = await pool.query(query, values);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recruit not found' });
        }
        
        logSuccess(`Updated recruit ID: ${id}`, 'Recruitment API');
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        logError(error, 'Recruitment API');
        res.status(500).json({ success: false, error: 'Failed to update recruit', details: error.message });
    }
});

// Delete recruit
app.delete('/api/recruits/:id', async (req, res) => {
    try {
        const { id } = req.params;
        logInfo(`Deleting recruit ID: ${id}`, 'Recruitment API');
        
        const { rows } = await pool.query('DELETE FROM recruits WHERE id = $1 RETURNING id', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recruit not found' });
        }
        
        logSuccess(`Deleted recruit ID: ${id}`, 'Recruitment API');
        res.json({ success: true, message: 'Recruit deleted successfully' });
    } catch (error) {
        logError(error, 'Recruitment API');
        res.status(500).json({ success: false, error: 'Failed to delete recruit', details: error.message });
    }
});

// ========================================
// ORGANIZATIONAL CHART API ENDPOINTS
// ========================================

// Get organizational chart data (employees with hierarchy)
app.get('/api/org-chart', async (req, res) => {
    try {
        logInfo('Fetching organizational chart data', 'Org Chart API');
        
        // Check if employees table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'employees'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            logWarning('Employees table does not exist, returning empty array', 'Org Chart API');
            return res.json({ success: true, data: [] });
        }
        
        // Get the actual columns from employees table
        const employeesColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'employees' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        logInfo(`Employees columns: ${employeesColumns.rows.map(r => r.column_name).join(', ')}`, 'Org Chart API');
        
        // Build query based on available columns
        const availableColumns = employeesColumns.rows.map(r => r.column_name);
        const selectColumns = [];
        
        // Always include essential columns
        if (availableColumns.includes('id')) selectColumns.push('e.id');
        if (availableColumns.includes('name')) selectColumns.push('e.name');
        if (availableColumns.includes('email')) selectColumns.push('e.email');
        if (availableColumns.includes('phone')) selectColumns.push('e.phone');
        if (availableColumns.includes('role')) selectColumns.push('e.role');
        if (availableColumns.includes('department')) selectColumns.push('e.department');
        if (availableColumns.includes('status')) selectColumns.push('e.status');
        if (availableColumns.includes('supervisor_id')) selectColumns.push('e.supervisor_id');
        
        // Optional columns
        if (availableColumns.includes('hire_date')) selectColumns.push('e.hire_date');
        if (availableColumns.includes('created_at')) selectColumns.push('e.created_at');
        if (availableColumns.includes('updated_at')) selectColumns.push('e.updated_at');
        
        if (selectColumns.length === 0) {
            logWarning('No valid columns found in employees table', 'Org Chart API');
            return res.json({ success: true, data: [] });
        }
        
        // Build the query with available columns
        const query = `
            SELECT 
                ${selectColumns.join(', ')},
                s.name as supervisor_name
            FROM employees e
            LEFT JOIN employees s ON e.supervisor_id = s.id
            ORDER BY e.department, e.name
        `;
        
        const { rows } = await pool.query(query);
        logSuccess(`Found ${rows.length} employees for org chart`, 'Org Chart API');
        res.json({ success: true, data: rows });
    } catch (error) {
        logError(error, 'Org Chart API');
        res.status(500).json({ success: false, error: 'Failed to fetch organizational chart data', details: error.message });
    }
});

// Update employee supervisor
app.post('/api/UpdateEmployeeSupervisor', async (req, res) => {
    try {
        const { employee_id, supervisor_id } = req.body;
        
        logInfo(`Updating supervisor for employee ID: ${employee_id} to supervisor ID: ${supervisor_id}`, 'Org Chart API');
        
        // Validate required fields
        if (!employee_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Employee ID is required'
            });
        }
        
        // Check if employee exists
        const employeeCheck = await pool.query('SELECT id FROM employees WHERE id = $1', [employee_id]);
        if (employeeCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }
        
        // If supervisor_id is provided, check if supervisor exists
        if (supervisor_id) {
            const supervisorCheck = await pool.query('SELECT id FROM employees WHERE id = $1', [supervisor_id]);
            if (supervisorCheck.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Supervisor not found' });
            }
            
            // Prevent circular reference (employee cannot be their own supervisor)
            if (employee_id === supervisor_id) {
                return res.status(400).json({ success: false, error: 'Employee cannot be their own supervisor' });
            }
            
            // Check for circular reference in hierarchy
            const circularCheck = await pool.query(`
                WITH RECURSIVE hierarchy AS (
                    SELECT id, supervisor_id, 1 as level
                    FROM employees
                    WHERE id = $1
                    UNION ALL
                    SELECT e.id, e.supervisor_id, h.level + 1
                    FROM employees e
                    INNER JOIN hierarchy h ON e.id = h.supervisor_id
                    WHERE h.level < 10
                )
                SELECT COUNT(*) as count
                FROM hierarchy
                WHERE id = $2
            `, [supervisor_id, employee_id]);
            
            if (circularCheck.rows[0].count > 0) {
                return res.status(400).json({ success: false, error: 'Circular reference detected in hierarchy' });
            }
        }
        
        // Update the employee's supervisor
        const query = `
            UPDATE employees 
            SET supervisor_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, name, supervisor_id
        `;
        
        const values = [supervisor_id || null, employee_id];
        const { rows } = await pool.query(query, values);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }
        
        logSuccess(`Updated supervisor for employee ID: ${employee_id}`, 'Org Chart API');
        res.json({ 
            success: true, 
            message: 'Supervisor updated successfully',
            data: rows[0]
        });
    } catch (error) {
        logError(error, 'Org Chart API');
        res.status(500).json({ success: false, error: 'Failed to update supervisor', details: error.message });
    }
});

// Get employee hierarchy (for debugging)
app.get('/api/org-chart/hierarchy/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        logInfo(`Fetching hierarchy for employee ID: ${employeeId}`, 'Org Chart API');
        
        // Get the employee's hierarchy using recursive CTE
        const query = `
            WITH RECURSIVE hierarchy AS (
                SELECT 
                    id, name, email, role, department, status, supervisor_id,
                    0 as level,
                    ARRAY[id] as path
                FROM employees
                WHERE id = $1
                
                UNION ALL
                
                SELECT 
                    e.id, e.name, e.email, e.role, e.department, e.status, e.supervisor_id,
                    h.level + 1,
                    h.path || e.id
                FROM employees e
                INNER JOIN hierarchy h ON e.supervisor_id = h.id
                WHERE h.level < 10
            )
            SELECT * FROM hierarchy
            ORDER BY level, name
        `;
        
        const { rows } = await pool.query(query, [employeeId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }
        
        logSuccess(`Found hierarchy with ${rows.length} levels for employee ID: ${employeeId}`, 'Org Chart API');
        res.json({ success: true, data: rows });
    } catch (error) {
        logError(error, 'Org Chart API');
        res.status(500).json({ success: false, error: 'Failed to fetch hierarchy', details: error.message });
    }
});

// --- VENDORS API ---

// Ensure vendors table exists
async function ensureVendorsTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS vendors (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            contact_name VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(50),
            address VARCHAR(255),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// Get all vendors
app.get('/api/vendors', async (req, res) => {
    try {
        await ensureVendorsTable();
        const { rows } = await pool.query('SELECT * FROM vendors ORDER BY name');
        res.json({ success: true, data: rows });
    } catch (error) {
        logError(error, 'Vendors API');
        res.status(500).json({ success: false, error: 'Failed to fetch vendors', details: error.message });
    }
});

// Get a single vendor
app.get('/api/vendors/:id', async (req, res) => {
    try {
        await ensureVendorsTable();
        const { id } = req.params;
        const { rows } = await pool.query('SELECT * FROM vendors WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, error: 'Vendor not found' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        logError(error, 'Vendors API');
        res.status(500).json({ success: false, error: 'Failed to fetch vendor', details: error.message });
    }
});

// Create a vendor
app.post('/api/vendors', async (req, res) => {
    try {
        await ensureVendorsTable();
        const { name, contact_name, email, phone, address, notes } = req.body;
        const { rows } = await pool.query(
            `INSERT INTO vendors (name, contact_name, email, phone, address, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [name, contact_name, email, phone, address, notes]
        );
        res.json({ success: true, data: rows[0], message: 'Vendor created' });
    } catch (error) {
        logError(error, 'Vendors API');
        res.status(500).json({ success: false, error: 'Failed to create vendor', details: error.message });
    }
});

// Update a vendor
app.put('/api/vendors/:id', async (req, res) => {
    try {
        await ensureVendorsTable();
        const { id } = req.params;
        const { name, contact_name, email, phone, address, notes } = req.body;
        const { rowCount, rows } = await pool.query(
            `UPDATE vendors SET name=$1, contact_name=$2, email=$3, phone=$4, address=$5, notes=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
            [name, contact_name, email, phone, address, notes, id]
        );
        if (rowCount === 0) return res.status(404).json({ success: false, error: 'Vendor not found' });
        res.json({ success: true, data: rows[0], message: 'Vendor updated' });
    } catch (error) {
        logError(error, 'Vendors API');
        res.status(500).json({ success: false, error: 'Failed to update vendor', details: error.message });
    }
});

// Delete a vendor
app.delete('/api/vendors/:id', async (req, res) => {
    try {
        await ensureVendorsTable();
        const { id } = req.params;
        const { rowCount } = await pool.query('DELETE FROM vendors WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ success: false, error: 'Vendor not found' });
        res.json({ success: true, message: 'Vendor deleted' });
    } catch (error) {
        logError(error, 'Vendors API');
        res.status(500).json({ success: false, error: 'Failed to delete vendor', details: error.message });
    }
});
// --- END VENDORS API ---

// Get tasks for a specific project
app.get('/api/projects/:id/tasks', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if tasks table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'tasks'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            logInfo('tasks table does not exist, returning empty array', 'Projects API');
            return res.json({ success: true, data: [] });
        }
        
        const { rows } = await pool.query(`
            SELECT t.*, e.name as assigned_employee_name, tm.name as team_name
            FROM tasks t
            LEFT JOIN employees e ON t.assigned_to = e.id
            LEFT JOIN teams tm ON t.assigned_team_id = tm.team_id
            WHERE t.project_id = $1
            ORDER BY t.created_at DESC
        `, [id]);
        res.json({ success: true, data: rows });
    } catch (error) {
        logError(error, 'Projects API');
        res.status(500).json({ success: false, error: 'Failed to fetch project tasks', details: error.message });
    }
});

// Get teams for a specific project
app.get('/api/projects/:id/teams', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if required tables exist
        const tablesExist = await pool.query(`
            SELECT 
                EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams') as teams_exists,
                EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_teams') as project_teams_exists
        `);
        
        if (!tablesExist.rows[0].teams_exists || !tablesExist.rows[0].project_teams_exists) {
            logInfo('teams or project_teams table does not exist, returning empty array', 'Projects API');
            return res.json({ success: true, data: [] });
        }
        
        const { rows } = await pool.query(`
            SELECT t.*, pt.project_id
            FROM teams t
            JOIN project_teams pt ON t.team_id = pt.team_id
            WHERE pt.project_id = $1
            ORDER BY t.name
        `, [id]);
        res.json({ success: true, data: rows });
    } catch (error) {
        logError(error, 'Projects API');
        res.status(500).json({ success: false, error: 'Failed to fetch project teams', details: error.message });
    }
});

// Get resource assignments for a specific project
app.get('/api/projects/:id/resource-assignments', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if project_resource_assignments table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'project_resource_assignments'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            logInfo('project_resource_assignments table does not exist, returning empty array', 'Projects API');
            return res.json({ success: true, data: [] });
        }
        
        const { rows } = await pool.query(`
            SELECT pra.*, 
                   CASE 
                       WHEN pra.resource_type = 'asset' THEN a.name
                       WHEN pra.resource_type = 'facility' THEN f.name
                       ELSE pr.name
                   END as resource_name
            FROM project_resource_assignments pra
            LEFT JOIN assets a ON pra.resource_type = 'asset' AND pra.resource_id = a.id
            LEFT JOIN facilities f ON pra.resource_type = 'facility' AND pra.resource_id = f.facility_id
            LEFT JOIN project_resources pr ON pra.resource_type = 'equipment' AND pra.resource_id = pr.resource_id
            WHERE pra.project_id = $1
            ORDER BY pra.assigned_at DESC
        `, [id]);
        res.json({ success: true, data: rows });
    } catch (error) {
        logError(error, 'Projects API');
        res.status(500).json({ success: false, error: 'Failed to fetch project resource assignments', details: error.message });
    }
});

// Get comments for a specific project (from task comments)
app.get('/api/projects/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if required tables exist
        const tablesExist = await pool.query(`
            SELECT 
                EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_comments') as task_comments_exists,
                EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') as tasks_exists,
                EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') as employees_exists
        `);
        
        if (!tablesExist.rows[0].task_comments_exists || !tablesExist.rows[0].tasks_exists || !tablesExist.rows[0].employees_exists) {
            logInfo('task_comments, tasks, or employees table does not exist, returning empty array', 'Projects API');
            return res.json({ success: true, data: [] });
        }
        
        const { rows } = await pool.query(`
            SELECT tc.*, e.name as author_name, t.title as task_title
            FROM task_comments tc
            JOIN tasks t ON tc.task_id = t.task_id
            JOIN employees e ON tc.author_id = e.id
            WHERE t.project_id = $1
            ORDER BY tc.created_at DESC
        `, [id]);
        res.json({ success: true, data: rows });
    } catch (error) {
        logError(error, 'Projects API');
        res.status(500).json({ success: false, error: 'Failed to fetch project comments', details: error.message });
    }
});

// Get all teams
app.get('/api/teams', async (req, res) => {
    try {
        // Check if teams table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'teams'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            logInfo('teams table does not exist, returning empty array', 'Teams API');
            return res.json({ success: true, data: [] });
        }
        
        const { rows } = await pool.query('SELECT * FROM teams ORDER BY name');
        res.json({ success: true, data: rows });
    } catch (error) {
        logError(error, 'Teams API');
        res.status(500).json({ success: false, error: 'Failed to fetch teams', details: error.message });
    }
});

// Get a single team
app.get('/api/teams/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if teams table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'teams'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            logInfo('teams table does not exist, returning 404', 'Teams API');
            return res.status(404).json({ success: false, error: 'Team not found' });
        }
        
        const { rows } = await pool.query('SELECT * FROM teams WHERE team_id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, error: 'Team not found' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        logError(error, 'Teams API');
        res.status(500).json({ success: false, error: 'Failed to fetch team', details: error.message });
    }
});

module.exports = app;
