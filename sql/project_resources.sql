-- Project Resources Management (Idempotent)
-- Enhanced resource management for projects with assets and facilities

-- Facilities table for project resource management
CREATE TABLE IF NOT EXISTS facilities (
    facility_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    facility_type VARCHAR(100) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    capacity INTEGER,
    status VARCHAR(50) DEFAULT 'available',
    hourly_rate DECIMAL(10,2),
    daily_rate DECIMAL(10,2),
    weekly_rate DECIMAL(10,2),
    monthly_rate DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced project resources table (replaces basic resources table)
CREATE TABLE IF NOT EXISTS project_resources (
    resource_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- 'asset', 'facility', 'equipment', 'service'
    description TEXT,
    category VARCHAR(100),
    unit_cost DECIMAL(10,2),
    unit_type VARCHAR(50), -- 'hour', 'day', 'week', 'month', 'use'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project-Resource assignments (many-to-many)
CREATE TABLE IF NOT EXISTS project_resource_assignments (
    assignment_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- 'asset', 'facility', 'equipment', 'service'
    resource_id INTEGER NOT NULL, -- ID from assets, facilities, or project_resources
    assigned_quantity INTEGER DEFAULT 1,
    start_date DATE,
    end_date DATE,
    daily_rate DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'assigned', -- 'assigned', 'in_use', 'returned', 'cancelled'
    notes TEXT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

-- Task-Resource linking (enhanced)
CREATE TABLE IF NOT EXISTS task_resource_assignments (
    assignment_id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL,
    project_assignment_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    checked_out_at TIMESTAMP,
    checked_in_at TIMESTAMP,
    return_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    FOREIGN KEY (project_assignment_id) REFERENCES project_resource_assignments(assignment_id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_facilities_type ON facilities(facility_type);
CREATE INDEX IF NOT EXISTS idx_facilities_status ON facilities(status);
CREATE INDEX IF NOT EXISTS idx_facilities_location ON facilities(location);
CREATE INDEX IF NOT EXISTS idx_project_resources_type ON project_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_project_resources_category ON project_resources(category);
CREATE INDEX IF NOT EXISTS idx_project_resource_assignments_project_id ON project_resource_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_resource_assignments_resource_type ON project_resource_assignments(resource_type);
CREATE INDEX IF NOT EXISTS idx_project_resource_assignments_status ON project_resource_assignments(status);
CREATE INDEX IF NOT EXISTS idx_task_resource_assignments_task_id ON task_resource_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_resource_assignments_project_assignment_id ON task_resource_assignments(project_assignment_id);

-- Trigger to update updated_at timestamp for facilities
CREATE OR REPLACE FUNCTION update_facilities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON facilities
    FOR EACH ROW EXECUTE FUNCTION update_facilities_updated_at();

-- Trigger to update updated_at timestamp for project_resource_assignments
CREATE OR REPLACE FUNCTION update_project_resource_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_resource_assignments_updated_at BEFORE UPDATE ON project_resource_assignments
    FOR EACH ROW EXECUTE FUNCTION update_project_resource_assignments_updated_at();

-- Sample facilities data (salon-related)
INSERT INTO facilities (name, facility_type, description, location, capacity, status, hourly_rate, daily_rate, weekly_rate, monthly_rate) VALUES
('Main Salon Floor', 'Salon Space', 'Primary salon area with multiple stations', 'Main Floor', 8, 'available', 25.00, 200.00, 1200.00, 4800.00)
WHERE NOT EXISTS (SELECT 1 FROM facilities WHERE name = 'Main Salon Floor');

INSERT INTO facilities (name, facility_type, description, location, capacity, status, hourly_rate, daily_rate, weekly_rate, monthly_rate) VALUES
('Nail Studio', 'Nail Space', 'Dedicated nail services area', 'Main Floor', 4, 'available', 20.00, 150.00, 900.00, 3600.00)
WHERE NOT EXISTS (SELECT 1 FROM facilities WHERE name = 'Nail Studio');

INSERT INTO facilities (name, facility_type, description, location, capacity, status, hourly_rate, daily_rate, weekly_rate, monthly_rate) VALUES
('Spa Treatment Room', 'Spa Space', 'Private room for facial and spa treatments', 'Second Floor', 2, 'available', 30.00, 240.00, 1440.00, 5760.00)
WHERE NOT EXISTS (SELECT 1 FROM facilities WHERE name = 'Spa Treatment Room');

INSERT INTO facilities (name, facility_type, description, location, capacity, status, hourly_rate, daily_rate, weekly_rate, monthly_rate) VALUES
('Massage Room', 'Massage Space', 'Private room for massage therapy', 'Second Floor', 2, 'available', 35.00, 280.00, 1680.00, 6720.00)
WHERE NOT EXISTS (SELECT 1 FROM facilities WHERE name = 'Massage Room');

INSERT INTO facilities (name, facility_type, description, location, capacity, status, hourly_rate, daily_rate, weekly_rate, monthly_rate) VALUES
('Conference Room', 'Meeting Space', 'Meeting room for staff and client consultations', 'Main Floor', 12, 'available', 15.00, 120.00, 720.00, 2880.00)
WHERE NOT EXISTS (SELECT 1 FROM facilities WHERE name = 'Conference Room');

INSERT INTO facilities (name, facility_type, description, location, capacity, status, hourly_rate, daily_rate, weekly_rate, monthly_rate) VALUES
('Training Room', 'Training Space', 'Space for staff training and education', 'Second Floor', 15, 'available', 20.00, 160.00, 960.00, 3840.00)
WHERE NOT EXISTS (SELECT 1 FROM facilities WHERE name = 'Training Room');

INSERT INTO facilities (name, facility_type, description, location, capacity, status, hourly_rate, daily_rate, weekly_rate, monthly_rate) VALUES
('Storage Room', 'Storage Space', 'Secure storage for equipment and supplies', 'Basement', 50, 'available', 5.00, 40.00, 240.00, 960.00)
WHERE NOT EXISTS (SELECT 1 FROM facilities WHERE name = 'Storage Room');

INSERT INTO facilities (name, facility_type, description, location, capacity, status, hourly_rate, daily_rate, weekly_rate, monthly_rate) VALUES
('Break Room', 'Staff Space', 'Staff break room and kitchen area', 'Main Floor', 8, 'available', 10.00, 80.00, 480.00, 1920.00)
WHERE NOT EXISTS (SELECT 1 FROM facilities WHERE name = 'Break Room');

-- Sample project resources (equipment and services)
INSERT INTO project_resources (name, resource_type, description, category, unit_cost, unit_type) VALUES
('Professional Hair Dryer', 'equipment', 'High-quality hair dryer for styling', 'Styling Equipment', 25.00, 'day')
WHERE NOT EXISTS (SELECT 1 FROM project_resources WHERE name = 'Professional Hair Dryer');

INSERT INTO project_resources (name, resource_type, description, category, unit_cost, unit_type) VALUES
('UV Lamp System', 'equipment', 'Professional UV lamp for nail curing', 'Nail Equipment', 15.00, 'day')
WHERE NOT EXISTS (SELECT 1 FROM project_resources WHERE name = 'UV Lamp System');

INSERT INTO project_resources (name, resource_type, description, category, unit_cost, unit_type) VALUES
('Steam Facial Machine', 'equipment', 'Professional steam machine for facials', 'Facial Equipment', 40.00, 'day')
WHERE NOT EXISTS (SELECT 1 FROM project_resources WHERE name = 'Steam Facial Machine');

INSERT INTO project_resources (name, resource_type, description, category, unit_cost, unit_type) VALUES
('Massage Table', 'equipment', 'Professional massage table with accessories', 'Massage Equipment', 35.00, 'day')
WHERE NOT EXISTS (SELECT 1 FROM project_resources WHERE name = 'Massage Table');

INSERT INTO project_resources (name, resource_type, description, category, unit_cost, unit_type) VALUES
('Cleaning Service', 'service', 'Professional cleaning service', 'Maintenance Services', 100.00, 'day')
WHERE NOT EXISTS (SELECT 1 FROM project_resources WHERE name = 'Cleaning Service');

INSERT INTO project_resources (name, resource_type, description, category, unit_cost, unit_type) VALUES
('Security Service', 'service', 'Professional security service', 'Security Services', 150.00, 'day')
WHERE NOT EXISTS (SELECT 1 FROM project_resources WHERE name = 'Security Service');

-- Sample project resource assignments (linking existing projects to resources)
INSERT INTO project_resource_assignments (project_id, resource_type, resource_id, assigned_quantity, start_date, end_date, daily_rate, total_cost, status) VALUES
(1, 'asset', 1, 1, '2024-07-01', '2024-07-31', 50.00, 1550.00, 'assigned')
WHERE NOT EXISTS (SELECT 1 FROM project_resource_assignments WHERE project_id = 1 AND resource_type = 'asset' AND resource_id = 1);

INSERT INTO project_resource_assignments (project_id, resource_type, resource_id, assigned_quantity, start_date, end_date, daily_rate, total_cost, status) VALUES
(1, 'facility', 1, 1, '2024-07-01', '2024-07-31', 200.00, 6200.00, 'assigned')
WHERE NOT EXISTS (SELECT 1 FROM project_resource_assignments WHERE project_id = 1 AND resource_type = 'facility' AND resource_id = 1);

INSERT INTO project_resource_assignments (project_id, resource_type, resource_id, assigned_quantity, start_date, end_date, daily_rate, total_cost, status) VALUES
(2, 'asset', 2, 1, '2024-07-01', '2024-07-31', 40.00, 1240.00, 'assigned')
WHERE NOT EXISTS (SELECT 1 FROM project_resource_assignments WHERE project_id = 2 AND resource_type = 'asset' AND resource_id = 2);

INSERT INTO project_resource_assignments (project_id, resource_type, resource_id, assigned_quantity, start_date, end_date, daily_rate, total_cost, status) VALUES
(2, 'facility', 2, 1, '2024-07-01', '2024-07-31', 150.00, 4650.00, 'assigned')
WHERE NOT EXISTS (SELECT 1 FROM project_resource_assignments WHERE project_id = 2 AND resource_type = 'facility' AND resource_id = 2);

-- Sample task resource assignments
INSERT INTO task_resource_assignments (task_id, project_assignment_id, quantity, start_time, end_time, checked_out_at, return_date) VALUES
(1, 1, 1, '2024-07-01 09:00:00', '2024-07-01 12:00:00', '2024-07-01 08:45:00', '2024-07-01')
WHERE NOT EXISTS (SELECT 1 FROM task_resource_assignments WHERE task_id = 1 AND project_assignment_id = 1);

INSERT INTO task_resource_assignments (task_id, project_assignment_id, quantity, start_time, end_time, checked_out_at, return_date) VALUES
(2, 2, 1, '2024-07-01 13:00:00', '2024-07-01 17:00:00', '2024-07-01 12:45:00', '2024-07-01')
WHERE NOT EXISTS (SELECT 1 FROM task_resource_assignments WHERE task_id = 2 AND project_assignment_id = 2); 