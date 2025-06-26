-- contract_participants.sql
-- Table definitions for contract participants

-- Contract Participants table to link participants to contracts
CREATE TABLE IF NOT EXISTS contract_participants (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL,
    participant_type VARCHAR(50) NOT NULL, -- 'employee', 'client', 'other'
    participant_id INTEGER, -- ID from employees, clients, or other tables
    participant_name VARCHAR(255), -- Name for participants not in other tables
    role VARCHAR(100),
    email VARCHAR(255),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contract_participants_contract_id ON contract_participants(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_participants_type ON contract_participants(participant_type);
CREATE INDEX IF NOT EXISTS idx_contract_participants_participant_id ON contract_participants(participant_id);

-- Sample data for contract participants
INSERT INTO contract_participants (contract_id, participant_type, participant_id, participant_name, role, email) VALUES
(1, 'employee', 1, NULL, 'Contract Manager', 'john.doe@example.com'),
(1, 'client', 1, NULL, 'Client Representative', 'client1@example.com'),
(2, 'employee', 2, NULL, 'Technical Lead', 'jane.smith@example.com'),
(2, 'other', NULL, 'External Consultant', 'Consultant', 'consultant@example.com'),
(3, 'employee', 3, NULL, 'Project Manager', 'bob.johnson@example.com'),
(3, 'client', 2, NULL, 'Client Contact', 'client2@example.com'),
(4, 'employee', 1, NULL, 'HR Representative', 'hr@example.com'),
(5, 'employee', 2, NULL, 'Operations Manager', 'ops@example.com'),
(5, 'other', NULL, 'Vendor Representative', 'Vendor', 'vendor@example.com'); 