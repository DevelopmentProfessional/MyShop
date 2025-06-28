-- Check rotation_employee_assignments table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'rotation_employee_assignments'
ORDER BY ordinal_position;

-- Check all current rotation employee assignments
SELECT 
    rea.id,
    rea.rotation_id,
    r.name as rotation_name,
    rea.position,
    rea.employee_id,
    e.name as employee_name,
    e.email as employee_email,
    rea.created_at
FROM rotation_employee_assignments rea
JOIN shift_rotations r ON rea.rotation_id = r.id
JOIN employees e ON rea.employee_id = e.id
ORDER BY rea.rotation_id, rea.position, e.name;

-- Check rotation employee assignments by specific rotation
-- Replace 1 with the rotation ID you want to check
SELECT 
    rea.id,
    rea.rotation_id,
    r.name as rotation_name,
    rea.position,
    rea.employee_id,
    e.name as employee_name,
    e.email as employee_email,
    rea.created_at
FROM rotation_employee_assignments rea
JOIN shift_rotations r ON rea.rotation_id = r.id
JOIN employees e ON rea.employee_id = e.id
WHERE rea.rotation_id = 1
ORDER BY rea.position, e.name;

-- Check how many employees are assigned to each rotation
SELECT 
    r.id as rotation_id,
    r.name as rotation_name,
    COUNT(rea.employee_id) as total_employees,
    COUNT(DISTINCT rea.position) as total_positions
FROM shift_rotations r
LEFT JOIN rotation_employee_assignments rea ON r.id = rea.rotation_id
GROUP BY r.id, r.name
ORDER BY r.name;

-- Check employees assigned to each position in a rotation
-- Replace 1 with the rotation ID you want to check
SELECT 
    rea.position,
    e.name as employee_name,
    e.email as employee_email,
    rea.created_at
FROM rotation_employee_assignments rea
JOIN employees e ON rea.employee_id = e.id
WHERE rea.rotation_id = 1
ORDER BY rea.position, e.name;

-- Check for any duplicate assignments (should be none due to UNIQUE constraint)
SELECT 
    rotation_id,
    position,
    employee_id,
    COUNT(*) as count
FROM rotation_employee_assignments
GROUP BY rotation_id, position, employee_id
HAVING COUNT(*) > 1;

-- Check total count of assignments
SELECT COUNT(*) as total_rotation_employee_assignments FROM rotation_employee_assignments; 