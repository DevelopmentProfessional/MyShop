-- Projects & Project Management Schema (Idempotent)

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    project_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_template BOOLEAN DEFAULT FALSE,
    roi NUMERIC(10,2),
    swot TEXT,
    review_status VARCHAR(30) DEFAULT 'pending',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    team_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- Team members (many-to-many: teams <-> employees)
CREATE TABLE IF NOT EXISTS team_members (
    team_id INT REFERENCES teams(team_id) ON DELETE CASCADE,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, employee_id)
);

-- Project-Team assignment (many-to-many)
CREATE TABLE IF NOT EXISTS project_teams (
    project_id INT REFERENCES projects(project_id) ON DELETE CASCADE,
    team_id INT REFERENCES teams(team_id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, team_id)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    task_id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(project_id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    assigned_team_id INT REFERENCES teams(team_id),
    assigned_to INT REFERENCES employees(id),
    claimed_by INT REFERENCES employees(id),
    status VARCHAR(30) DEFAULT 'pending',
    is_milestone BOOLEAN DEFAULT FALSE,
    successor_task_id INT REFERENCES tasks(task_id),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task comments
CREATE TABLE IF NOT EXISTS task_comments (
    comment_id SERIAL PRIMARY KEY,
    task_id INT REFERENCES tasks(task_id) ON DELETE CASCADE,
    author_id INT REFERENCES employees(id),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resources (assets/facilities)
CREATE TABLE IF NOT EXISTS resources (
    resource_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50), -- 'asset' or 'facility'
    description TEXT
);

-- Task-Resource linking (many-to-many)
CREATE TABLE IF NOT EXISTS task_resources (
    task_id INT REFERENCES tasks(task_id) ON DELETE CASCADE,
    resource_id INT REFERENCES resources(resource_id) ON DELETE CASCADE,
    checked_out_at TIMESTAMP,
    checked_in_at TIMESTAMP,
    PRIMARY KEY (task_id, resource_id)
);

-- Employees (assume already exists, but create if not)
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    supervisor_id INT,
    department VARCHAR(100)
);

-- Insert sample employees if table is empty
INSERT INTO employees (id, name, email, role)
SELECT 1, 'John Doe', 'john.doe@example.com', 'Manager'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE id = 1);
INSERT INTO employees (id, name, email, role)
SELECT 2, 'Jane Smith', 'jane.smith@example.com', 'HR'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE id = 2);
INSERT INTO employees (id, name, email, role)
SELECT 3, 'Alice Johnson', 'alice.johnson@example.com', 'IT'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE id = 3);

-- Insert sample teams if table is empty
INSERT INTO teams (name, description)
SELECT 'IT Support', 'Handles all IT support requests'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'IT Support');
INSERT INTO teams (name, description)
SELECT 'HR Team', 'Handles HR-related projects'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'HR Team');
INSERT INTO teams (name, description)
SELECT 'Orientation', 'Mixed team for onboarding projects'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Orientation');

-- Insert sample team members if table is empty
INSERT INTO team_members (team_id, employee_id)
SELECT 1, 1 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = 1 AND employee_id = 1);
INSERT INTO team_members (team_id, employee_id)
SELECT 1, 2 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = 1 AND employee_id = 2);
INSERT INTO team_members (team_id, employee_id)
SELECT 2, 2 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = 2 AND employee_id = 2);
INSERT INTO team_members (team_id, employee_id)
SELECT 2, 3 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = 2 AND employee_id = 3);
INSERT INTO team_members (team_id, employee_id)
SELECT 3, 1 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = 3 AND employee_id = 1);
INSERT INTO team_members (team_id, employee_id)
SELECT 3, 3 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = 3 AND employee_id = 3);

