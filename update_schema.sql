-- Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles if they don't exist
INSERT INTO roles (name, description) VALUES 
    ('admin', 'Administrator with full access'),
    ('manager', 'Manager with elevated permissions'),
    ('employee', 'Regular employee'),
    ('client', 'Client user')
ON CONFLICT (name) DO NOTHING;

-- Add role_id column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id);

-- Update existing users to have admin role
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'admin') WHERE role_id IS NULL;