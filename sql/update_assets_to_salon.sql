-- Update Assets to Salon Equipment
-- This script converts existing office assets to salon-related equipment

-- 1. Convert Dell Latitude to Hair Station 1
UPDATE assets SET 
    name = 'Hair Station 1',
    asset_type = 'Hair Station',
    description = 'Professional hair styling station with mirror, chair, and storage',
    location = 'Main Salon Area',
    current_value = 2200.00,
    department = 'Hair Services',
    manufacturer = 'Salon Equipment Co',
    model = 'ProStyle 2000',
    warranty_expiry = '2025-01-15',
    updated_at = NOW()
WHERE id = 1;

-- 2. Convert HP Printer to Hair Station 2
UPDATE assets SET 
    name = 'Hair Station 2',
    asset_type = 'Hair Station',
    description = 'Professional hair styling station with mirror, chair, and storage',
    location = 'Main Salon Area',
    current_value = 2200.00,
    department = 'Hair Services',
    manufacturer = 'Salon Equipment Co',
    model = 'ProStyle 2000',
    warranty_expiry = '2025-01-15',
    updated_at = NOW()
WHERE id = 2;

-- 3. Convert iPhone to Nail Station 1
UPDATE assets SET 
    name = 'Nail Station 1',
    asset_type = 'Nail Station',
    description = 'Professional nail station with UV lamp and storage',
    location = 'Nail Area',
    current_value = 1600.00,
    department = 'Nail Services',
    manufacturer = 'NailTech Pro',
    model = 'Deluxe Nail Station',
    warranty_expiry = '2025-02-10',
    updated_at = NOW()
WHERE id = 3;

-- 4. Convert Office Desk to Nail Station 2
UPDATE assets SET 
    name = 'Nail Station 2',
    asset_type = 'Nail Station',
    description = 'Professional nail station with UV lamp and storage',
    location = 'Nail Area',
    current_value = 1600.00,
    department = 'Nail Services',
    manufacturer = 'NailTech Pro',
    model = 'Deluxe Nail Station',
    warranty_expiry = '2025-02-10',
    updated_at = NOW()
WHERE id = 4;

-- 5. Convert Canon Camera to Nail Station 3
UPDATE assets SET 
    name = 'Nail Station 3',
    asset_type = 'Nail Station',
    description = 'Professional nail station with UV lamp and storage',
    location = 'Nail Area',
    current_value = 1600.00,
    department = 'Nail Services',
    manufacturer = 'NailTech Pro',
    model = 'Deluxe Nail Station',
    warranty_expiry = '2025-02-10',
    updated_at = NOW()
WHERE id = 5;

-- 6. Convert Cisco Switch to Pedicure Station 1
UPDATE assets SET 
    name = 'Pedicure Station 1',
    asset_type = 'Pedicure Station',
    description = 'Deluxe pedicure chair with massage and heating',
    location = 'Pedicure Area',
    current_value = 2800.00,
    department = 'Nail Services',
    manufacturer = 'Comfort Spa',
    model = 'Luxury Pedicure Chair',
    warranty_expiry = '2025-03-05',
    updated_at = NOW()
WHERE id = 6;

-- 7. Convert Samsung TV to Pedicure Station 2
UPDATE assets SET 
    name = 'Pedicure Station 2',
    asset_type = 'Pedicure Station',
    description = 'Deluxe pedicure chair with massage and heating',
    location = 'Pedicure Area',
    current_value = 2800.00,
    department = 'Nail Services',
    manufacturer = 'Comfort Spa',
    model = 'Luxury Pedicure Chair',
    warranty_expiry = '2025-03-05',
    updated_at = NOW()
WHERE id = 7;

-- 8. Convert iPad to Reception Desk
UPDATE assets SET 
    name = 'Reception Desk',
    asset_type = 'Reception Equipment',
    description = 'Professional reception desk with storage and counter',
    location = 'Reception Area',
    current_value = 3100.00,
    department = 'Reception',
    manufacturer = 'Office Furniture Co',
    model = 'Salon Reception Desk',
    warranty_expiry = '2025-01-01',
    updated_at = NOW()
WHERE id = 8;

-- 9. Convert Coffee Machine to Facial Bed 1
UPDATE assets SET 
    name = 'Facial Bed 1',
    asset_type = 'Facial Equipment',
    description = 'Professional facial treatment bed with adjustable headrest',
    location = 'Facial Room',
    current_value = 2500.00,
    department = 'Facial Services',
    manufacturer = 'Spa Equipment Ltd',
    model = 'Comfort Plus Facial Bed',
    warranty_expiry = '2025-04-12',
    updated_at = NOW()
WHERE id = 9;