-- Insert sample projects if table is empty
INSERT INTO projects (name, description, is_template, roi, swot, review_status, created_by)
SELECT 'Onboarding Automation', 'Automate onboarding process for new hires', FALSE, 12000.00, 'Strengths: Efficient, Weaknesses: Initial cost', 'pending', 1
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Onboarding Automation');
INSERT INTO projects (name, description, is_template, roi, swot, review_status, created_by)
SELECT 'IT Ticketing System', 'Implement a new IT ticketing system', TRUE, 20000.00, 'Strengths: Scalable, Opportunities: Integration', 'pending', 2
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'IT Ticketing System');

-- Insert sample project teams if table is empty
INSERT INTO project_teams (project_id, team_id)
SELECT 1, 3 WHERE NOT EXISTS (SELECT 1 FROM project_teams WHERE project_id = 1 AND team_id = 3);
INSERT INTO project_teams (project_id, team_id)
SELECT 2, 1 WHERE NOT EXISTS (SELECT 1 FROM project_teams WHERE project_id = 2 AND team_id = 1);

-- Insert sample resources if table is empty
INSERT INTO resources (name, type, description)
SELECT 'Dell Laptop', 'asset', 'Laptop for project work'
WHERE NOT EXISTS (SELECT 1 FROM resources WHERE name = 'Dell Laptop');
INSERT INTO resources (name, type, description)
SELECT 'Conference Room A', 'facility', 'Main meeting room'
WHERE NOT EXISTS (SELECT 1 FROM resources WHERE name = 'Conference Room A');

-- Insert sample tasks if table is empty
INSERT INTO tasks (project_id, title, description, assigned_team_id, assigned_to, is_milestone, start_time, end_time, status)
SELECT 1, 'Prepare onboarding materials', 'Gather and prepare all onboarding documents', 3, 1, TRUE, '2024-07-01 09:00', '2024-07-01 12:00', 'completed'
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Prepare onboarding materials');
INSERT INTO tasks (project_id, title, description, assigned_team_id, assigned_to, is_milestone, start_time, end_time, status)
SELECT 1, 'Set up accounts', 'Create user accounts for new hires', 3, 3, FALSE, '2024-07-01 13:00', NULL, 'in_progress'
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Set up accounts');
INSERT INTO tasks (project_id, title, description, assigned_team_id, assigned_to, is_milestone, start_time, end_time, status)
SELECT 2, 'Design ticket workflow', 'Draft the IT ticket workflow', 1, 2, TRUE, '2024-07-02 10:00', NULL, 'pending'
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Design ticket workflow');

-- Insert sample task resources if table is empty
INSERT INTO task_resources (task_id, resource_id, checked_out_at)
SELECT 1, 1, '2024-07-01 09:00' WHERE NOT EXISTS (SELECT 1 FROM task_resources WHERE task_id = 1 AND resource_id = 1);
INSERT INTO task_resources (task_id, resource_id, checked_out_at)
SELECT 2, 2, '2024-07-01 13:00' WHERE NOT EXISTS (SELECT 1 FROM task_resources WHERE task_id = 2 AND resource_id = 2);

-- Insert sample task comments if table is empty
INSERT INTO task_comments (task_id, author_id, comment)
SELECT 1, 1, 'All onboarding materials prepared and uploaded.'
WHERE NOT EXISTS (SELECT 1 FROM task_comments WHERE task_id = 1 AND author_id = 1);
INSERT INTO task_comments (task_id, author_id, comment)
SELECT 2, 3, 'Accounts setup started, waiting for HR approval.'
WHERE NOT EXISTS (SELECT 1 FROM task_comments WHERE task_id = 2 AND author_id = 3);

