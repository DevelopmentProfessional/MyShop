-- Database Structure Extraction Script
-- Run this with: psql -d shopy_db -f sql/get_db_structure.sql > sql/db_structure.txt

-- Get all tables and their columns
SELECT 
    'TABLE' as object_type,
    table_schema,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Get primary keys
SELECT 
    'PRIMARY_KEY' as object_type,
    tc.table_schema, 
    tc.table_name, 
    kc.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kc
  ON kc.table_name = tc.table_name
  AND kc.table_schema = tc.table_schema
  AND kc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Get foreign keys
SELECT
    'FOREIGN_KEY' as object_type,
    tc.table_schema, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Get sequences
SELECT 
    'SEQUENCE' as object_type,
    sequence_schema,
    sequence_name
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- Get indexes
SELECT 
    'INDEX' as object_type,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname; 