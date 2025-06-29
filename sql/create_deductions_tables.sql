-- Create deductions table (master list of available deductions)
CREATE TABLE IF NOT EXISTS deductions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    description TEXT,
    value DECIMAL(10,2) NOT NULL,
    value_type VARCHAR(50) NOT NULL, -- 'percent' or 'fixed'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create employee_deductions table (junction table)
CREATE TABLE IF NOT EXISTS employee_deductions (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    deduction_id INTEGER NOT NULL,
    deduction_type VARCHAR(50) DEFAULT 'standard', -- Optional field for different deduction types
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (deduction_id) REFERENCES deductions(id) ON DELETE CASCADE,
    UNIQUE(employee_id, deduction_id)
);

-- Insert sample deductions data
INSERT INTO deductions (name, type, description, value, value_type) VALUES
('Federal Income Tax', 'Tax', 'Federal income tax withholding', 22.00, 'percent'),
('State Income Tax', 'Tax', 'State income tax withholding', 5.00, 'percent'),
('Social Security Tax', 'Tax', 'Social Security tax (FICA)', 6.20, 'percent'),
('Medicare Tax', 'Tax', 'Medicare tax (FICA)', 1.45, 'percent'),
('Health Insurance Premium', 'Insurance', 'Employee contribution to health insurance', 150.00, 'fixed'),
('Dental Insurance Premium', 'Insurance', 'Employee contribution to dental insurance', 25.00, 'fixed'),
('Vision Insurance Premium', 'Insurance', 'Employee contribution to vision insurance', 15.00, 'fixed'),
('401(k) Contribution', 'Retirement', 'Employee 401(k) contribution', 5.00, 'percent'),
('HSA Contribution', 'Health', 'Health Savings Account contribution', 100.00, 'fixed'),
('Garnishment', 'Legal', 'Court-ordered wage garnishment', 200.00, 'fixed'),
('Union Dues', 'Membership', 'Union membership dues', 50.00, 'fixed'),
('Parking Fee', 'Transportation', 'Employee parking fee', 75.00, 'fixed'),
('Meal Plan', 'Food', 'Company cafeteria meal plan', 80.00, 'fixed'),
('Uniform Fee', 'Equipment', 'Work uniform rental/purchase', 30.00, 'fixed'),
('Training Fee', 'Education', 'Required training or certification fee', 25.00, 'fixed')
ON CONFLICT (id) DO NOTHING;

-- Insert sample employee deductions assignments
-- Assuming we have employees with IDs 1-5, assign them various deductions
INSERT INTO employee_deductions (employee_id, deduction_id, deduction_type) VALUES
-- Employee 1: Standard deductions
(1, 1, 'standard'), -- Federal Income Tax
(1, 2, 'standard'), -- State Income Tax
(1, 3, 'standard'), -- Social Security Tax
(1, 4, 'standard'), -- Medicare Tax
(1, 5, 'standard'), -- Health Insurance Premium
(1, 8, 'standard'), -- 401(k) Contribution

-- Employee 2: Additional insurance deductions
(2, 1, 'standard'), -- Federal Income Tax
(2, 2, 'standard'), -- State Income Tax
(2, 3, 'standard'), -- Social Security Tax
(2, 4, 'standard'), -- Medicare Tax
(2, 5, 'standard'), -- Health Insurance Premium
(2, 6, 'standard'), -- Dental Insurance Premium
(2, 7, 'standard'), -- Vision Insurance Premium
(2, 8, 'standard'), -- 401(k) Contribution
(2, 9, 'standard'), -- HSA Contribution

-- Employee 3: Senior level with more deductions
(3, 1, 'standard'), -- Federal Income Tax
(3, 2, 'standard'), -- State Income Tax
(3, 3, 'standard'), -- Social Security Tax
(3, 4, 'standard'), -- Medicare Tax
(3, 5, 'standard'), -- Health Insurance Premium
(3, 6, 'standard'), -- Dental Insurance Premium
(3, 7, 'standard'), -- Vision Insurance Premium
(3, 8, 'standard'), -- 401(k) Contribution
(3, 9, 'standard'), -- HSA Contribution
(3, 12, 'standard'), -- Parking Fee
(3, 13, 'standard'), -- Meal Plan

-- Employee 4: Manager with union dues
(4, 1, 'standard'), -- Federal Income Tax
(4, 2, 'standard'), -- State Income Tax
(4, 3, 'standard'), -- Social Security Tax
(4, 4, 'standard'), -- Medicare Tax
(4, 5, 'standard'), -- Health Insurance Premium
(4, 8, 'standard'), -- 401(k) Contribution
(4, 11, 'standard'), -- Union Dues
(4, 12, 'standard'), -- Parking Fee

-- Employee 5: Executive with garnishment
(5, 1, 'standard'), -- Federal Income Tax
(5, 2, 'standard'), -- State Income Tax
(5, 3, 'standard'), -- Social Security Tax
(5, 4, 'standard'), -- Medicare Tax
(5, 5, 'standard'), -- Health Insurance Premium
(5, 6, 'standard'), -- Dental Insurance Premium
(5, 7, 'standard'), -- Vision Insurance Premium
(5, 8, 'standard'), -- 401(k) Contribution
(5, 9, 'standard'), -- HSA Contribution
(5, 10, 'legal'), -- Garnishment
(5, 12, 'standard'), -- Parking Fee
(5, 13, 'standard'), -- Meal Plan
(5, 14, 'standard'), -- Uniform Fee
(5, 15, 'standard') -- Training Fee
ON CONFLICT (employee_id, deduction_id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deductions_active ON deductions(is_active);
CREATE INDEX IF NOT EXISTS idx_deductions_type ON deductions(type);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_employee ON employee_deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_deduction ON employee_deductions(deduction_id); 