-- Project review comments
CREATE TABLE IF NOT EXISTS project_comments (
    comment_id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(project_id) ON DELETE CASCADE,
    author_id INT REFERENCES employees(id),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample project comments if table is empty
INSERT INTO project_comments (project_id, author_id, comment)
SELECT 1, 1, 'Great progress on onboarding automation!'
WHERE NOT EXISTS (SELECT 1 FROM project_comments WHERE project_id = 1 AND author_id = 1);
INSERT INTO project_comments (project_id, author_id, comment)
SELECT 2, 2, 'Ticketing system design looks good.'
WHERE NOT EXISTS (SELECT 1 FROM project_comments WHERE project_id = 2 AND author_id = 2);

-- Add more employees for departments
INSERT INTO employees (id, name, email, role, department)
SELECT 20, 'Olivia Brown', 'olivia.brown@myshop.com', 'HR Specialist', 'HR'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE id = 20);
INSERT INTO employees (id, name, email, role, department)
SELECT 21, 'Ethan Miller', 'ethan.miller@myshop.com', 'Payroll Clerk', 'HR'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE id = 21);
INSERT INTO employees (id, name, email, role, department)
SELECT 22, 'Sophia Lee', 'sophia.lee@myshop.com', 'Finance Analyst', 'Finance'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE id = 22);
INSERT INTO employees (id, name, email, role, department)
SELECT 23, 'William Garcia', 'william.garcia@myshop.com', 'Accountant', 'Finance'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE id = 23);
INSERT INTO employees (id, name, email, role, department)
SELECT 24, 'Mia Martinez', 'mia.martinez@myshop.com', 'IT Support', 'IT'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE id = 24);
INSERT INTO employees (id, name, email, role, department)
SELECT 25, 'Benjamin Davis', 'benjamin.davis@myshop.com', 'Developer', 'IT'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE id = 25);
INSERT INTO employees (id, name, email, role, department)
SELECT 26, 'Charlotte Wilson', 'charlotte.wilson@myshop.com', 'Facilities Manager', 'Facilities'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE id = 26);
INSERT INTO employees (id, name, email, role, department)
SELECT 27, 'James Anderson', 'james.anderson@myshop.com', 'Maintenance Staff', 'Facilities'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE id = 27);
INSERT INTO employees (id, name, email, role, department)
SELECT 28, 'Amelia Thomas', 'amelia.thomas@myshop.com', 'Storekeeper', 'Storehouse'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE id = 28);
INSERT INTO employees (id, name, email, role, department)
SELECT 29, 'Lucas Moore', 'lucas.moore@myshop.com', 'Inventory Clerk', 'Storehouse'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE id = 29);

-- Add department teams
INSERT INTO teams (name, description)
SELECT 'HR Team', 'Handles HR-related projects'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'HR Team');
INSERT INTO teams (name, description)
SELECT 'Finance Team', 'Handles financial operations'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Finance Team');
INSERT INTO teams (name, description)
SELECT 'IT Team', 'Handles IT operations and support'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'IT Team');
INSERT INTO teams (name, description)
SELECT 'Facilities Team', 'Manages facilities and maintenance'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Facilities Team');
INSERT INTO teams (name, description)
SELECT 'Storehouse Team', 'Manages inventory and storehouse'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Storehouse Team');

-- Add smaller teams within departments
INSERT INTO teams (name, description)
SELECT 'Payroll Team', 'Handles payroll and compensation (HR)'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Payroll Team');
INSERT INTO teams (name, description)
SELECT 'Programming Team', 'Handles software development (IT)'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Programming Team');
INSERT INTO teams (name, description)
SELECT 'Maintenance Crew', 'Handles facility maintenance (Facilities)'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Maintenance Crew');
INSERT INTO teams (name, description)
SELECT 'Inventory Audit Team', 'Audits inventory (Storehouse)'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Inventory Audit Team');

