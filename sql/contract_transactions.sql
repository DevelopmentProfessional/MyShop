-- contract_transactions.sql
-- Table to link contracts to existing transactions (both one-time and recurring)

-- Drop existing tables if they exist (since we're restructuring)
DROP TABLE IF EXISTS contract_assets CASCADE;
DROP TABLE IF EXISTS contract_participants CASCADE;

-- Create contract_transactions table for linking contracts to transactions
CREATE TABLE IF NOT EXISTS contract_transactions (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- 'one-time' or 'recurring'
    transaction_id INTEGER NOT NULL,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

-- Recreate contract_assets table
CREATE TABLE IF NOT EXISTS contract_assets (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL,
    asset_id INTEGER NOT NULL,
    role VARCHAR(100),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    UNIQUE(contract_id, asset_id)
);

-- Recreate contract_participants table
CREATE TABLE IF NOT EXISTS contract_participants (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL,
    participant_type VARCHAR(50) NOT NULL,
    participant_id INTEGER,
    participant_name VARCHAR(255),
    role VARCHAR(100),
    email VARCHAR(255),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contract_transactions_contract_id ON contract_transactions(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_transactions_type ON contract_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_contract_transactions_transaction_id ON contract_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_contract_assets_contract_id ON contract_assets(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_assets_asset_id ON contract_assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_contract_participants_contract_id ON contract_participants(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_participants_type ON contract_participants(participant_type);
CREATE INDEX IF NOT EXISTS idx_contract_participants_participant_id ON contract_participants(participant_id);

-- Sample data for contract transactions
INSERT INTO contract_transactions (contract_id, transaction_type, transaction_id) VALUES
(1, 'recurring', 1),
(1, 'one-time', 1),
(2, 'recurring', 2),
(3, 'one-time', 2); 