-- 10. Convert Security Camera to Facial Bed 2
UPDATE assets SET 
    name = 'Facial Bed 2',
    asset_type = 'Facial Equipment',
    description = 'Professional facial treatment bed with adjustable headrest',
    location = 'Facial Room',
    current_value = 2500.00,
    department = 'Facial Services',
    manufacturer = 'Spa Equipment Ltd',
    model = 'Comfort Plus Facial Bed',
    warranty_expiry = '2025-04-12',
    updated_at = NOW()
WHERE id = 10;

-- 11. Convert Projector to Waxing Station 1
UPDATE assets SET 
    name = 'Waxing Station 1',
    asset_type = 'Waxing Equipment',
    description = 'Professional waxing table with heating elements',
    location = 'Waxing Room',
    current_value = 1300.00,
    department = 'Waxing Services',
    manufacturer = 'WaxPro Systems',
    model = 'Professional Wax Table',
    warranty_expiry = '2025-05-20',
    updated_at = NOW()
WHERE id = 11;

-- 12. Convert Standing Desk to Waxing Station 2
UPDATE assets SET 
    name = 'Waxing Station 2',
    asset_type = 'Waxing Equipment',
    description = 'Professional waxing table with heating elements',
    location = 'Waxing Room',
    current_value = 1300.00,
    department = 'Waxing Services',
    manufacturer = 'WaxPro Systems',
    model = 'Professional Wax Table',
    warranty_expiry = '2025-05-20',
    updated_at = NOW()
WHERE id = 12;

-- 13. Convert Wireless Headset to Massage Table 1
UPDATE assets SET 
    name = 'Massage Table 1',
    asset_type = 'Massage Equipment',
    description = 'Professional massage table with adjustable height',
    location = 'Massage Room',
    current_value = 1900.00,
    department = 'Massage Services',
    manufacturer = 'Therapeutic Equipment',
    model = 'Deluxe Massage Table',
    warranty_expiry = '2025-06-08',
    updated_at = NOW()
WHERE id = 13;

-- 14. Convert File Cabinet to Massage Table 2
UPDATE assets SET 
    name = 'Massage Table 2',
    asset_type = 'Massage Equipment',
    description = 'Professional massage table with adjustable height',
    location = 'Massage Room',
    current_value = 1900.00,
    department = 'Massage Services',
    manufacturer = 'Therapeutic Equipment',
    model = 'Deluxe Massage Table',
    warranty_expiry = '2025-06-08',
    updated_at = NOW()
WHERE id = 14;

-- 15. Convert UPS to Computer System
UPDATE assets SET 
    name = 'Computer System',
    asset_type = 'Technology',
    description = 'Reception computer with POS software',
    location = 'Reception Area',
    current_value = 800.00,
    department = 'Reception',
    manufacturer = 'Tech Solutions',
    model = 'POS Terminal',
    warranty_expiry = '2025-01-01',
    updated_at = NOW()
WHERE id = 15;

-- Additional salon assets to insert (if you want more equipment)
INSERT INTO assets (name, asset_type, description, location, current_value, status, serial_number, purchase_date, purchase_price, department, manufacturer, model, warranty_expiry, created_at, updated_at) VALUES
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
('Steam Cleaner', 'Maintenance Equipment', 'Professional steam cleaner for deep cleaning', 'Storage Room', 450.00, 'active', 'SC001', '2023-12-01', 500.00, 'Maintenance', 'Cleaning Pro', 'Professional Steam Cleaner', '2025-12-01', NOW(), NOW()),

-- Additional Salon Equipment
('Cash Register', 'Technology', 'Professional cash register with receipt printer', 'Reception Area', 600.00, 'active', 'CR001', '2023-01-01', 800.00, 'Reception', 'POS Systems Inc', 'Professional Register', '2025-01-01', NOW(), NOW()),
('Hair Steamer', 'Hair Equipment', 'Professional hair steamer for treatments', 'Styling Area', 350.00, 'active', 'HS001', '2023-07-20', 400.00, 'Hair Services', 'Salon Pro', 'Professional Steamer', '2025-07-20', NOW(), NOW()),
('Nail Polish Rack', 'Nail Equipment', 'Display rack for nail polish collection', 'Nail Area', 200.00, 'active', 'NPR001', '2023-08-15', 250.00, 'Nail Services', 'Display Solutions', 'Polish Rack', '2025-08-15', NOW(), NOW()),
('Spa Towel Warmer', 'Spa Equipment', 'Professional towel warmer for spa treatments', 'Spa Area', 450.00, 'active', 'STW001', '2023-09-10', 500.00, 'Spa Services', 'Spa Equipment Co', 'Towel Warmer', '2025-09-10', NOW(), NOW()),
('Hair Color Mixing Station', 'Hair Equipment', 'Professional station for hair color mixing', 'Styling Area', 800.00, 'active', 'HCMS001', '2023-07-25', 900.00, 'Hair Services', 'Color Pro', 'Mixing Station', '2025-07-25', NOW(), NOW()); 