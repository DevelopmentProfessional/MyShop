-- List all tables in the database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Or use this simpler command in psql:
-- \dt 