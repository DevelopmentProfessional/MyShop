-- SQL script to remove assigned_employee_id column from contracts table
-- This removes the column since participants are now handled separately

-- Remove the assigned_employee_id column from the contracts table
ALTER TABLE contracts DROP COLUMN IF EXISTS assigned_employee_id;

-- Verify the column has been removed
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contracts' 
ORDER BY ordinal_position; 