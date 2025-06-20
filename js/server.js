//Variables 
const dotenv = require('dotenv');dotenv.config(); 
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
const app = express();
const router = express.Router();
const PORT = process.env.PORT || 3030;
const isProduction = process.env.NODE_ENV === 'production';
const HOST = '0.0.0.0'; // Listen on all interfaces
const DISPLAY_HOST = '192.168.4.106'; // Your IP address for display
const DOMAIN = process.env.DOMAIN || (isProduction ? 'shopy.onrender.com' : 'localhost');
const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {rejectUnauthorized: false},
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
app.get('/api/services', async (req, res) => {try{ 
  const result = await pool.query('SELECT * FROM services ORDER BY name'); res.json(result.rows); } 
catch (error) { handleError(res, error, 'Check console'); }
});
app.get('/api/photos', async (req, res) => {
    try { 
        const result = await pool.query('SELECT * FROM photos'); 
        res.json(result.rows); 
    } 
    catch (error) { 
        handleError(res, error, 'Failed to fetch photos', true); 
    }
});
app.get('/api/photos/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const result = await pool.query('SELECT * FROM photos WHERE product_id = $1', [productId]);
        res.json(result.rows);
    }
    catch (error) {
        handleError(res, error, 'Failed to fetch product photos', true);
    }
});
app.post('/api/uploadproductphotos', async (req, res) => {try{ 
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
        'INSERT INTO photos (product_id, url, filename) VALUES ($1, $2, $3) RETURNING *',
        [photo.product_id, photo.url, photo.filename]
    );
      results.push(result.rows[0]);
    }
    
    await client.query('COMMIT');
    res.status(201).json({ success: true, photos: results });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error uploading photos:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload photos',
      details: error.message
    });
  } finally {
    client.release();
  }
} catch (error) {
  console.error('Error in upload endpoint:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Server error',
    details: error.message
  });
}});
app.post('/api/services', async (req, res) => {try{ 
  const result = await pool.query('INSERT INTO services (name, description, price, duration) VALUES ($1, $2, $3, $4) RETURNING *', [req.body.name, req.body.description, req.body.price, req.body.duration]); res.status(201).json(result.rows[0]); } 
catch (error) { handleError(res, error, 'Check console', true); }
});
app.put('/api/services/:id', async (req, res) => {try{ 
  const result = await pool.query('UPDATE services SET name = $1, description = $2, price = $3, duration = $4 WHERE id = $5 RETURNING *', [req.body.name, req.body.description, req.body.price, req.body.duration, req.params.id]); res.json(result.rows[0]); } 
catch (error) { handleError(res, error, 'Check console'); }
});
app.delete('/api/services/:id', async (req, res) => {try{ 
  await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]); res.json({ message: 'Service deleted successfully' }); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.get('/api/clients', async (req, res) => {try{ 
  const result = await pool.query('SELECT * FROM clients ORDER BY name'); res.json(result.rows); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.post('/api/clients', async (req, res) => {try{ 
  const result = await pool.query('INSERT INTO clients (name, email, phone) VALUES ($1, $2, $3) RETURNING *', [req.body.name, req.body.email, req.body.phone]); res.status(201).json(result.rows[0]); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.put('/api/clients/:id', async (req, res) => {try{ 
  const result = await pool.query('UPDATE clients SET name = $1, email = $2, phone = $3 WHERE id = $4 RETURNING *', [req.body.name, req.body.email, req.body.phone, req.params.id]); res.json(result.rows[0]); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.delete('/api/clients/:id', async (req, res) => {try{ 
  await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]); res.json({ message: 'Client deleted successfully' }); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.get('/api/employees', async (req, res) => {try{ 
  const result = await pool.query('SELECT * FROM employees ORDER BY name'); res.json(result.rows); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.post('/api/employees', validateEmployee, async (req, res) => {try{ 
  const errors = validationResult(req); if (!errors.isEmpty()) { return res.status(400).json(errors.array()); } const { name, email, phone, role, status } = req.body; const result = await pool.query('INSERT INTO employees (name, email, phone, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING *', [name, email, phone, role, status || 'active']); res.status(201).json(result.rows[0]); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.put('/api/employees/:id', validateEmployee, async (req, res) => {try{ 
  const errors = validationResult(req); if (!errors.isEmpty()) { return res.status(400).json(errors.array()); } const { name, email, phone, role, status } = req.body; const result = await pool.query('UPDATE employees SET name = $1, email = $2, phone = $3, role = $4, status = $5 WHERE id = $6 RETURNING *', [name, email, phone, role, status, req.params.id]); res.json(result.rows[0]); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.delete('/api/employees/:id', async (req, res) => {try{ 
  await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]); res.json({ message: 'Employee deleted successfully' }); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.get('/api/appointments', async (req, res) => {try{ 
  const result = await pool.query(`SELECT a.*, s.name as service_name, c.name as client_name, e.name as employee_name FROM appointments a LEFT JOIN services s ON a.service_id = s.id LEFT JOIN clients c ON a.client_id = c.id LEFT JOIN employees e ON a.employee_id = e.id ORDER BY date, time`); res.json(result.rows); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.post('/api/appointments', async (req, res) => {try{ 
  const { date, time, service_id, duration, price, client_id, employee_id } = req.body; if (!date || !time || !service_id || !duration || !price || !client_id || !employee_id) { return res.status(400).json({ error: 'All fields are required' }); } const result = await pool.query('INSERT INTO appointments (date, time, service_id, duration, price, client_id, employee_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [date, time, service_id, duration, price, client_id, employee_id, 'scheduled']); res.status(201).json(result.rows[0]); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.put('/api/appointments/:id', async (req, res) => {try{ 
  const { date, time, service_id, duration, price, client_id, employee_id, status } = req.body; const result = await pool.query('UPDATE appointments SET date = $1, time = $2, service_id = $3, duration = $4, price = $5, client_id = $6, employee_id = $7, status = $8 WHERE id = $9 RETURNING *', [date, time, service_id, duration, price, client_id, employee_id, status, req.params.id]); res.json(result.rows[0]); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.delete('/api/appointments/:id', async (req, res) => {try{ 
  await pool.query('DELETE FROM appointments WHERE id = $1', [req.params.id]); res.json({ message: 'Appointment deleted successfully' }); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.get('/api/products', async (req, res) => {try{ 
  const result = await pool.query('SELECT * FROM products ORDER BY name'); res.json(result.rows); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.get('/api/products/:id', async (req, res) => {try{ 
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]); if (result.rows.length === 0) { return res.status(404).json({ error: 'Product not found' }); } res.json(result.rows[0]); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.post('/api/products', async (req, res) => {try{ 
  const { name, description, price, quantity, category, status, barcode } = req.body; 
  const result = await pool.query(
    'INSERT INTO products (name, description, price, quantity, category, status, barcode) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', 
    [name, description, price, quantity, category, status, barcode]
  ); 
  res.status(201).json(result.rows[0]); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.put('/api/products/:id', async (req, res) => {try{ 
  const result = await pool.query('UPDATE products SET name = $1, description = $2, price = $3, quantity = $4, category = $5, status = $6, barcode = $7 WHERE id = $8 RETURNING *', [req.body.name, req.body.description, req.body.price, req.body.quantity, req.body.category, req.body.status, req.body.barcode, req.params.id]); res.json(result.rows[0]); } 
catch (error) { handleError(res, error, 'Check console'); }
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

app.delete('/api/products/:id', async (req, res) => {try{ 
  await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]); res.json({ message: 'Product deleted successfully' }); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.get('/api/roles', async (req, res) => {try{ 
  const result = await pool.query('SELECT * FROM roles ORDER BY name'); res.json(result.rows); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.post('/api/roles', async (req, res) => {try{ 
  const { name, description, permissions } = req.body; const client = await pool.connect(); await client.query('BEGIN'); const roleResult = await client.query('INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *', [name, description]); const role = roleResult.rows[0]; if (permissions && permissions.length > 0) { const values = permissions.map(permissionId => `(${role.id}, ${permissionId})`).join(','); await client.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`); } await client.query('COMMIT'); res.json(role); } 
catch (error) { await client.query('ROLLBACK'); console.error('Error creating role:', error); res.status(500).json({ error: 'Failed to create role' }); } 
finally { client.release(); }
});

app.delete('/api/roles/:id', async (req, res) => {try{ 
  await pool.query('DELETE FROM roles WHERE id = $1', [req.params.id]); res.json({ message: 'Role deleted successfully' }); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.get('/api/permissions', async (req, res) => {try{ 
  const result = await pool.query('SELECT * FROM permissions ORDER BY name'); res.json(result.rows); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.get('/api/role-permissions', async (req, res) => {try{ 
  const result = await pool.query('SELECT * FROM role_permissions'); res.json(result.rows); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.get('/api/users', async (req, res) => {try{ 
  const result = await pool.query('SELECT * FROM users ORDER BY username'); res.json(result.rows); } 
catch (error) { handleError(res, error, 'Check console'); }
});

app.post('/api/users', async (req, res) => {try{ 
  const { username, email, password, role_id } = req.body; const client = await pool.connect(); await client.query('BEGIN'); const existingUser = await client.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]); if (existingUser.rows.length > 0) { return res.status(400).json({ error: 'User already exists', details: 'Username or email is already in use' }); } const hashedPassword = await bcrypt.hash(password, 10); const result = await client.query('INSERT INTO users (username, email, password, role_id) VALUES ($1, $2, $3, $4) RETURNING *', [username, email, hashedPassword, role_id]); await client.query('COMMIT'); console.log('User created:', result.rows[0].username); res.status(201).json(result.rows[0]); } 
catch (error) { await client.query('ROLLBACK'); console.error('Error creating user:', error); res.status(500).json({ error: 'Failed to create user', details: process.env.NODE_ENV === 'development' ? error.message : undefined }); } 
finally { client.release(); }
});

app.put('/api/users/:id', async (req, res) => {try{ 
  const { username, email, password, role_id } = req.body; const client = await pool.connect(); await client.query('BEGIN'); const userCheck = await client.query('SELECT * FROM users WHERE id = $1', [req.params.id]); if (userCheck.rows.length === 0) { return res.status(404).json({ error: 'User not found' }); } const existingUser = await client.query('SELECT * FROM users WHERE (username = $1 OR email = $2) AND id != $3', [username, email, req.params.id]); if (existingUser.rows.length > 0) { return res.status(400).json({ error: 'User already exists', details: 'Username or email is already in use by another user' }); } let query = 'UPDATE users SET username = $1, email = $2'; const values = [username, email]; let paramCount = 2; if (password) { const hashedPassword = await bcrypt.hash(password, 10); query += `, password = $${++paramCount}`; values.push(hashedPassword); } if (role_id) { query += `, role_id = $${++paramCount}`; values.push(role_id); } query += ` WHERE id = $${++paramCount} RETURNING *`; values.push(req.params.id); const result = await client.query(query, values); await client.query('COMMIT'); console.log('User updated:', result.rows[0].username); res.json(result.rows[0]); } 
catch (error) { await client.query('ROLLBACK'); console.error('Error updating user:', error); res.status(500).json({ error: 'Failed to update user', details: process.env.NODE_ENV === 'development' ? error.message : undefined }); } 
finally { client.release(); }
});

app.delete('/api/users/:id', async (req, res) => {try{ 
  const client = await pool.connect(); await client.query('BEGIN'); const userCheck = await client.query('SELECT * FROM users WHERE id = $1', [req.params.id]); if (userCheck.rows.length === 0) { return res.status(404).json({ error: 'User not found' }); } const adminCount = await client.query('SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = $1', ['admin']); if (adminCount.rows[0].count === '1' && userCheck.rows[0].role_id === (await client.query('SELECT id FROM roles WHERE name = $1', ['admin'])).rows[0].id) { return res.status(400).json({ error: 'Cannot delete user', details: 'Cannot delete the last admin user' }); } await client.query('DELETE FROM users WHERE id = $1', [req.params.id]); await client.query('COMMIT'); console.log('User deleted:', req.params.id); res.json({ message: 'User deleted successfully' }); } 
catch (error) { await client.query('ROLLBACK'); console.error('Error deleting user:', error); res.status(500).json({ error: 'Failed to delete user', details: process.env.NODE_ENV === 'development' ? error.message : undefined }); } 
finally { client.release(); }
});

app.get('/api/users/:id/permissions', async (req, res) => {try{ 
  const result = await pool.query(`SELECT p.* FROM permissions p LEFT JOIN user_permissions up ON p.id = up.permission_id LEFT JOIN role_permissions rp ON p.id = rp.permission_id LEFT JOIN users u ON u.id = up.user_id OR u.role_id = rp.role_id WHERE u.id = $1 GROUP BY p.id`, [req.params.id]); res.json(result.rows); } 
catch (error) { console.error('Error fetching user permissions:', error); }
});

app.get('/api/user_permissions', async (req, res) => {try{ 
  const result = await pool.query('SELECT * FROM user_permissions'); res.json(result.rows); } 
catch (error) { console.error('Error fetching user permissions:', error); res.status(500).json({ error: 'Failed to fetch user permissions', details: process.env.NODE_ENV === 'development' ? error.message : undefined }); }
});

app.get('/api/employees', async (req, res) => {try{ 
  const result = await pool.query('SELECT * FROM employees ORDER BY last_name'); res.json(result.rows); } 
catch (error) { console.error('Error fetching employees:', error); res.status(500).json({ error: 'Failed to fetch employees' }); }
});

app.get('/api/payroll', async (req, res) => {try{ 
  const result = await pool.query(`SELECT p.*, e.first_name, e.last_name, e.email, e.hire_date, e.salary FROM payroll p JOIN employees e ON p.employee_id = e.employee_id ORDER BY p.pay_date DESC`); res.json(result.rows); } 
catch (error) { console.error('Error fetching payroll:', error); }
});

app.post('/api/payroll', async (req, res) => {try{ 
  const { employee_id, pay_date, gross_salary, deductions, net_salary } = req.body; const result = await pool.query('INSERT INTO payroll (employee_id, pay_date, gross_salary, deductions, net_salary) VALUES ($1, $2, $3, $4, $5) RETURNING *', [employee_id, pay_date, gross_salary, deductions, net_salary]); res.status(201).json(result.rows[0]); } 
catch (error) { console.error('Error creating payroll record:', error); }
});

app.get('/api/projects', async (req, res) => {try{ 
  const result = await pool.query('SELECT * FROM projects ORDER BY start_date DESC'); res.json(result.rows); } 
catch (error) { console.error('Error fetching projects:', error); }
});

app.get('/api/tasks', async (req, res) => {try{ 
  const result = await pool.query(`SELECT t.*, p.name as project_name, e.first_name, e.last_name FROM tasks t LEFT JOIN projects p ON t.project_id = p.project_id LEFT JOIN employees e ON t.assigned_to = e.employee_id ORDER BY t.due_date`); res.json(result.rows); } 
catch (error) { console.error('Error fetching tasks:', error); }
});

app.post('/api/tasks', async (req, res) => {try{ 
  const { project_id, title, description, assigned_to, due_date, priority, status } = req.body; const result = await pool.query('INSERT INTO tasks (project_id, title, description, assigned_to, due_date, priority, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [project_id, title, description, assigned_to, due_date, priority, status]); res.status(201).json(result.rows[0]); } 
catch (error) { console.error('Error creating task:', error); }
});

app.put('/api/tasks/:id', async (req, res) => {try{ 
  const { id } = req.params; const { status, progress } = req.body; const result = await pool.query('UPDATE tasks SET status = $1, progress = $2, updated_at = NOW() WHERE task_id = $3 RETURNING *', [status, progress, id]); if (result.rows.length === 0) { return res.status(404).json({ error: 'Task not found' }); } res.json(result.rows[0]); } 
catch (error) { console.error('Error updating task:', error); }
});

app.get('/api/boards', async (req, res) => {try{ 
  const result = await pool.query('SELECT * FROM boards ORDER BY created_at DESC'); res.json(result.rows); } 
catch (error) { console.error('Error fetching boards:', error); }
});

app.get('/api/boards/:id/notes', async (req, res) => {try{ 
  const { id } = req.params; const result = await pool.query(`SELECT n.*, e.first_name, e.last_name FROM notes n LEFT JOIN employees e ON n.created_by = e.employee_id WHERE n.board_id = $1 ORDER BY n.created_at DESC`, [id]); res.json(result.rows); } 
catch (error) { console.error('Error fetching notes:', error); }
});

app.post('/api/boards/:id/notes', async (req, res) => {try{ 
  const { id } = req.params; const { content, created_by, color } = req.body; const result = await pool.query('INSERT INTO notes (board_id, content, created_by, color) VALUES ($1, $2, $3, $4) RETURNING *', [id, content, created_by, color]); res.status(201).json(result.rows[0]); } 
catch (error) { console.error('Error creating note:', error); }
});

// Mount router
app.use('/api', router);

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

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});

// Startup logging
const server = app.listen(PORT, HOST, () => {
  console.log(`Server environment: ${process.env.NODE_ENV}`);
  console.log(`Server is running on port ${PORT}`);
  console.log(`Database URL is set: ${!!process.env.DATABASE_URL}`);
  
  // Test database connection
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Database connection failed:', err.message);
    } else {
      console.log('Database connected successfully');
    }
  });
});

// Handle server startup errors
server.on('error', (error) => {
  console.error('Server startup error:', error);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});