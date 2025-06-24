-- generate_all_sql.sql
-- This script generates all SQL files for the sql directory
-- Run this in PostgreSQL to extract the complete database schema

-- Function to generate table creation SQL
CREATE OR REPLACE FUNCTION generate_table_sql(table_name text) 
RETURNS text AS $$
DECLARE
    sql_text text := '';
    column_record record;
    constraint_record record;
    index_record record;
    trigger_record record;
    table_comment text;
    column_comment text;
BEGIN
    -- Get table comment
    SELECT obj_description(c.oid) INTO table_comment 
    FROM pg_class c 
    WHERE c.relname = table_name AND c.relkind = 'r';
    
    -- Start table creation
    sql_text := '-- ' || COALESCE(table_comment, table_name) || '.sql' || E'\n';
    sql_text := sql_text || '-- Table definitions for ' || COALESCE(table_comment, table_name) || E'\n\n';
    sql_text := sql_text || 'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' || E'\n';
    
    -- Add columns
    FOR column_record IN 
        SELECT 
            c.column_name,
            c.data_type,
            c.character_maximum_length,
            c.is_nullable,
            c.column_default,
            c.ordinal_position,
            col_description(c.table_name::regclass, c.ordinal_position) as column_comment
        FROM information_schema.columns c
        WHERE c.table_name = table_name
        ORDER BY c.ordinal_position
    LOOP
        IF column_record.ordinal_position > 1 THEN
            sql_text := sql_text || ',' || E'\n';
        END IF;
        
        sql_text := sql_text || '    ' || column_record.column_name || ' ' || column_record.data_type;
        
        -- Add length for varchar/char
        IF column_record.character_maximum_length IS NOT NULL THEN
            sql_text := sql_text || '(' || column_record.character_maximum_length || ')';
        END IF;
        
        -- Add NOT NULL
        IF column_record.is_nullable = 'NO' THEN
            sql_text := sql_text || ' NOT NULL';
        END IF;
        
        -- Add default
        IF column_record.column_default IS NOT NULL THEN
            sql_text := sql_text || ' DEFAULT ' || column_record.column_default;
        END IF;
        
        -- Add comment
        IF column_record.column_comment IS NOT NULL THEN
            sql_text := sql_text || ' -- ' || column_record.column_comment;
        END IF;
    END LOOP;
    
    -- Add constraints
    FOR constraint_record IN 
        SELECT 
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = table_name 
        AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
        ORDER BY tc.constraint_type, tc.constraint_name
    LOOP
        sql_text := sql_text || ',' || E'\n';
        
        IF constraint_record.constraint_type = 'PRIMARY KEY' THEN
            sql_text := sql_text || '    PRIMARY KEY (' || constraint_record.column_name || ')';
        ELSIF constraint_record.constraint_type = 'FOREIGN KEY' THEN
            sql_text := sql_text || '    FOREIGN KEY (' || constraint_record.column_name || ') REFERENCES ' || 
                       constraint_record.foreign_table_name || '(' || constraint_record.foreign_column_name || ')';
        ELSIF constraint_record.constraint_type = 'UNIQUE' THEN
            sql_text := sql_text || '    UNIQUE (' || constraint_record.column_name || ')';
        END IF;
    END LOOP;
    
    sql_text := sql_text || E'\n);' || E'\n\n';
    
    -- Add indexes
    FOR index_record IN 
        SELECT 
            i.relname as index_name,
            array_to_string(array_agg(a.attname), ', ') as column_names
        FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
        WHERE t.oid = ix.indrelid 
        AND i.oid = ix.indexrelid 
        AND a.attrelid = t.oid 
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND t.relname = table_name
        AND i.relname NOT LIKE '%_pkey'
        GROUP BY i.relname
        ORDER BY i.relname
    LOOP
        sql_text := sql_text || 'CREATE INDEX IF NOT EXISTS ' || index_record.index_name || 
                   ' ON ' || table_name || '(' || index_record.column_names || ');' || E'\n';
    END LOOP;
    
    -- Add triggers
    FOR trigger_record IN 
        SELECT 
            tgname as trigger_name,
            tgrelid::regclass as table_name,
            proname as function_name
        FROM pg_trigger t
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE tgrelid = table_name::regclass
        AND NOT tgisinternal
    LOOP
        sql_text := sql_text || E'\n-- Trigger: ' || trigger_record.trigger_name || E'\n';
        sql_text := sql_text || '-- Function: ' || trigger_record.function_name || E'\n';
    END LOOP;
    
    -- Add sample data if table is empty
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
        sql_text := sql_text || E'\n-- Sample data for ' || table_name || E'\n';
        sql_text := sql_text || '-- INSERT INTO ' || table_name || ' (...) VALUES (...);' || E'\n';
    END IF;
    
    RETURN sql_text;
END;
$$ LANGUAGE plpgsql;

-- Function to generate all SQL files
CREATE OR REPLACE FUNCTION generate_all_sql_files() 
RETURNS void AS $$
DECLARE
    table_record record;
    sql_content text;
    file_name text;
BEGIN
    -- Create a temporary table to store the generated SQL
    CREATE TEMP TABLE IF NOT EXISTS generated_sql (
        file_name text,
        content text
    );
    
    -- Generate SQL for each table
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE 'information_schema%'
        ORDER BY table_name
    LOOP
        sql_content := generate_table_sql(table_record.table_name);
        file_name := table_record.table_name || '.sql';
        
        INSERT INTO generated_sql (file_name, content) VALUES (file_name, sql_content);
        
        RAISE NOTICE 'Generated SQL for table: %', table_record.table_name;
    END LOOP;
    
    -- Display all generated SQL
    RAISE NOTICE E'\n=== GENERATED SQL FILES ===\n';
    
    FOR table_record IN 
        SELECT file_name, content 
        FROM generated_sql 
        ORDER BY file_name
    LOOP
        RAISE NOTICE E'\n--- % ---\n%\n', table_record.file_name, table_record.content;
    END LOOP;
    
    RAISE NOTICE E'\n=== END GENERATED SQL FILES ===\n';
    
    -- Clean up
    DROP TABLE generated_sql;
END;
$$ LANGUAGE plpgsql;

-- Function to generate specific table SQL
CREATE OR REPLACE FUNCTION generate_specific_table_sql(table_names text[]) 
RETURNS void AS $$
DECLARE
    table_name text;
    sql_content text;
BEGIN
    FOREACH table_name IN ARRAY table_names
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            sql_content := generate_table_sql(table_name);
            RAISE NOTICE E'\n--- % ---\n%\n', table_name || '.sql', sql_content;
        ELSE
            RAISE NOTICE 'Table % does not exist', table_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the generation
SELECT generate_all_sql_files();

-- Alternative: Generate specific tables only
-- SELECT generate_specific_table_sql(ARRAY['contracts', 'contract_history', 'signatures', 'contract_signatures', 'employees', 'departments']);

-- Clean up functions
-- DROP FUNCTION IF EXISTS generate_table_sql(text);
-- DROP FUNCTION IF EXISTS generate_all_sql_files();
-- DROP FUNCTION IF EXISTS generate_specific_table_sql(text[]); 