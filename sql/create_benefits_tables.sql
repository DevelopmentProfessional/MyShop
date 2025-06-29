-- Create basic benefits tables if they don't exist
-- This is a minimal structure that will work with the current API

-- Create benefits table with level-based values and single unit column
CREATE TABLE IF NOT EXISTS benefits (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    description TEXT,
    unit VARCHAR(50), -- Single unit column for all levels
    level_1_value DECIMAL(10,2),
    level_2_value DECIMAL(10,2),
    level_3_value DECIMAL(10,2),
    level_4_value DECIMAL(10,2),
    level_5_value DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create employee_benefits table (junction table)
CREATE TABLE IF NOT EXISTS employee_benefits (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    benefit_id INTEGER NOT NULL,
    benefit_level VARCHAR(10) NOT NULL DEFAULT '1', -- References level_1, level_2, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (benefit_id) REFERENCES benefits(id) ON DELETE CASCADE,
    UNIQUE(employee_id, benefit_id)
);

-- Insert sample benefits data with single unit column
INSERT INTO benefits (name, type, description, unit, level_1_value, level_2_value, level_3_value, level_4_value, level_5_value) VALUES
('Health Insurance', 'Insurance', 'Comprehensive health coverage including medical, dental, and vision', 'monthly', 500.00, 750.00, 1000.00, 1250.00, 1500.00),
('Retirement Plan', 'Retirement', '401(k) matching contribution', 'percent', 3.00, 4.00, 5.00, 6.00, 7.00),
('Paid Time Off', 'Time Off', 'Annual paid vacation and sick days', 'days', 15.00, 20.00, 25.00, 30.00, 35.00),
('Professional Development', 'Education', 'Annual budget for courses, conferences, and certifications', 'dollars', 1000.00, 2000.00, 3000.00, 4000.00, 5000.00),
('Gym Membership', 'Wellness', 'Fitness center membership or wellness program', 'monthly', 50.00, 75.00, 100.00, 125.00, 150.00),
('Transportation Allowance', 'Transportation', 'Monthly allowance for public transit or parking', 'monthly', 100.00, 150.00, 200.00, 250.00, 300.00),
('Life Insurance', 'Insurance', 'Term life insurance coverage', 'dollars', 50000.00, 75000.00, 100000.00, 150000.00, 200000.00),
('Disability Insurance', 'Insurance', 'Short-term and long-term disability coverage', 'percent', 60.00, 70.00, 80.00, 90.00, 100.00),
('Stock Options', 'Equity', 'Company stock options or RSUs', 'shares', 1000.00, 2000.00, 3000.00, 4000.00, 5000.00),
('Childcare Assistance', 'Family', 'Subsidized childcare or dependent care FSA', 'monthly', 200.00, 300.00, 400.00, 500.00, 600.00)
ON CONFLICT (id) DO NOTHING;

-- Insert sample employee benefits assignments
-- Assuming we have employees with IDs 1-5, assign them various benefit levels
INSERT INTO employee_benefits (employee_id, benefit_id, benefit_level) VALUES
-- Employee 1: Entry level benefits
(1, 1, '1'), -- Health Insurance Level 1
(1, 2, '1'), -- Retirement Plan Level 1
(1, 3, '1'), -- PTO Level 1
(1, 4, '1'), -- Professional Development Level 1

-- Employee 2: Mid-level benefits
(2, 1, '2'), -- Health Insurance Level 2
(2, 2, '2'), -- Retirement Plan Level 2
(2, 3, '2'), -- PTO Level 2
(2, 4, '2'), -- Professional Development Level 2
(2, 5, '2'), -- Gym Membership Level 2

-- Employee 3: Senior level benefits
(3, 1, '3'), -- Health Insurance Level 3
(3, 2, '3'), -- Retirement Plan Level 3
(3, 3, '3'), -- PTO Level 3
(3, 4, '3'), -- Professional Development Level 3
(3, 5, '3'), -- Gym Membership Level 3
(3, 6, '3'), -- Transportation Level 3
(3, 7, '3'), -- Life Insurance Level 3

-- Employee 4: Manager level benefits
(4, 1, '4'), -- Health Insurance Level 4
(4, 2, '4'), -- Retirement Plan Level 4
(4, 3, '4'), -- PTO Level 4
(4, 4, '4'), -- Professional Development Level 4
(4, 5, '4'), -- Gym Membership Level 4
(4, 6, '4'), -- Transportation Level 4
(4, 7, '4'), -- Life Insurance Level 4
(4, 8, '4'), -- Disability Insurance Level 4
(4, 9, '4'), -- Stock Options Level 4

-- Employee 5: Executive level benefits
(5, 1, '5'), -- Health Insurance Level 5
(5, 2, '5'), -- Retirement Plan Level 5
(5, 3, '5'), -- PTO Level 5
(5, 4, '5'), -- Professional Development Level 5
(5, 5, '5'), -- Gym Membership Level 5
(5, 6, '5'), -- Transportation Level 5
(5, 7, '5'), -- Life Insurance Level 5
(5, 8, '5'), -- Disability Insurance Level 5
(5, 9, '5'), -- Stock Options Level 5
(5, 10, '5') -- Childcare Assistance Level 5
ON CONFLICT (employee_id, benefit_id) DO NOTHING; 