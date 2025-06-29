-- SQL Query to verify API endpoint column name fixes
-- This will help confirm that all APIs are using the correct primary key column names

-- Check primary key column names for all tables
SELECT 
    t.table_name,
    c.column_name as primary_key_column,
    c.data_type as pk_data_type,
    'Primary Key' as key_type
FROM information_schema.tables t
JOIN information_schema.table_constraints tc ON t.table_name = tc.table_name
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.columns c ON kcu.table_name = c.table_name AND kcu.column_name = c.column_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;

-- Check foreign key relationships for shift scheduling tables
SELECT 
    tc.table_name,
    kcu.column_name as foreign_key_column,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND (tc.table_name LIKE '%shift%' OR tc.table_name LIKE '%payroll%' OR tc.table_name LIKE '%task%' OR tc.table_name LIKE '%project%')
ORDER BY tc.table_name, kcu.column_name;

-- Verify specific table structures that were problematic
SELECT 
    'payroll' as table_name,
    'payroll_id' as expected_pk,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payroll' AND column_name = 'payroll_id' AND column_default LIKE '%nextval%'
    ) THEN 'CORRECT' ELSE 'INCORRECT' END as status
UNION ALL
SELECT 
    'projects' as table_name,
    'project_id' as expected_pk,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'project_id' AND column_default LIKE '%nextval%'
    ) THEN 'CORRECT' ELSE 'INCORRECT' END as status
UNION ALL
SELECT 
    'tasks' as table_name,
    'task_id' as expected_pk,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'task_id' AND column_default LIKE '%nextval%'
    ) THEN 'CORRECT' ELSE 'INCORRECT' END as status
UNION ALL
SELECT 
    'task_comments' as table_name,
    'comment_id' as expected_pk,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_comments' AND column_name = 'comment_id' AND column_default LIKE '%nextval%'
    ) THEN 'CORRECT' ELSE 'INCORRECT' END as status
UNION ALL
SELECT 
    'employees' as table_name,
    'id' as expected_pk,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'id' AND column_default LIKE '%nextval%'
    ) THEN 'CORRECT' ELSE 'INCORRECT' END as status

-- Check for any remaining issues with employee_id vs id references
SELECT 
    'Foreign Key Check' as check_type,
    tc.table_name,
    kcu.column_name as fk_column,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    CASE 
        WHEN ccu.column_name = 'id' AND kcu.column_name = 'employee_id' THEN 'CORRECT'
        WHEN ccu.column_name != 'id' AND kcu.column_name = 'employee_id' THEN 'INCORRECT - should reference employees(id)'
        ELSE 'CHECK MANUALLY'
    END as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND kcu.column_name = 'employee_id'
ORDER BY tc.table_name; 