-- Assign employees to teams (team_members)
-- HR Team
INSERT INTO team_members (team_id, employee_id)
SELECT (SELECT team_id FROM teams WHERE name = 'HR Team'), 20 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = (SELECT team_id FROM teams WHERE name = 'HR Team') AND employee_id = 20);
INSERT INTO team_members (team_id, employee_id)
SELECT (SELECT team_id FROM teams WHERE name = 'HR Team'), 21 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = (SELECT team_id FROM teams WHERE name = 'HR Team') AND employee_id = 21);
-- Finance Team
INSERT INTO team_members (team_id, employee_id)
SELECT (SELECT team_id FROM teams WHERE name = 'Finance Team'), 22 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = (SELECT team_id FROM teams WHERE name = 'Finance Team') AND employee_id = 22);
INSERT INTO team_members (team_id, employee_id)
SELECT (SELECT team_id FROM teams WHERE name = 'Finance Team'), 23 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = (SELECT team_id FROM teams WHERE name = 'Finance Team') AND employee_id = 23);
-- IT Team
INSERT INTO team_members (team_id, employee_id)
SELECT (SELECT team_id FROM teams WHERE name = 'IT Team'), 24 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = (SELECT team_id FROM teams WHERE name = 'IT Team') AND employee_id = 24);
INSERT INTO team_members (team_id, employee_id)
SELECT (SELECT team_id FROM teams WHERE name = 'IT Team'), 25 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = (SELECT team_id FROM teams WHERE name = 'IT Team') AND employee_id = 25);
-- Facilities Team
INSERT INTO team_members (team_id, employee_id)
SELECT (SELECT team_id FROM teams WHERE name = 'Facilities Team'), 26 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = (SELECT team_id FROM teams WHERE name = 'Facilities Team') AND employee_id = 26);
INSERT INTO team_members (team_id, employee_id)
SELECT (SELECT team_id FROM teams WHERE name = 'Facilities Team'), 27 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = (SELECT team_id FROM teams WHERE name = 'Facilities Team') AND employee_id = 27);
-- Storehouse Team
INSERT INTO team_members (team_id, employee_id)
SELECT (SELECT team_id FROM teams WHERE name = 'Storehouse Team'), 28 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = (SELECT team_id FROM teams WHERE name = 'Storehouse Team') AND employee_id = 28);
INSERT INTO team_members (team_id, employee_id)
SELECT (SELECT team_id FROM teams WHERE name = 'Storehouse Team'), 29 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = (SELECT team_id FROM teams WHERE name = 'Storehouse Team') AND employee_id = 29);
-- Payroll Team (HR)
INSERT INTO team_members (team_id, employee_id)
SELECT (SELECT team_id FROM teams WHERE name = 'Payroll Team'), 20 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = (SELECT team_id FROM teams WHERE name = 'Payroll Team') AND employee_id = 20);
INSERT INTO team_members (team_id, employee_id)
SELECT (SELECT team_id FROM teams WHERE name = 'Payroll Team'), 21 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = (SELECT team_id FROM teams WHERE name = 'Payroll Team') AND employee_id = 21);
-- Programming Team (IT)
INSERT INTO team_members (team_id, employee_id)
SELECT (SELECT team_id FROM teams WHERE name = 'Programming Team'), 24 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = (SELECT team_id FROM teams WHERE name = 'Programming Team') AND employee_id = 24);
INSERT INTO team_members (team_id, employee_id)
SELECT (SELECT team_id FROM teams WHERE name = 'Programming Team'), 25 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = (SELECT team_id FROM teams WHERE name = 'Programming Team') AND employee_id = 25);
-- Maintenance Crew (Facilities)
INSERT INTO team_members (team_id, employee_id)
SELECT (SELECT team_id FROM teams WHERE name = 'Maintenance Crew'), 26 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = (SELECT team_id FROM teams WHERE name = 'Maintenance Crew') AND employee_id = 26);
INSERT INTO team_members (team_id, employee_id)
SELECT (SELECT team_id FROM teams WHERE name = 'Maintenance Crew'), 27 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = (SELECT team_id FROM teams WHERE name = 'Maintenance Crew') AND employee_id = 27);
-- Inventory Audit Team (Storehouse)
INSERT INTO team_members (team_id, employee_id)
SELECT (SELECT team_id FROM teams WHERE name = 'Inventory Audit Team'), 28 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = (SELECT team_id FROM teams WHERE name = 'Inventory Audit Team') AND employee_id = 28);
INSERT INTO team_members (team_id, employee_id)
SELECT (SELECT team_id FROM teams WHERE name = 'Inventory Audit Team'), 29 WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = (SELECT team_id FROM teams WHERE name = 'Inventory Audit Team') AND employee_id = 29); 