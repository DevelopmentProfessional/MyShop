-- shift_scheduling.sql
-- Table definitions for shift scheduling

-- Note: This file assumes the employees table already exists with the structure:
-- CREATE TABLE employees (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(100) NOT NULL,
--     email VARCHAR(100) NOT NULL,
--     role VARCHAR(50) NOT NULL,
--     phone VARCHAR(20),
--     status VARCHAR(20) DEFAULT 'active',
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     supervisor_id INT,
--     department VARCHAR(100)
-- );

-- Shift Scheduling System Database Schema (PostgreSQL)
-- This schema supports shift templates, rotations, and employee assignments

-- Shift Templates Table
CREATE TABLE shift_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#007bff',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on active templates
CREATE INDEX idx_shift_templates_active ON shift_templates(is_active);
CREATE INDEX idx_shift_templates_name ON shift_templates(name);

-- Shift Rotations Table
CREATE TABLE shift_rotations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    current_position INTEGER DEFAULT 1,
    cycle_duration INTEGER DEFAULT 1, -- Days per cycle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes on rotations
CREATE INDEX idx_shift_rotations_status ON shift_rotations(status);
CREATE INDEX idx_shift_rotations_start_date ON shift_rotations(start_date);

-- Rotation Shift Assignments Table (Many-to-Many between rotations and templates with position)
CREATE TABLE rotation_shift_assignments (
    id SERIAL PRIMARY KEY,
    rotation_id INTEGER NOT NULL,
    template_id INTEGER NOT NULL,
    position INTEGER NOT NULL, -- Position in the rotation sequence (1, 2, 3, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rotation_id) REFERENCES shift_rotations(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES shift_templates(id) ON DELETE CASCADE,
    UNIQUE (rotation_id, position)
);

-- Create indexes on rotation assignments
CREATE INDEX idx_rotation_shift_assignments_rotation_position ON rotation_shift_assignments(rotation_id, position);

-- Rotation Employee Assignments Table (Employees assigned to specific positions in rotations)
CREATE TABLE rotation_employee_assignments (
    id SERIAL PRIMARY KEY,
    rotation_id INTEGER NOT NULL,
    position INTEGER NOT NULL, -- Which position in the rotation this employee is assigned to
    employee_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rotation_id) REFERENCES shift_rotations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE (rotation_id, position, employee_id)
);

-- Create indexes on employee assignments
CREATE INDEX idx_rotation_employee_assignments_rotation_position ON rotation_employee_assignments(rotation_id, position);
CREATE INDEX idx_rotation_employee_assignments_employee ON rotation_employee_assignments(employee_id);

-- Individual Shift Assignments Table (One-time or recurring shift assignments)
CREATE TABLE shift_assignments (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    rotation_id INTEGER NULL, -- NULL for individual assignments, set for rotation-based assignments
    rotation_position INTEGER NULL, -- Position in rotation if this is part of a rotation
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES shift_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (rotation_id) REFERENCES shift_rotations(id) ON DELETE SET NULL
);

-- Create indexes on shift assignments
CREATE INDEX idx_shift_assignments_date ON shift_assignments(date);
CREATE INDEX idx_shift_assignments_employee_date ON shift_assignments(employee_id, date);
CREATE INDEX idx_shift_assignments_status ON shift_assignments(status);
CREATE INDEX idx_shift_assignments_rotation ON shift_assignments(rotation_id, rotation_position);

