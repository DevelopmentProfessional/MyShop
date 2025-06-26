-- assets.sql
-- Table definitions for asset management

-- Assets table to store all company assets
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(100) NOT NULL,
    description TEXT,
    serial_number VARCHAR(100),
    purchase_date DATE,
    purchase_price DECIMAL(10,2),
    current_value DECIMAL(10,2),
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    assigned_to INTEGER,
    department VARCHAR(100),
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    warranty_expiry DATE,
    maintenance_schedule VARCHAR(100),
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE SET NULL
);

-- Contract Assets table to link assets to contracts
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

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assets_name ON assets(name);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_assigned_to ON assets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assets_department ON assets(department);
CREATE INDEX IF NOT EXISTS idx_contract_assets_contract_id ON contract_assets(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_assets_asset_id ON contract_assets(asset_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_assets_updated_at();

-- Sample data for assets
INSERT INTO assets (name, asset_type, description, serial_number, purchase_date, purchase_price, current_value, location, status, assigned_to, department, manufacturer, model, warranty_expiry) VALUES
('Dell Latitude 5520', 'Computer', 'Business laptop for office use', 'DL5520-2023-001', '2023-01-15', 1200.00, 900.00, 'IT Department', 'active', 1, 'IT', 'Dell', 'Latitude 5520', '2026-01-15'),
('HP LaserJet Pro M404n', 'Printer', 'Office printer for document printing', 'HP404N-2023-002', '2023-02-20', 350.00, 280.00, 'Reception Area', 'active', NULL, 'Administration', 'HP', 'LaserJet Pro M404n', '2025-02-20'),
('iPhone 14 Pro', 'Mobile Device', 'Company phone for business communications', 'IP14P-2023-003', '2023-03-10', 999.00, 750.00, 'Sales Department', 'active', 2, 'Sales', 'Apple', 'iPhone 14 Pro', '2025-03-10'),
('Office Desk Set', 'Furniture', 'Complete desk setup with chair and accessories', 'ODS-2023-004', '2023-01-05', 800.00, 600.00, 'Marketing Office', 'active', 3, 'Marketing', 'IKEA', 'Bekant Series', '2028-01-05'),
('Canon EOS R6', 'Camera', 'Professional camera for marketing and events', 'CER6-2023-005', '2023-04-15', 2500.00, 2000.00, 'Marketing Department', 'active', 3, 'Marketing', 'Canon', 'EOS R6', '2025-04-15'),
('Cisco Switch 2960', 'Network Equipment', 'Network switch for office connectivity', 'CS2960-2023-006', '2023-01-20', 500.00, 400.00, 'Server Room', 'active', 1, 'IT', 'Cisco', 'Catalyst 2960', '2026-01-20'),
('Samsung 55" Smart TV', 'Display', 'Conference room display for presentations', 'S55TV-2023-007', '2023-02-10', 800.00, 650.00, 'Conference Room A', 'active', NULL, 'Facilities', 'Samsung', 'QN55Q60B', '2025-02-10'),
('iPad Pro 12.9"', 'Tablet', 'Tablet for client presentations and field work', 'IP12P-2023-008', '2023-03-25', 1100.00, 850.00, 'Sales Department', 'active', 2, 'Sales', 'Apple', 'iPad Pro 12.9"', '2025-03-25'),
('Office Coffee Machine', 'Appliance', 'Commercial coffee machine for office use', 'Break Room', '2023-01-30', 1200.00, 900.00, 'Break Room', 'active', NULL, 'Facilities', 'Breville', 'BES870XL', '2025-01-30'),
('Security Camera System', 'Security Equipment', 'CCTV system for office security', 'Office Premises', '2023-02-15', 1500.00, 1200.00, 'Office Premises', 'active', NULL, 'Security', 'Hikvision', 'DS-2CD2142FWD-I', '2025-02-15'),
('Projector Epson EX3260', 'Display', 'Portable projector for presentations', 'Conference Room B', '2023-03-05', 400.00, 320.00, 'Conference Room B', 'active', NULL, 'Facilities', 'Epson', 'EX3260', '2025-03-05'),
('Standing Desk', 'Furniture', 'Adjustable standing desk for ergonomic workspace', 'HR Office', '2023-04-01', 600.00, 480.00, 'HR Office', 'active', 4, 'Human Resources', 'Uplift Desk', 'V2 Standing Desk', '2028-04-01'),
('Wireless Headset', 'Audio Equipment', 'Bluetooth headset for calls and meetings', 'Customer Service', '2023-01-25', 150.00, 120.00, 'Customer Service', 'active', 5, 'Customer Service', 'Jabra', 'Evolve 75', '2025-01-25'),
('File Cabinet', 'Furniture', '4-drawer filing cabinet for document storage', 'Finance Department', 'active', NULL, 'Finance', 'HON', '4-Drawer File Cabinet', '2028-02-28'),
('UPS Battery Backup', 'Power Equipment', 'Uninterruptible power supply for critical equipment', 'Server Room', '2023-03-20', 1, 'IT', 'APC', 'Back-UPS 1500VA', '2025-03-20');

-- Sample contract assets (linking assets to contracts)
INSERT INTO contract_assets (contract_id, asset_id, role) VALUES
(1, 1, 'Primary Workstation'),
(1, 2, 'Document Processing'),
(2, 3, 'Communication Device'),
(2, 8, 'Presentation Tool'),
(3, 4, 'Workstation Setup'),
(3, 12, 'Ergonomic Workspace'),
(4, 5, 'Marketing Equipment'),
(4, 6, 'Network Infrastructure'),
(5, 7, 'Presentation Display'),
(5, 11, 'Portable Display');

-- Update Assets Table with Salon Equipment
-- First, clear existing assets (optional - comment out if you want to keep existing)
-- DELETE FROM contract_assets;
-- DELETE FROM assets;

-- Insert salon-related assets
INSERT INTO assets (name, asset_type, description, location, current_value, status, serial_number, purchase_date, purchase_price, department, manufacturer, model, warranty_expiry, created_at, updated_at) VALUES
-- Hair Styling Equipment
('Hair Station 1', 'Hair Station', 'Professional hair styling station with mirror, chair, and storage', 'Main Salon Area', 2200.00, 'active', 'HS001', '2023-01-15', 2500.00, 'Hair Services', 'Salon Equipment Co', 'ProStyle 2000', '2025-01-15', NOW(), NOW()),
('Hair Station 2', 'Hair Station', 'Professional hair styling station with mirror, chair, and storage', 'Main Salon Area', 2200.00, 'active', 'HS002', '2023-01-15', 2500.00, 'Hair Services', 'Salon Equipment Co', 'ProStyle 2000', '2025-01-15', NOW(), NOW()),
('Hair Station 3', 'Hair Station', 'Professional hair styling station with mirror, chair, and storage', 'Main Salon Area', 2200.00, 'active', 'HS003', '2023-01-15', 2500.00, 'Hair Services', 'Salon Equipment Co', 'ProStyle 2000', '2025-01-15', NOW(), NOW()),

-- Nail Services Equipment
('Nail Station 1', 'Nail Station', 'Professional nail station with UV lamp and storage', 'Nail Area', 1600.00, 'active', 'NS001', '2023-02-10', 1800.00, 'Nail Services', 'NailTech Pro', 'Deluxe Nail Station', '2025-02-10', NOW(), NOW()),
('Nail Station 2', 'Nail Station', 'Professional nail station with UV lamp and storage', 'Nail Area', 1600.00, 'active', 'NS002', '2023-02-10', 1800.00, 'Nail Services', 'NailTech Pro', 'Deluxe Nail Station', '2025-02-10', NOW(), NOW()),
('Nail Station 3', 'Nail Station', 'Professional nail station with UV lamp and storage', 'Nail Area', 1600.00, 'active', 'NS003', '2023-02-10', 1800.00, 'Nail Services', 'NailTech Pro', 'Deluxe Nail Station', '2025-02-10', NOW(), NOW()),

-- Pedicure Equipment
('Pedicure Station 1', 'Pedicure Station', 'Deluxe pedicure chair with massage and heating', 'Pedicure Area', 2800.00, 'active', 'PS001', '2023-03-05', 3200.00, 'Nail Services', 'Comfort Spa', 'Luxury Pedicure Chair', '2025-03-05', NOW(), NOW()),
('Pedicure Station 2', 'Pedicure Station', 'Deluxe pedicure chair with massage and heating', 'Pedicure Area', 2800.00, 'active', 'PS002', '2023-03-05', 3200.00, 'Nail Services', 'Comfort Spa', 'Luxury Pedicure Chair', '2025-03-05', NOW(), NOW()),

-- Facial Equipment
('Facial Bed 1', 'Facial Equipment', 'Professional facial treatment bed with adjustable headrest', 'Facial Room', 2500.00, 'active', 'FB001', '2023-04-12', 2800.00, 'Facial Services', 'Spa Equipment Ltd', 'Comfort Plus Facial Bed', '2025-04-12', NOW(), NOW()),
('Facial Bed 2', 'Facial Equipment', 'Professional facial treatment bed with adjustable headrest', 'Facial Room', 2500.00, 'active', 'FB002', '2023-04-12', 2800.00, 'Facial Services', 'Spa Equipment Ltd', 'Comfort Plus Facial Bed', '2025-04-12', NOW(), NOW()),

-- Waxing Equipment
('Waxing Station 1', 'Waxing Equipment', 'Professional waxing table with heating elements', 'Waxing Room', 1300.00, 'active', 'WS001', '2023-05-20', 1500.00, 'Waxing Services', 'WaxPro Systems', 'Professional Wax Table', '2025-05-20', NOW(), NOW()),
('Waxing Station 2', 'Waxing Equipment', 'Professional waxing table with heating elements', 'Waxing Room', 1300.00, 'active', 'WS002', '2023-05-20', 1500.00, 'Waxing Services', 'WaxPro Systems', 'Professional Wax Table', '2025-05-20', NOW(), NOW()),

-- Massage Equipment
('Massage Table 1', 'Massage Equipment', 'Professional massage table with adjustable height', 'Massage Room', 1900.00, 'active', 'MT001', '2023-06-08', 2200.00, 'Massage Services', 'Therapeutic Equipment', 'Deluxe Massage Table', '2025-06-08', NOW(), NOW()),
('Massage Table 2', 'Massage Equipment', 'Professional massage table with adjustable height', 'Massage Room', 1900.00, 'active', 'MT002', '2023-06-08', 2200.00, 'Massage Services', 'Therapeutic Equipment', 'Deluxe Massage Table', '2025-06-08', NOW(), NOW()),

-- Reception Equipment
('Reception Desk', 'Reception Equipment', 'Professional reception desk with storage and counter', 'Reception Area', 3100.00, 'active', 'RD001', '2023-01-01', 3500.00, 'Reception', 'Office Furniture Co', 'Salon Reception Desk', '2025-01-01', NOW(), NOW()),
('Computer System', 'Technology', 'Reception computer with POS software', 'Reception Area', 800.00, 'active', 'CS001', '2023-01-01', 1200.00, 'Reception', 'Tech Solutions', 'POS Terminal', '2025-01-01', NOW(), NOW()),
('Cash Register', 'Technology', 'Professional cash register with receipt printer', 'Reception Area', 600.00, 'active', 'CR001', '2023-01-01', 800.00, 'Reception', 'POS Systems Inc', 'Professional Register', '2025-01-01', NOW(), NOW()),

-- Styling Tools
('Professional Hair Dryer 1', 'Styling Tools', 'Professional hair dryer with multiple heat settings', 'Styling Area', 400.00, 'active', 'HD001', '2023-07-15', 450.00, 'Hair Services', 'Styling Pro', 'Professional Dryer', '2025-07-15', NOW(), NOW()),
('Professional Hair Dryer 2', 'Styling Tools', 'Professional hair dryer with multiple heat settings', 'Styling Area', 400.00, 'active', 'HD002', '2023-07-15', 450.00, 'Hair Services', 'Styling Pro', 'Professional Dryer', '2025-07-15', NOW(), NOW()),
('Professional Hair Dryer 3', 'Styling Tools', 'Professional hair dryer with multiple heat settings', 'Styling Area', 400.00, 'active', 'HD003', '2023-07-15', 450.00, 'Hair Services', 'Styling Pro', 'Professional Dryer', '2025-07-15', NOW(), NOW()),

-- UV Lamps
('UV Lamp 1', 'Nail Equipment', 'Professional UV lamp for gel nail curing', 'Nail Area', 100.00, 'active', 'UV001', '2023-08-10', 120.00, 'Nail Services', 'UV Systems', 'Professional UV Lamp', '2025-08-10', NOW(), NOW()),
('UV Lamp 2', 'Nail Equipment', 'Professional UV lamp for gel nail curing', 'Nail Area', 100.00, 'active', 'UV002', '2023-08-10', 120.00, 'Nail Services', 'UV Systems', 'Professional UV Lamp', '2025-08-10', NOW(), NOW()),
('UV Lamp 3', 'Nail Equipment', 'Professional UV lamp for gel nail curing', 'Nail Area', 100.00, 'active', 'UV003', '2023-08-10', 120.00, 'Nail Services', 'UV Systems', 'Professional UV Lamp', '2025-08-10', NOW(), NOW()),

-- Sterilization Equipment
('Autoclave Sterilizer', 'Sterilization Equipment', 'Professional autoclave for tool sterilization', 'Back Room', 1600.00, 'active', 'AS001', '2023-09-05', 1800.00, 'All Services', 'Sterilization Pro', 'Professional Autoclave', '2025-09-05', NOW(), NOW()),
('UV Sterilizer Cabinet', 'Sterilization Equipment', 'UV cabinet for tool sterilization', 'Back Room', 500.00, 'active', 'USC001', '2023-09-05', 600.00, 'All Services', 'UV Systems', 'Professional UV Cabinet', '2025-09-05', NOW(), NOW()),

-- Waiting Area Furniture
('Waiting Room Sofa', 'Furniture', 'Comfortable waiting room sofa', 'Waiting Area', 1000.00, 'active', 'WRS001', '2023-10-12', 1200.00, 'Reception', 'Comfort Furniture', 'Salon Sofa', '2025-10-12', NOW(), NOW()),
('Coffee Table', 'Furniture', 'Stylish coffee table for waiting area', 'Waiting Area', 350.00, 'active', 'CT001', '2023-10-12', 400.00, 'Reception', 'Comfort Furniture', 'Salon Coffee Table', '2025-10-12', NOW(), NOW()),

-- Storage Equipment
('Product Storage Cabinet', 'Storage Equipment', 'Large cabinet for product storage', 'Storage Room', 700.00, 'active', 'PSC001', '2023-11-20', 800.00, 'All Services', 'Storage Solutions', 'Professional Cabinet', '2025-11-20', NOW(), NOW()),
('Tool Storage Cart', 'Storage Equipment', 'Mobile cart for tool storage and organization', 'Back Room', 300.00, 'active', 'TSC001', '2023-11-20', 350.00, 'All Services', 'Storage Solutions', 'Mobile Tool Cart', '2025-11-20', NOW(), NOW()),

-- Maintenance Equipment
('Vacuum Cleaner', 'Maintenance Equipment', 'Professional vacuum cleaner for salon cleaning', 'Storage Room', 250.00, 'active', 'VC001', '2023-12-01', 300.00, 'Maintenance', 'Cleaning Pro', 'Professional Vacuum', '2025-12-01', NOW(), NOW()),
('Steam Cleaner', 'Maintenance Equipment', 'Professional steam cleaner for deep cleaning', 'Storage Room', 450.00, 'active', 'SC001', '2023-12-01', 500.00, 'Maintenance', 'Cleaning Pro', 'Professional Steam Cleaner', '2025-12-01', NOW(), NOW());

-- Update existing assets to salon-related if you want to keep some existing ones
-- UPDATE assets SET 
--     name = CASE 
--         WHEN asset_type = 'equipment' THEN 'Salon Equipment ' || id
--         WHEN asset_type = 'furniture' THEN 'Salon Furniture ' || id
--         ELSE name
--     END,
--     asset_type = CASE 
--         WHEN asset_type = 'equipment' THEN 'Salon Equipment'
--         WHEN asset_type = 'furniture' THEN 'Salon Furniture'
--         ELSE asset_type
--     END,
--     department = 'Salon Services'
-- WHERE asset_type IN ('equipment', 'furniture'); 