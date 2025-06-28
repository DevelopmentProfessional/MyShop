const express = require('express');
const router = express.Router();

// This will be set by the main server
let pool;

// Function to set the pool from the main server
function setPool(databasePool) {
    pool = databasePool;
    console.log('Shift scheduling API: Pool set successfully');
}

// Helper function to check if pool is available
function checkPool() {
    if (!pool) {
        throw new Error('Database pool not initialized');
    }
    return pool;
}

// ========================================
// SHIFT TEMPLATES API ENDPOINTS
// ========================================

// Get all shift templates
router.get('/shift-templates', async (req, res) => {
    try {
        const dbPool = checkPool();
        const { rows } = await dbPool.query(
            'SELECT * FROM shift_templates ORDER BY name'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching shift templates:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch shift templates', details: error.message });
    }
});

// Get active shift templates
router.get('/shift-templates/active', async (req, res) => {
    try {
        const dbPool = checkPool();
        const { rows } = await dbPool.query(
            'SELECT * FROM shift_templates WHERE is_active = TRUE ORDER BY name'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching active shift templates:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch active shift templates', details: error.message });
    }
});

// Create new shift template
router.post('/shift-templates', async (req, res) => {
    try {
        const { name, start_time, end_time, description, color } = req.body;
        
        if (!name || !start_time || !end_time) {
            return res.status(400).json({ success: false, error: 'Name, start time, and end time are required' });
        }

        const dbPool = checkPool();
        const { rows } = await dbPool.query(
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
router.put('/shift-templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, start_time, end_time, description, color, is_active } = req.body;

        const dbPool = checkPool();
        const { rows } = await dbPool.query(
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
router.delete('/shift-templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const dbPool = checkPool();

        // Check if template is used in any rotations
        const usageCheck = await dbPool.query(
            'SELECT COUNT(*) as count FROM rotation_shift_assignments WHERE template_id = $1',
            [id]
        );

        if (parseInt(usageCheck.rows[0].count) > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete template that is used in rotations. Remove from rotations first.' 
            });
        }

        const { rows } = await dbPool.query(
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
router.get('/shift-rotations', async (req, res) => {
    try {
        const dbPool = checkPool();
        const { rows } = await dbPool.query(`
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
router.get('/shift-rotations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const dbPool = checkPool();

        // Get rotation basic info
        const rotationResult = await dbPool.query(
            'SELECT * FROM shift_rotations WHERE id = $1',
            [id]
        );

        if (rotationResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Rotation not found' });
        }

        // Get rotation templates with positions
        const templatesResult = await dbPool.query(`
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
        const employeesResult = await dbPool.query(`
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
router.post('/shift-rotations', async (req, res) => {
    try {
        const { name, description, start_date, cycle_duration } = req.body;

        if (!name || !start_date) {
            return res.status(400).json({ success: false, error: 'Name and start date are required' });
        }

        const dbPool = checkPool();
        const { rows } = await dbPool.query(
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
router.put('/shift-rotations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, start_date, cycle_duration, status, current_position } = req.body;

        const dbPool = checkPool();
        const { rows } = await dbPool.query(
            'UPDATE shift_rotations SET name = $1, description = $2, start_date = $3, cycle_duration = $4, status = $5, current_position = $6 WHERE id = $7 RETURNING *',
            [name, description, start_date, cycle_duration, status, current_position, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Shift rotation not found' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error updating shift rotation:', error);
        res.status(500).json({ success: false, error: 'Failed to update shift rotation', details: error.message });
    }
});

// Delete shift rotation
router.delete('/shift-rotations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const dbPool = checkPool();

        const { rows } = await dbPool.query(
            'DELETE FROM shift_rotations WHERE id = $1 RETURNING id',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Shift rotation not found' });
        }

        res.json({ success: true, message: 'Shift rotation deleted successfully' });
    } catch (error) {
        console.error('Error deleting shift rotation:', error);
        res.status(500).json({ success: false, error: 'Failed to delete shift rotation', details: error.message });
    }
});

// Add template to rotation
router.post('/shift-rotations/:id/templates', async (req, res) => {
    try {
        const { id } = req.params;
        const { template_id, position } = req.body;

        if (!template_id || !position) {
            return res.status(400).json({ success: false, error: 'Template ID and position are required' });
        }

        const dbPool = checkPool();
        // Check if position is already taken
        const existing = await dbPool.query(
            'SELECT id FROM rotation_shift_assignments WHERE rotation_id = $1 AND position = $2',
            [id, position]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Position already assigned in this rotation' });
        }

        await dbPool.query(
            'INSERT INTO rotation_shift_assignments (rotation_id, template_id, position) VALUES ($1, $2, $3)',
            [id, template_id, position]
        );

        res.json({ success: true, message: 'Template added to rotation successfully' });
    } catch (error) {
        console.error('Error adding template to rotation:', error);
        res.status(500).json({ success: false, error: 'Failed to add template to rotation', details: error.message });
    }
});

// Remove template from rotation
router.delete('/shift-rotations/:id/templates/:position', async (req, res) => {
    try {
        const { id, position } = req.params;
        const dbPool = checkPool();

        const { rows } = await dbPool.query(
            'DELETE FROM rotation_shift_assignments WHERE rotation_id = $1 AND position = $2 RETURNING id',
            [id, position]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Template assignment not found' });
        }

        res.json({ success: true, message: 'Template removed from rotation successfully' });
    } catch (error) {
        console.error('Error removing template from rotation:', error);
        res.status(500).json({ success: false, error: 'Failed to remove template from rotation', details: error.message });
    }
});

// Add employee to rotation position
router.post('/shift-rotations/:id/employees', async (req, res) => {
    try {
        const { id } = req.params;
        const { employee_id, position } = req.body;

        if (!employee_id || !position) {
            return res.status(400).json({ success: false, error: 'Employee ID and position are required' });
        }

        const dbPool = checkPool();
        // Check if employee is already assigned to this position
        const existing = await dbPool.query(
            'SELECT id FROM rotation_employee_assignments WHERE rotation_id = $1 AND position = $2 AND employee_id = $3',
            [id, position, employee_id]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Employee already assigned to this position' });
        }

        await dbPool.query(
            'INSERT INTO rotation_employee_assignments (rotation_id, position, employee_id) VALUES ($1, $2, $3)',
            [id, position, employee_id]
        );

        res.json({ success: true, message: 'Employee added to rotation successfully' });
    } catch (error) {
        console.error('Error adding employee to rotation:', error);
        res.status(500).json({ success: false, error: 'Failed to add employee to rotation', details: error.message });
    }
});

// Remove employee from rotation position
router.delete('/shift-rotations/:id/employees/:employee_id/:position', async (req, res) => {
    try {
        const { id, employee_id, position } = req.params;
        const dbPool = checkPool();

        const { rows } = await dbPool.query(
            'DELETE FROM rotation_employee_assignments WHERE rotation_id = $1 AND employee_id = $2 AND position = $3 RETURNING id',
            [id, employee_id, position]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Employee assignment not found' });
        }

        res.json({ success: true, message: 'Employee removed from rotation successfully' });
    } catch (error) {
        console.error('Error removing employee from rotation:', error);
        res.status(500).json({ success: false, error: 'Failed to remove employee from rotation', details: error.message });
    }
});

// Advance rotation to next position
router.post('/shift-rotations/:id/advance', async (req, res) => {
    try {
        const { id } = req.params;
        const dbPool = checkPool();

        // Call the PostgreSQL function to advance the rotation
        await dbPool.query('SELECT advance_rotation($1)', [id]);

        const { rows } = await dbPool.query(
            'SELECT * FROM shift_rotations WHERE id = $1',
            [id]
        );

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error advancing rotation:', error);
        res.status(500).json({ success: false, error: 'Failed to advance rotation', details: error.message });
    }
});

// ========================================
// SHIFT ASSIGNMENTS API ENDPOINTS
// ========================================

// Get shift assignments for a date range
router.get('/shift-assignments', async (req, res) => {
    try {
        const { start_date, end_date, employee_id } = req.query;
        const dbPool = checkPool();
        
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
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 0;

        if (start_date) {
            paramCount++;
            query += ` AND sa.date >= $${paramCount}`;
            params.push(start_date);
        }

        if (end_date) {
            paramCount++;
            query += ` AND sa.date <= $${paramCount}`;
            params.push(end_date);
        }

        if (employee_id) {
            paramCount++;
            query += ` AND sa.employee_id = $${paramCount}`;
            params.push(employee_id);
        }

        query += ' ORDER BY sa.date, sa.start_time';

        const { rows } = await dbPool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching shift assignments:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch shift assignments', details: error.message });
    }
});

// Create individual shift assignment
router.post('/shift-assignments', async (req, res) => {
    try {
        const { template_id, employee_id, date, start_time, end_time, notes } = req.body;

        if (!template_id || !employee_id || !date || !start_time || !end_time) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        const dbPool = checkPool();
        // TODO: Fix conflict detection logic - temporarily disabled
        // Check for conflicts
        /*
        const conflicts = await dbPool.query(`
            SELECT id FROM shift_assignments 
            WHERE employee_id = $1 AND date = $2 
            AND ((start_time <= $3 AND end_time > $3) OR (start_time < $4 AND end_time >= $4) OR (start_time >= $3 AND end_time <= $4))
        `, [employee_id, date, start_time, end_time]);

        if (conflicts.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Shift conflicts with existing assignment' });
        }
        */

        const { rows } = await dbPool.query(
            'INSERT INTO shift_assignments (template_id, employee_id, date, start_time, end_time, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [template_id, employee_id, date, start_time, end_time, notes || null]
        );

        const assignmentResult = await dbPool.query(`
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

        res.json({ success: true, data: assignmentResult.rows[0] });
    } catch (error) {
        console.error('Error creating shift assignment:', error);
        res.status(500).json({ success: false, error: 'Failed to create shift assignment', details: error.message });
    }
});

// Update shift assignment
router.put('/shift-assignments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { template_id, employee_id, date, start_time, end_time, status, notes } = req.body;
        const dbPool = checkPool();

        const { rows } = await dbPool.query(
            'UPDATE shift_assignments SET template_id = $1, employee_id = $2, date = $3, start_time = $4, end_time = $5, status = $6, notes = $7 WHERE id = $8 RETURNING *',
            [template_id, employee_id, date, start_time, end_time, status, notes, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Shift assignment not found' });
        }

        const assignmentResult = await dbPool.query(`
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
router.delete('/shift-assignments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const dbPool = checkPool();

        const { rows } = await dbPool.query(
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
router.post('/shift-rotations/:id/generate-assignments', async (req, res) => {
    try {
        const { id } = req.params;
        const { start_date, days_count } = req.body;

        if (!start_date || !days_count) {
            return res.status(400).json({ success: false, error: 'Start date and days count are required' });
        }

        const dbPool = checkPool();
        // Call the PostgreSQL function to generate assignments
        await dbPool.query('SELECT create_rotation_assignments($1, $2, $3)', [id, start_date, days_count]);

        res.json({ success: true, message: 'Assignments generated successfully' });
    } catch (error) {
        console.error('Error generating assignments from rotation:', error);
        res.status(500).json({ success: false, error: 'Failed to generate assignments from rotation', details: error.message });
    }
});

// ========================================
// RECURRING SHIFT PATTERNS API ENDPOINTS
// ========================================

// Get recurring shift patterns
router.get('/shift-recurring-patterns', async (req, res) => {
    try {
        const dbPool = checkPool();
        const { rows } = await dbPool.query(`
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
router.post('/shift-recurring-patterns', async (req, res) => {
    try {
        const { template_id, employee_id, pattern_type, start_date, end_date, start_time, end_time, notes } = req.body;

        if (!template_id || !employee_id || !pattern_type || !start_date || !end_date || !start_time || !end_time) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        const dbPool = checkPool();
        const { rows } = await dbPool.query(
            'INSERT INTO recurring_shift_patterns (template_id, employee_id, pattern_type, start_date, end_date, start_time, end_time, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [template_id, employee_id, pattern_type, start_date, end_date, start_time, end_time, notes || null]
        );

        const patternResult = await dbPool.query(`
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
router.put('/shift-recurring-patterns/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { template_id, employee_id, pattern_type, start_date, end_date, start_time, end_time, is_active, notes } = req.body;
        const dbPool = checkPool();

        const { rows } = await dbPool.query(
            'UPDATE recurring_shift_patterns SET template_id = $1, employee_id = $2, pattern_type = $3, start_date = $4, end_date = $5, start_time = $6, end_time = $7, is_active = $8, notes = $9 WHERE id = $10 RETURNING *',
            [template_id, employee_id, pattern_type, start_date, end_date, start_time, end_time, is_active, notes, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recurring pattern not found' });
        }

        const patternResult = await dbPool.query(`
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
router.delete('/shift-recurring-patterns/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const dbPool = checkPool();

        const { rows } = await dbPool.query(
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

// ========================================
// UTILITY ENDPOINTS
// ========================================

// Get employees for assignment
router.get('/employees', async (req, res) => {
    try {
        const dbPool = checkPool();
        const { rows } = await dbPool.query(
            'SELECT id, name, email FROM employees ORDER BY name'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch employees', details: error.message });
    }
});

// Check for shift conflicts
router.post('/check-conflicts', async (req, res) => {
    try {
        const { employee_id, date, start_time, end_time, exclude_id } = req.body;
        const dbPool = checkPool();

        let query = `
            SELECT id, start_time, end_time FROM shift_assignments 
            WHERE employee_id = $1 AND date = $2 
            AND ((start_time <= $3 AND end_time > $3) OR (start_time < $4 AND end_time >= $4) OR (start_time >= $3 AND end_time <= $4))
        `;
        const params = [employee_id, date, start_time, start_time, end_time, end_time, start_time, end_time];

        if (exclude_id) {
            query += ' AND id != $' + (params.length + 1);
            params.push(exclude_id);
        }

        const { rows } = await dbPool.query(query, params);

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

// ========================================
// SHIFT SCHEDULING OVERVIEW ENDPOINT
// ========================================

// Get shift scheduling overview/dashboard data
router.get('/shift-scheduling', async (req, res) => {
    try {
        const dbPool = checkPool();
        
        // Get counts for dashboard
        const templateCount = await dbPool.query('SELECT COUNT(*) as count FROM shift_templates WHERE is_active = TRUE');
        const rotationCount = await dbPool.query('SELECT COUNT(*) as count FROM shift_rotations WHERE status = \'active\'');
        const assignmentCount = await dbPool.query('SELECT COUNT(*) as count FROM shift_assignments WHERE date >= CURRENT_DATE');
        const employeeCount = await dbPool.query('SELECT COUNT(*) as count FROM employees');
        
        // Get today's assignments
        const todayAssignments = await dbPool.query(`
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
        const upcomingAssignments = await dbPool.query(`
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

// ========================================
// ADDITIONAL SHIFT ROTATION ENDPOINTS
// ========================================

// Get rotation sequence (templates in order)
router.get('/shift-rotations/:id/sequence', async (req, res) => {
    try {
        const { id } = req.params;
        const dbPool = checkPool();

        const { rows } = await dbPool.query(`
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
router.post('/shift-rotations/:id/pause', async (req, res) => {
    try {
        const { id } = req.params;
        const dbPool = checkPool();

        const { rows } = await dbPool.query(
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
router.post('/shift-rotations/:id/resume', async (req, res) => {
    try {
        const { id } = req.params;
        const dbPool = checkPool();

        const { rows } = await dbPool.query(
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

module.exports = {
    router,
    setPool
}; 