-- Recurring Shift Patterns Table (For recurring shift assignments)
CREATE TABLE recurring_shift_patterns (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    pattern_type VARCHAR(20) NOT NULL CHECK (pattern_type IN ('daily', 'weekly', 'monthly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES shift_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Create indexes on recurring patterns
CREATE INDEX idx_recurring_shift_patterns_type ON recurring_shift_patterns(pattern_type);
CREATE INDEX idx_recurring_shift_patterns_date_range ON recurring_shift_patterns(start_date, end_date);
CREATE INDEX idx_recurring_shift_patterns_active ON recurring_shift_patterns(is_active);

-- Sample Data for Shift Templates
INSERT INTO shift_templates (name, start_time, end_time, description, color) VALUES
('Morning Shift', '06:00:00', '14:00:00', 'Early morning shift for opening operations', '#28a745'),
('Afternoon Shift', '14:00:00', '22:00:00', 'Mid-day shift for peak operations', '#ffc107'),
('Night Shift', '22:00:00', '06:00:00', 'Overnight shift for 24/7 operations', '#6f42c1'),
('Part-Time Morning', '08:00:00', '12:00:00', 'Short morning shift for part-time staff', '#17a2b8'),
('Part-Time Evening', '16:00:00', '20:00:00', 'Short evening shift for part-time staff', '#fd7e14');

-- Sample Data for Shift Rotations
INSERT INTO shift_rotations (name, description, start_date, cycle_duration) VALUES
('Morning-Evening-Night Rotation', '3-shift rotation covering 24 hours', '2024-01-01', 3),
('Day-Night Rotation', '2-shift rotation for day and night coverage', '2024-01-01', 2),
('Weekend Rotation', 'Weekend-specific rotation pattern', '2024-01-01', 7);

-- Sample Rotation Shift Assignments
INSERT INTO rotation_shift_assignments (rotation_id, template_id, position) VALUES
(1, 1, 1), -- Morning shift in 3-shift rotation
(1, 2, 2), -- Afternoon shift in 3-shift rotation  
(1, 3, 3), -- Night shift in 3-shift rotation
(2, 1, 1), -- Morning shift in 2-shift rotation
(2, 3, 2); -- Night shift in 2-shift rotation

-- Sample Rotation Employee Assignments (assuming employees exist)
-- INSERT INTO rotation_employee_assignments (rotation_id, position, employee_id) VALUES
-- (1, 1, 1), -- Employee 1 assigned to position 1 of rotation 1
-- (1, 1, 2), -- Employee 2 also assigned to position 1 of rotation 1
-- (1, 2, 3), -- Employee 3 assigned to position 2 of rotation 1
-- (1, 3, 4); -- Employee 4 assigned to position 3 of rotation 1

-- Views for easier querying

-- View for active shift templates
CREATE VIEW active_shift_templates AS
SELECT * FROM shift_templates WHERE is_active = TRUE;

-- View for rotation details with template information
CREATE VIEW rotation_details AS
SELECT 
    r.id,
    r.name,
    r.description,
    r.start_date,
    r.status,
    r.current_position,
    r.cycle_duration,
    COUNT(DISTINCT rsa.position) as total_positions,
    COUNT(DISTINCT rea.employee_id) as total_employees
FROM shift_rotations r
LEFT JOIN rotation_shift_assignments rsa ON r.id = rsa.rotation_id
LEFT JOIN rotation_employee_assignments rea ON r.id = rea.rotation_id
GROUP BY r.id, r.name, r.description, r.start_date, r.status, r.current_position, r.cycle_duration;

-- View for current shift assignments with employee and template info
CREATE VIEW current_shift_assignments AS
SELECT 
    sa.id,
    sa.date,
    sa.start_time,
    sa.end_time,
    sa.status,
    sa.rotation_id,
    sa.rotation_position,
    sa.notes,
    st.name as template_name,
    st.color as template_color,
    e.name as employee_name,
    e.id as employee_id
FROM shift_assignments sa
JOIN shift_templates st ON sa.template_id = st.id
JOIN employees e ON sa.employee_id = e.id
WHERE sa.date >= CURRENT_DATE
ORDER BY sa.date, sa.start_time;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_shift_templates_updated_at BEFORE UPDATE ON shift_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_rotations_updated_at BEFORE UPDATE ON shift_rotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_assignments_updated_at BEFORE UPDATE ON shift_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_shift_patterns_updated_at BEFORE UPDATE ON recurring_shift_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to advance rotation to next position
CREATE OR REPLACE FUNCTION advance_rotation(rotation_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
    current_pos INTEGER;
    total_positions INTEGER;
    new_position INTEGER;
BEGIN
    -- Get current position and total positions
    SELECT r.current_position, COUNT(rsa.position) 
    INTO current_pos, total_positions
    FROM shift_rotations r
    LEFT JOIN rotation_shift_assignments rsa ON r.id = rsa.rotation_id
    WHERE r.id = rotation_id_param
    GROUP BY r.id, r.current_position;
    
    -- Calculate new position (cycle back to 1 if at end)
    IF current_pos >= total_positions THEN
        new_position := 1;
    ELSE
        new_position := current_pos + 1;
    END IF;
    
    -- Update rotation position
    UPDATE shift_rotations 
    SET current_position = new_position
    WHERE id = rotation_id_param;
    
    -- Generate new shift assignments for the new position
    INSERT INTO shift_assignments (template_id, employee_id, date, start_time, end_time, rotation_id, rotation_position)
    SELECT 
        rsa.template_id,
        rea.employee_id,
        CURRENT_DATE,
        st.start_time,
        st.end_time,
        rotation_id_param,
        new_position
    FROM rotation_shift_assignments rsa
    JOIN rotation_employee_assignments rea ON rsa.rotation_id = rea.rotation_id AND rsa.position = rea.position
    JOIN shift_templates st ON rsa.template_id = st.id
    WHERE rsa.rotation_id = rotation_id_param AND rsa.position = new_position;
    
END;
$$ LANGUAGE plpgsql;

-- Function to create shift assignments from rotation
CREATE OR REPLACE FUNCTION create_rotation_assignments(rotation_id_param INTEGER, start_date_param DATE, days_count_param INTEGER)
RETURNS VOID AS $$
DECLARE
    i INTEGER := 0;
    current_date DATE;
    position INTEGER;
    total_positions INTEGER;
BEGIN
    -- Get total positions in rotation
    SELECT COUNT(position) INTO total_positions
    FROM rotation_shift_assignments
    WHERE rotation_id = rotation_id_param;
    
    current_date := start_date_param;
    
    -- Create assignments for each day
    WHILE i < days_count_param LOOP
        -- Calculate position for this day (cycles through positions)
        position := ((i % total_positions) + 1);
        
        -- Insert assignments for this position
        INSERT INTO shift_assignments (template_id, employee_id, date, start_time, end_time, rotation_id, rotation_position)
        SELECT 
            rsa.template_id,
            rea.employee_id,
            current_date,
            st.start_time,
            st.end_time,
            rotation_id_param,
            position
        FROM rotation_shift_assignments rsa
        JOIN rotation_employee_assignments rea ON rsa.rotation_id = rea.rotation_id AND rsa.position = rea.position
        JOIN shift_templates st ON rsa.template_id = st.id
        WHERE rsa.rotation_id = rotation_id_param AND rsa.position = position;
        
        i := i + 1;
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
END;
$$ LANGUAGE plpgsql; 