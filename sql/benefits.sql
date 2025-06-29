-- Benefits System Database Schema
-- This schema supports employee benefits management

-- Benefits table (master list of available benefits)
CREATE TABLE IF NOT EXISTS benefits (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee benefits table (assignments of benefits to employees)
CREATE TABLE IF NOT EXISTS employee_benefits (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    benefit_id INTEGER NOT NULL,
    benefit_level VARCHAR(50) DEFAULT 'Standard',
    value DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(20),
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (benefit_id) REFERENCES benefits(id) ON DELETE CASCADE,
    UNIQUE (employee_id, benefit_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_benefits_active ON benefits(is_active);
CREATE INDEX IF NOT EXISTS idx_employee_benefits_employee ON employee_benefits(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_benefits_active ON employee_benefits(is_active);
CREATE INDEX IF NOT EXISTS idx_employee_benefits_date_range ON employee_benefits(start_date, end_date);

-- Sample benefits data
INSERT INTO benefits (name, type, description) VALUES
('Health Insurance', 'Insurance', 'Comprehensive health coverage including medical, dental, and vision'),
('Life Insurance', 'Insurance', 'Term life insurance coverage'),
('Retirement Plan', 'Retirement', '401(k) retirement savings plan with employer matching'),
('Paid Time Off', 'Time Off', 'Annual paid vacation and sick leave'),
('Professional Development', 'Education', 'Tuition reimbursement and training programs'),
('Gym Membership', 'Wellness', 'Fitness center membership reimbursement'),
('Transportation Allowance', 'Transportation', 'Monthly public transit or parking allowance'),
('Meal Allowance', 'Food', 'Daily meal allowance for work days'),
('Child Care Assistance', 'Family', 'Child care expense reimbursement'),
('Home Office Allowance', 'Equipment', 'Monthly allowance for home office expenses')
ON CONFLICT (id) DO NOTHING;

-- Sample employee benefits assignments (assuming employees with IDs 1-5 exist)
INSERT INTO employee_benefits (employee_id, benefit_id, benefit_level, value, unit) VALUES
-- Employee 1 benefits
(1, 1, 'Premium', 500.00, 'USD/month'),
(1, 2, 'Standard', 100000.00, 'USD'),
(1, 3, 'Enhanced', 6.00, '% match'),
(1, 4, 'Standard', 20.00, 'days/year'),
(1, 5, 'Standard', 5000.00, 'USD/year'),

-- Employee 2 benefits
(2, 1, 'Standard', 400.00, 'USD/month'),
(2, 2, 'Basic', 50000.00, 'USD'),
(2, 3, 'Standard', 4.00, '% match'),
(2, 4, 'Standard', 15.00, 'days/year'),
(2, 6, 'Standard', 50.00, 'USD/month'),

-- Employee 3 benefits
(3, 1, 'Premium', 500.00, 'USD/month'),
(3, 2, 'Enhanced', 200000.00, 'USD'),
(3, 3, 'Enhanced', 6.00, '% match'),
(3, 4, 'Enhanced', 25.00, 'days/year'),
(3, 5, 'Enhanced', 7500.00, 'USD/year'),
(3, 7, 'Standard', 100.00, 'USD/month'),
(3, 8, 'Standard', 15.00, 'USD/day'),

-- Employee 4 benefits
(4, 1, 'Basic', 300.00, 'USD/month'),
(4, 3, 'Standard', 4.00, '% match'),
(4, 4, 'Basic', 10.00, 'days/year'),
(4, 9, 'Standard', 200.00, 'USD/month'),

-- Employee 5 benefits
(5, 1, 'Standard', 400.00, 'USD/month'),
(5, 2, 'Standard', 100000.00, 'USD'),
(5, 3, 'Standard', 4.00, '% match'),
(5, 4, 'Standard', 15.00, 'days/year'),
(5, 10, 'Standard', 100.00, 'USD/month')
ON CONFLICT (employee_id, benefit_id) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to benefits tables
CREATE TRIGGER update_benefits_updated_at BEFORE UPDATE ON benefits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_benefits_updated_at BEFORE UPDATE ON employee_benefits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for easier querying of employee benefits
CREATE OR REPLACE VIEW employee_benefits_view AS
SELECT 
    eb.id,
    eb.employee_id,
    e.name as employee_name,
    eb.benefit_id,
    b.name as benefit_name,
    b.type as benefit_type,
    b.description as benefit_description,
    eb.benefit_level,
    eb.value,
    eb.unit,
    eb.start_date,
    eb.end_date,
    eb.is_active
FROM employee_benefits eb
JOIN employees e ON eb.employee_id = e.id
JOIN benefits b ON eb.benefit_id = b.id
WHERE eb.is_active = TRUE AND b.is_active = TRUE; 