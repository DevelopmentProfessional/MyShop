-- Contracts Management System Tables

-- 1. Contracts table to store all contract information
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    contract_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    department VARCHAR(100),
    description TEXT,
    contract_document BYTEA, -- BLOB to store PDF document
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    assigned_employee_id INTEGER,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATE,
    is_active BOOLEAN DEFAULT true,
    FOREIGN KEY (assigned_employee_id) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE RESTRICT
);

-- 2. Contract History table to track all changes and activities
CREATE TABLE IF NOT EXISTS contract_history (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL,
    action_type VARCHAR(100) NOT NULL, -- 'created', 'assigned', 'unassigned', 'signed', 'commented', 'status_changed', 'exported'
    action_description TEXT,
    performed_by INTEGER NOT NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    old_value TEXT,
    new_value TEXT,
    metadata JSONB, -- Store additional data like signature coordinates, comment details, etc.
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES employees(id) ON DELETE RESTRICT
);

-- 3. Signatures table to store employee signatures
CREATE TABLE IF NOT EXISTS signatures (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    signature_data TEXT NOT NULL, -- Base64 encoded signature
    signature_name VARCHAR(100) NOT NULL, -- Name to display with signature
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE(employee_id, signature_name)
);

-- 4. Contract Signatures table to link signatures to specific contracts
CREATE TABLE IF NOT EXISTS contract_signatures (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL,
    signature_id INTEGER NOT NULL,
    signed_by INTEGER NOT NULL,
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    signature_position JSONB, -- Store x,y coordinates and page number
    signature_comment TEXT,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (signature_id) REFERENCES signatures(id) ON DELETE CASCADE,
    FOREIGN KEY (signed_by) REFERENCES employees(id) ON DELETE RESTRICT
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contracts_assigned_employee ON contracts(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_type ON contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_contracts_department ON contracts(department);
CREATE INDEX IF NOT EXISTS idx_contracts_expires_at ON contracts(expires_at);
CREATE INDEX IF NOT EXISTS idx_contract_history_contract_id ON contract_history(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_history_action_type ON contract_history(action_type);
CREATE INDEX IF NOT EXISTS idx_contract_history_performed_at ON contract_history(performed_at);
CREATE INDEX IF NOT EXISTS idx_signatures_employee_id ON signatures(employee_id);
CREATE INDEX IF NOT EXISTS idx_contract_signatures_contract_id ON contract_signatures(contract_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_signatures_updated_at BEFORE UPDATE ON signatures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing
INSERT INTO contracts (title, contract_type, status, department, description, assigned_employee_id, created_by, expires_at) VALUES
('Office Cleaning Services Agreement', 'Service Agreement', 'active', 'Facilities', 'Contract for office cleaning services', 1, 1, '2024-12-31'),
('Software License Agreement', 'Vendor Contract', 'pending', 'IT', 'License agreement for software vendor', 2, 1, '2025-06-30'),
('Office Lease Agreement', 'Lease Agreement', 'active', 'Finance', 'Office space lease agreement', 3, 1, '2024-11-30'),
('Employee Handbook Agreement', 'HR Contract', 'active', 'Human Resources', 'Employee handbook acknowledgment', NULL, 1, '2025-12-31'),
('Vendor Service Contract', 'Service Agreement', 'draft', 'Operations', 'Vendor service agreement draft', NULL, 1, '2025-03-15');

-- Sample signatures
INSERT INTO signatures (employee_id, signature_data, signature_name, is_default) VALUES
(1, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'John Doe', true),
(2, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'Jane Smith', true),
(3, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'Bob Johnson', true); 